import { callRpc } from '@/lib/callRpc';
import { uploadPhoto } from '@/lib/photos/photos';

export type FeedbackPlatform = 'ios' | 'android';
export type FeedbackLocale = 'it' | 'en';

export type SendFeedbackInput = {
  userId: string;
  rating: number;
  comment: string;
  // Normalized path (ids replaced by [id]), never the raw pathname.
  screen: string;
  // Output of captureScreenshot (JPEG, <= 1080 px), or null when the user removed it.
  screenshotUri: string | null;
  appVersion: string | null;
  platform: FeedbackPlatform;
  locale: FeedbackLocale;
};

// Upload first, then the RPC that validates the path. If the RPC fails the file stays orphaned in a
// private bucket only support can read (same known limit as posts; the 180-day purge does not see it).
export async function sendFeedback(input: SendFeedbackInput): Promise<void> {
  const screenshotPath = input.screenshotUri
    ? await uploadPhoto('feedback', input.userId, input.screenshotUri)
    : null;
  await callRpc<string>('submit_feedback', {
    p_rating: input.rating,
    p_comment: input.comment,
    p_screen: input.screen,
    p_screenshot_path: screenshotPath,
    p_app_version: input.appVersion,
    p_platform: input.platform,
    p_locale: input.locale,
  });
}
