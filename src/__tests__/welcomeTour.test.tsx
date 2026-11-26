import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useTourStore } from '@/features/tour/store/tourStore';
import { renderApp } from '@/test/appFlows';
import { markTourUnseen } from '@/test/tourState';

const SKIP = { name: 'tour:welcome.skip' };
const NEXT = { name: 'tour:welcome.next' };
const START = { name: 'tour:welcome.start' };
const WHERE_TITLE = 'tour:welcome.pages.where.title';

describe('benvenuto', () => {
  it('la prima volta, dopo l’onboarding, mostra il benvenuto prima dei tab', async () => {
    markTourUnseen();
    await renderApp('ready');
    expect(await screen.findByText(WHERE_TITLE)).toBeOnTheScreen();
    expect(screen).toHavePathname('/welcome');
  });

  it('“Salta” porta alla mappa e il benvenuto non ricompare', async () => {
    markTourUnseen();
    await renderApp('ready');
    await fireEvent.press(await screen.findByRole('button', SKIP));
    await waitFor(() => expect(screen).toHavePathname('/map'));
    expect(useTourStore.getState().welcomeSeen).toBe(true);
    expect(screen.queryByText(WHERE_TITLE)).not.toBeOnTheScreen();
  });

  it('“Inizia” sull’ultima pagina porta alla mappa', async () => {
    markTourUnseen();
    await renderApp('ready');
    await screen.findByText(WHERE_TITLE);
    await fireEvent.press(screen.getByRole('button', NEXT));
    await fireEvent.press(screen.getByRole('button', NEXT));
    await fireEvent.press(screen.getByRole('button', START));
    await waitFor(() => expect(screen).toHavePathname('/map'));
    expect(useTourStore.getState().welcomeSeen).toBe(true);
  });

  it('chi lo ha già visto va direttamente alla mappa', async () => {
    await renderApp('ready');
    await waitFor(() => expect(screen).toHavePathname('/map'));
    expect(screen.queryByText(WHERE_TITLE)).not.toBeOnTheScreen();
  });

  it('non compare finché l’onboarding non è completo', async () => {
    markTourUnseen();
    await renderApp('needsProfile');
    await waitFor(() => expect(screen).toHavePathname('/profile-setup'));
    expect(screen.queryByText(WHERE_TITLE)).not.toBeOnTheScreen();
  });
});
