import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

import {
  SUPPORT_PAGE_SIZE,
  type SupportFeedback,
  type SupportInboxItem,
} from './domain/supportFeedback';

const rowSchema = z.array(
  z.object({
    id: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string(),
    screen: z.string(),
    has_screenshot: z.boolean(),
    app_version: z.string().nullable(),
    platform: z.enum(['ios', 'android']),
    locale: z.enum(['it', 'en']).nullable(),
    created_at: z.string(),
    author_handle: z.string(),
  }),
);

const urlsSchema = z.object({
  urls: z.array(z.object({ feedbackId: z.string(), url: z.string() })),
});

// Only support accounts: any other caller gets NOT_SUPPORT from the server.
export async function fetchSupportFeedbackPage(
  before: string | undefined,
): Promise<SupportFeedback[]> {
  const data = await callRpc<unknown>('get_support_feedback', {
    p_before: before ?? null,
    p_limit: SUPPORT_PAGE_SIZE,
  });
  return rowSchema.parse(data).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    screen: row.screen,
    hasScreenshot: row.has_screenshot,
    appVersion: row.app_version,
    platform: row.platform,
    locale: row.locale,
    createdAt: row.created_at,
    authorHandle: row.author_handle,
  }));
}

// Screenshots have no public URL: the Edge Function signs (1 h) what the database lets this support account see.
export async function fetchFeedbackScreenshotUrls(
  feedbackIds: string[],
): Promise<Record<string, string>> {
  if (feedbackIds.length === 0) return {};
  const { data, error } = await supabase.functions.invoke('feedback-screenshot-urls', {
    body: { feedbackIds },
  });
  if (error) throw new RpcError(toRpcErrorCode(error));
  return Object.fromEntries(
    urlsSchema.parse(data).urls.map(({ feedbackId, url }) => [feedbackId, url]),
  );
}

export async function fetchSupportInboxPage(
  before: string | undefined,
): Promise<SupportInboxItem[]> {
  const items = await fetchSupportFeedbackPage(before);
  // Thumbnails are a nicety: if signing fails the text of the feedback must still be readable.
  const urls = await fetchFeedbackScreenshotUrls(
    items.filter((item) => item.hasScreenshot).map((item) => item.id),
  ).catch((): Record<string, string> => ({}));
  return items.map((item) => ({ ...item, screenshotUrl: urls[item.id] ?? null }));
}
