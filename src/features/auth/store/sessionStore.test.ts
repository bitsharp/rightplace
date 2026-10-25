import { useSessionStore } from './sessionStore';

describe('useSessionStore', () => {
  beforeEach(() => useSessionStore.getState().signOut());

  it('parte senza sessione', () => {
    expect(useSessionStore.getState().isSignedIn).toBe(false);
  });

  it('apre e chiude la sessione finta', () => {
    useSessionStore.getState().signIn();
    expect(useSessionStore.getState().isSignedIn).toBe(true);
    useSessionStore.getState().signOut();
    expect(useSessionStore.getState().isSignedIn).toBe(false);
  });
});
