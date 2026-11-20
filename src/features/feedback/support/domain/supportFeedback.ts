export const SUPPORT_PAGE_SIZE = 30;

export type SupportFeedback = {
  id: string;
  rating: number;
  // The whole text, as written by the user.
  comment: string;
  // Normalized path, ids replaced by [id].
  screen: string;
  hasScreenshot: boolean;
  appVersion: string | null;
  platform: 'ios' | 'android';
  locale: 'it' | 'en' | null;
  createdAt: string;
  authorHandle: string;
};

// A feedback of the inbox with the signed URL of its screenshot (1 h), when it has one and it could be signed.
export type SupportInboxItem = SupportFeedback & { screenshotUrl: string | null };

export const ratingStars = (rating: number): string => '★'.repeat(rating) + '☆'.repeat(5 - rating);

// Keyset pagination on created_at: a full page means there may be older feedback.
export function nextSupportCursor(lastPage: readonly { createdAt: string }[]): string | undefined {
  return lastPage.length < SUPPORT_PAGE_SIZE ? undefined : lastPage.at(-1)?.createdAt;
}
