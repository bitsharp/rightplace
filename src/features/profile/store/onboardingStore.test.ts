import { useOnboardingStore } from './onboardingStore';

describe('useOnboardingStore', () => {
  it('ricorda di mostrare l’handle subito dopo il profilo, una volta sola', () => {
    expect(useOnboardingStore.getState().pendingHandleReveal).toBe(false);
    useOnboardingStore.getState().startHandleReveal();
    expect(useOnboardingStore.getState().pendingHandleReveal).toBe(true);
    useOnboardingStore.getState().finishHandleReveal();
    expect(useOnboardingStore.getState().pendingHandleReveal).toBe(false);
  });
});
