export const MAX_COMMENT_LENGTH = 1000;
export const STAR_COUNT = 5;

export type FeedbackForm = { rating: number; comment: string };

export function remainingCharacters(comment: string): number {
  return MAX_COMMENT_LENGTH - comment.length;
}

// Same rules as submit_feedback: the server is the authority, this only keeps the button honest.
export function canSubmitFeedback({ rating, comment }: FeedbackForm): boolean {
  return (
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= STAR_COUNT &&
    comment.trim().length <= MAX_COMMENT_LENGTH
  );
}
