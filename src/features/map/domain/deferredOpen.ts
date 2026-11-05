export type DeferredOpen = {
  request: (venueId: string) => void;
  onDismiss: () => void;
};

// On iOS, navigating while a Modal is still closing is unreliable (the route may open under it
// or not at all): wait for the Modal's onDismiss. Android has no onDismiss: open right away.
export function createDeferredOpen(os: string, open: (venueId: string) => void): DeferredOpen {
  let pending: string | null = null;
  return {
    request(venueId) {
      if (os !== 'ios') return open(venueId);
      pending = venueId;
    },
    onDismiss() {
      if (pending === null) return;
      const venueId = pending;
      pending = null;
      open(venueId);
    },
  };
}
