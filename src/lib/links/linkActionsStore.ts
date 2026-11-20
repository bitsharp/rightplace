import { create } from 'zustand';

export type LinkNotice = 'copied' | 'openFailed';

type State = {
  // The link whose actions sheet is open (long press on a link).
  sheetUrl: string | null;
  notice: LinkNotice | null;
  openSheet: (url: string) => void;
  closeSheet: () => void;
  setNotice: (notice: LinkNotice | null) => void;
};

export const useLinkActions = create<State>((set) => ({
  sheetUrl: null,
  notice: null,
  openSheet: (url) => set({ sheetUrl: url }),
  closeSheet: () => set({ sheetUrl: null }),
  setNotice: (notice) => set({ notice }),
}));

export function resetLinkActions(): void {
  useLinkActions.setState({ sheetUrl: null, notice: null });
}
