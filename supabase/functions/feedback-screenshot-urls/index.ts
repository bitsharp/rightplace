import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleFeedbackScreenshotUrls,
  type SignedPath,
  type VisibleFeedbackScreenshot,
} from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function visibleScreenshotPaths(
  authorization: string,
  feedbackIds: string[],
): Promise<VisibleFeedbackScreenshot[]> {
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await asUser.rpc('get_feedback_screenshot_paths', {
    p_ids: feedbackIds,
  });
  if (error) throw new Error('SCREENSHOT_PATHS_FAILED');
  return (data ?? []).map((row: { feedback_id: string; screenshot_path: string }) => ({
    feedbackId: row.feedback_id,
    screenshotPath: row.screenshot_path,
  }));
}

async function signPaths(paths: string[], ttlSeconds: number): Promise<SignedPath[]> {
  const { data, error } = await admin.storage.from('feedback').createSignedUrls(paths, ttlSeconds);
  if (error) throw new Error('SIGN_FAILED');
  return (data ?? []).flatMap((item) =>
    item.path !== null && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : [],
  );
}

Deno.serve((request) =>
  handleFeedbackScreenshotUrls(request, { visibleScreenshotPaths, signPaths }),
);
