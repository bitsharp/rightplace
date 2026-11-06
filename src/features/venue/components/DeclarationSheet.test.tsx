import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { DeclarationState } from '../domain/declarationState';
import { DeclarationSheet } from './DeclarationSheet';

const venue = {
  id: 'v1',
  name: 'Arena Club',
  timezone: 'Europe/Rome',
  goingBand: '30–50' as const,
  maybeBand: '20–30' as const,
};

const none: DeclarationState = { kind: 'none' };
const hereGoing: DeclarationState = {
  kind: 'here',
  intent: 'going',
  expiresAt: '2026-11-07T04:00:00Z',
};
const elsewhere: DeclarationState = { kind: 'elsewhere', venueName: 'Sunset Rooftop' };

const rpcNames = () => fakeSupabase.rpc.mock.calls.map(([name]) => name);

async function renderSheet(state: DeclarationState, onClose = jest.fn()) {
  const { Wrapper } = createQueryWrapper();
  setFakeRpc({});
  await render(
    <DeclarationSheet
      visible
      onClose={onClose}
      target={{ kind: 'night', id: 'v1' }}
      venue={venue}
      state={state}
    />,
    { wrapper: Wrapper },
  );
  return onClose;
}

describe('DeclarationSheet', () => {
  describe('senza dichiarazione', () => {
    it('mostra locale, fasce SI/FORSE e i due bottoni', async () => {
      await renderSheet(none);
      expect(screen.getByText('Arena Club')).toBeOnTheScreen();
      expect(screen.getByText('venue:declare.heading')).toBeOnTheScreen();
      expect(screen.getByText('30–50')).toBeOnTheScreen();
      expect(screen.getByText('20–30')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'venue:declare.going' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'venue:declare.maybe' })).toBeOnTheScreen();
      expect(screen.getByText('venue:declare.expiresGeneric')).toBeOnTheScreen();
    });

    it('per una serata di un creator titola con il nome della serata e dichiara su event_id', async () => {
      const { Wrapper } = createQueryWrapper();
      setFakeRpc({});
      await render(
        <DeclarationSheet
          visible
          onClose={jest.fn()}
          target={{ kind: 'event', id: 'e1' }}
          venue={{ ...venue, title: 'Notte Techno' }}
          state={none}
        />,
        { wrapper: Wrapper },
      );
      expect(screen.getByText('Notte Techno')).toBeOnTheScreen();
      expect(screen.queryByText('Arena Club')).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.going' }));
      await waitFor(() =>
        expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
          p_intent: 'going',
          p_event_id: 'e1',
        }),
      );
    });

    it('"Ci vado" dichiara la serata del locale e chiude lo sheet', async () => {
      const onClose = await renderSheet(none);
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.going' }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
        p_intent: 'going',
        p_venue_id: 'v1',
      });
    });

    it('"Forse" dichiara con l’intenzione Forse', async () => {
      await renderSheet(none);
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.maybe' }));
      await waitFor(() =>
        expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
          p_intent: 'maybe',
          p_venue_id: 'v1',
        }),
      );
    });

    it('non offre Modifica, Annulla né "Rimuovi la mia icona"', async () => {
      await renderSheet(none);
      expect(screen.queryByText('venue:declare.edit')).toBeNull();
      expect(screen.queryByText('venue:declare.cancel')).toBeNull();
      expect(screen.queryByText('venue:declare.remove')).toBeNull();
    });
  });

  describe('con una dichiarazione in un altro locale', () => {
    it('i bottoni dicono che sostituiscono la dichiarazione precedente', async () => {
      await renderSheet(elsewhere);
      expect(
        screen.getByText('venue:declare.replaces({"venue":"Sunset Rooftop"})'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'venue:declare.goingHere' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'venue:declare.maybeHere' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'venue:declare.going' })).toBeNull();
    });

    it('sceglierne uno dichiara qui e chiude', async () => {
      const onClose = await renderSheet(elsewhere);
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.maybeHere' }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
        p_intent: 'maybe',
        p_venue_id: 'v1',
      });
    });

    it('non offre "Rimuovi la mia icona" per un altro locale', async () => {
      await renderSheet(elsewhere);
      expect(screen.queryByText('venue:declare.remove')).toBeNull();
    });
  });

  describe('già dichiarato qui', () => {
    it('mostra la serata dichiarata e l’orario reale di scadenza nel fuso della città', async () => {
      await renderSheet(hereGoing);
      expect(
        screen.getByText('venue:declare.declared({"intent":"ui:intent.goingAction"})'),
      ).toBeOnTheScreen();
      expect(screen.getByText('venue:declare.expiresAt({"time":"05:00"})')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'venue:declare.going' })).toBeNull();
    });

    it('Modifica passa all’altra intenzione e chiude', async () => {
      const onClose = await renderSheet(hereGoing);
      await fireEvent.press(screen.getByRole('button', { name: /venue:declare.edit/ }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
        p_intent: 'maybe',
        p_venue_id: 'v1',
      });
    });

    it('Annulla chiede conferma prima di togliere la dichiarazione', async () => {
      await renderSheet(hereGoing);
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.cancel' }));
      expect(screen.getByText('venue:declare.cancelConfirm')).toBeOnTheScreen();
      expect(rpcNames()).not.toContain('undeclare');
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.confirmYes' }));
      await waitFor(() => expect(rpcNames()).toContain('undeclare'));
    });

    it('"Mantieni" rinuncia ad annullare', async () => {
      await renderSheet(hereGoing);
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.cancel' }));
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.confirmNo' }));
      expect(screen.queryByText('venue:declare.cancelConfirm')).toBeNull();
      expect(rpcNames()).not.toContain('undeclare');
    });

    it('"Rimuovi la mia icona" chiede conferma, toglie la dichiarazione e chiude', async () => {
      const onClose = await renderSheet(hereGoing);
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.remove' }));
      expect(screen.getByText('venue:declare.removeConfirm')).toBeOnTheScreen();
      expect(rpcNames()).not.toContain('undeclare');
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.confirmYes' }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(rpcNames()).toContain('undeclare');
    });
  });

  describe('Chiedi all’AI', () => {
    it('mostra le tre domande e, al tocco, dice che arriveranno senza chiamare il server', async () => {
      await renderSheet(none);
      expect(screen.getByText('venue:ai.title')).toBeOnTheScreen();
      expect(screen.queryByText('venue:ai.soon')).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: 'venue:ai.music' }));
      expect(screen.getByText('venue:ai.soon')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'venue:ai.dress' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'venue:ai.arrive' })).toBeOnTheScreen();
      expect(rpcNames()).toEqual([]);
    });
  });

  it('se il server rifiuta mostra l’errore e non chiude', async () => {
    const onClose = jest.fn();
    const { Wrapper } = createQueryWrapper();
    fakeSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'VENUE_NOT_ACTIVE' } });
    await render(
      <DeclarationSheet
        visible
        onClose={onClose}
        target={{ kind: 'night', id: 'v1' }}
        venue={venue}
        state={none}
      />,
      { wrapper: Wrapper },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.going' }));
    expect(await screen.findByText('errors:rpc.VENUE_NOT_ACTIVE')).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });
});
