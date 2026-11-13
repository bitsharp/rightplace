import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { SpotSheet } from './SpotSheet';

const POINT = { lat: 45.46421234, lng: 9.19006789 };

async function renderSheet(point: typeof POINT | null = POINT, onClose = jest.fn()) {
  const { Wrapper } = createQueryWrapper();
  await render(<SpotSheet point={point} onClose={onClose} />, { wrapper: Wrapper });
  return onClose;
}

const typeName = (text: string) =>
  fireEvent.changeText(screen.getByLabelText('spots:sheet.nameLabel'), text);
const declareCalls = () =>
  fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'declare_at_spot');

describe('SpotSheet', () => {
  beforeEach(() => setFakeRpc({ declare_at_spot: [{ venue_id: 's1', declaration_id: 'd1' }] }));

  it('è chiuso senza un punto scelto', async () => {
    await renderSheet(null);
    expect(screen.queryByText('spots:sheet.title')).toBeNull();
  });

  it('mostra titolo, campo nome, avviso di visibilità e i due bottoni', async () => {
    await renderSheet();
    expect(screen.getByText('spots:sheet.title')).toBeOnTheScreen();
    expect(screen.getByLabelText('spots:sheet.nameLabel')).toBeOnTheScreen();
    expect(screen.getByText('spots:sheet.visibility')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'spots:sheet.going' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'spots:sheet.maybe' })).toBeOnTheScreen();
  });

  it("un nome non valido mostra l'errore sul campo e non chiama il server", async () => {
    await renderSheet();
    await typeName('ab');
    await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.going' }));
    expect(await screen.findByText('spots:nameError.tooShort')).toBeOnTheScreen();
    expect(declareCalls()).toHaveLength(0);
  });

  it.each([
    ['@mario party', 'noMentions'],
    ['vai su www.sito', 'noLinks'],
    ['x'.repeat(41), 'tooLong'],
  ])('rifiuta "%s" con il messaggio %s', async (name, reason) => {
    await renderSheet();
    await typeName(name);
    await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.maybe' }));
    expect(await screen.findByText(`spots:nameError.${reason}`)).toBeOnTheScreen();
    expect(declareCalls()).toHaveLength(0);
  });

  it("nome valido + SI: chiama declare_at_spot col punto, il nome e l'intento, poi chiude", async () => {
    const onClose = await renderSheet();
    await typeName('  Casa di Anna ');
    await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.going' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(declareCalls()[0]?.[1]).toEqual({
      p_lat: POINT.lat,
      p_lng: POINT.lng,
      p_name: 'Casa di Anna',
      p_intent: 'going',
    });
  });

  it('FORSE dichiara con intento maybe', async () => {
    await renderSheet();
    await typeName('Casa di Anna');
    await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.maybe' }));
    await waitFor(() => expect(declareCalls()).toHaveLength(1));
    expect(declareCalls()[0]?.[1]).toMatchObject({ p_intent: 'maybe' });
  });

  it.each(['SPOT_LIMIT', 'OUT_OF_CITY', 'INVALID_SPOT_NAME'])(
    "l'errore %s del server è tradotto e lo sheet resta aperto",
    async (code) => {
      fakeSupabase.rpc.mockImplementation(async (name: string) =>
        name === 'declare_at_spot'
          ? { data: null, error: { message: code } }
          : { data: [], error: null },
      );
      const onClose = await renderSheet();
      await typeName('Casa di Anna');
      await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.going' }));
      expect(await screen.findByText(`errors:rpc.${code}`)).toBeOnTheScreen();
      expect(onClose).not.toHaveBeenCalled();
    },
  );

  it('invalida mappa e dichiarazione dopo la creazione', async () => {
    const { Wrapper, client } = createQueryWrapper();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await render(<SpotSheet point={POINT} onClose={jest.fn()} />, { wrapper: Wrapper });
    await typeName('Casa di Anna');
    await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.going' }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cityMap'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['myDeclaration'] });
  });
});
