import { create } from 'zustand';

// The screenshot is a temporary file: it exists only while the draft is open, and closing the sheet drops it.
export type FeedbackDraft = { screen: string; screenshotUri: string | null };

type State = {
  draft: FeedbackDraft | null;
  thanked: boolean;
  open: (draft: FeedbackDraft) => void;
  removeScreenshot: () => void;
  close: () => void;
  setThanked: (thanked: boolean) => void;
};

export const useFeedback = create<State>((set) => ({
  draft: null,
  thanked: false,
  open: (draft) => set({ draft }),
  removeScreenshot: () =>
    set((state) => (state.draft ? { draft: { ...state.draft, screenshotUri: null } } : state)),
  close: () => set({ draft: null }),
  setThanked: (thanked) => set({ thanked }),
}));

export function resetFeedback(): void {
  useFeedback.setState({ draft: null, thanked: false });
}
