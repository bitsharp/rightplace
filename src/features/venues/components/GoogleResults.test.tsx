import { fireEvent, render, screen } from '@testing-library/react-native';

import type { GoogleSuggestion } from '../googleApi';

import { GoogleResults } from './GoogleResults';

const rows: GoogleSuggestion[] = [
  {
    placeId: 'A',
    primaryText: 'Via Torino 20',
    secondaryText: 'Milano MI',
    types: ['street_address'],
  },
  {
    placeId: 'B',
    primaryText: 'Magazzini Generali',
    secondaryText: 'Via Pietrasanta, Milano',
    types: [],
  },
];

const base = { suggestions: rows, selectError: null, selecting: false, onSelect: jest.fn() };

describe('GoogleResults', () => {
  beforeEach(() => jest.clearAllMocks());

  it("a riposo non mostra nulla, nemmeno l'attribuzione", async () => {
    await render(<GoogleResults {...base} status="idle" suggestions={[]} />);
    expect(screen.queryByText('venues:google.title')).toBeNull();
    expect(screen.queryByText('venues:google.attribution')).toBeNull();
  });

  it('con i risultati: titolo, righe e attribuzione "Google Maps" sotto la lista', async () => {
    await render(<GoogleResults {...base} status="ready" />);
    expect(screen.getByText('venues:google.title')).toBeOnTheScreen();
    expect(screen.getByText('Via Torino 20')).toBeOnTheScreen();
    expect(screen.getByText('Milano MI')).toBeOnTheScreen();
    const texts = screen.getAllByText(/./).map((node) => node.props.children);
    expect(texts[texts.length - 1]).toBe('venues:google.attribution');
  });

  it('un tap su una riga seleziona quel luogo', async () => {
    await render(<GoogleResults {...base} status="ready" />);
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'venues:google.rowA11y({"name":"Magazzini Generali","place":"Via Pietrasanta, Milano"})',
      }),
    );
    expect(base.onSelect).toHaveBeenCalledWith(rows[1]);
  });

  it("mostra il caricamento, l'errore e il limite giornaliero", async () => {
    const { rerender } = await render(
      <GoogleResults {...base} status="loading" suggestions={[]} />,
    );
    expect(screen.getByText('venues:google.loading')).toBeOnTheScreen();
    await rerender(<GoogleResults {...base} status="error" suggestions={[]} />);
    expect(screen.getByText('venues:google.error')).toBeOnTheScreen();
    await rerender(<GoogleResults {...base} status="limit" suggestions={[]} />);
    expect(screen.getByText('venues:google.limit')).toBeOnTheScreen();
  });

  it('pronta ma senza risultati: niente sezione', async () => {
    await render(<GoogleResults {...base} status="ready" suggestions={[]} />);
    expect(screen.queryByText('venues:google.title')).toBeNull();
  });

  it('errori di selezione tradotti, anche fuori città', async () => {
    const { rerender } = await render(
      <GoogleResults {...base} status="ready" selectError="FAILED" />,
    );
    expect(screen.getByText('venues:google.selectError')).toBeOnTheScreen();
    await rerender(<GoogleResults {...base} status="ready" selectError="OUT_OF_CITY" />);
    expect(screen.getByText('venues:google.outOfCity')).toBeOnTheScreen();
  });

  it('mentre seleziona le righe non rispondono ai tap', async () => {
    await render(<GoogleResults {...base} status="ready" selecting />);
    await fireEvent.press(screen.getAllByRole('button')[0]!);
    expect(base.onSelect).not.toHaveBeenCalled();
  });
});
