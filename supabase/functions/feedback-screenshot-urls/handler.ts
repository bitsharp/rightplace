import {
  handleSharedPhotoUrls,
  SIGNED_URL_TTL_SECONDS,
  type SignedPath,
} from '../_shared/photoUrls.ts';

export { SIGNED_URL_TTL_SECONDS };
export type { SignedPath };

export type VisibleFeedbackScreenshot = { feedbackId: string; screenshotPath: string };

export type FeedbackScreenshotUrlsDeps = {
  // Runs get_feedback_screenshot_paths with the caller's own JWT: only support accounts get any path.
  visibleScreenshotPaths: (
    authorization: string,
    feedbackIds: string[],
  ) => Promise<VisibleFeedbackScreenshot[]>;
  // Runs with the service role: Storage has no read policy, signed URLs are the only way out.
  signPaths: (paths: string[], ttlSeconds: number) => Promise<SignedPath[]>;
};

export function handleFeedbackScreenshotUrls(
  request: Request,
  deps: FeedbackScreenshotUrlsDeps,
): Promise<Response> {
  return handleSharedPhotoUrls(
    request,
    { idsKey: 'feedbackIds', itemKey: 'feedbackId' },
    {
      signPaths: deps.signPaths,
      visiblePhotoPaths: async (authorization, ids) =>
        (await deps.visibleScreenshotPaths(authorization, ids)).map(
          ({ feedbackId, screenshotPath }) => ({ id: feedbackId, photoPath: screenshotPath }),
        ),
    },
  );
}
