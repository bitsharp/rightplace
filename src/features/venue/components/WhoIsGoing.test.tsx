import { fireEvent, render, screen } from '@testing-library/react-native';

import { WhoIsGoing } from './WhoIsGoing';

const visible = { kind: 'visible', avgAge: 23, femalePct: 52, malePct: 48 } as const;

describe('WhoIsGoing', () => {
  it('con statistiche visibili mostra età media e genere', async () => {
    await render(<WhoIsGoing segment="going" onSegment={jest.fn()} view={visible} />);
    expect(screen.getByText('ui:age.years({"age":23})')).toBeOnTheScreen();
    expect(screen.getByTestId('gender-female')).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it.each(['going', 'maybe', 'all'] as const)(
    'con dati nascosti nel segmento %s spiega perché, senza mostrare numeri',
    async (segment) => {
      await render(
        <WhoIsGoing segment={segment} onSegment={jest.fn()} view={{ kind: 'hidden', segment }} />,
      );
      expect(screen.getByText(`venue:who.hidden.${segment}`)).toBeOnTheScreen();
      expect(screen.queryByTestId('gender-female')).toBeNull();
      expect(screen.queryByText(/ui:age.years/)).toBeNull();
    },
  );

  it('mentre carica non mostra né statistiche né il messaggio di anonimato', async () => {
    await render(<WhoIsGoing segment="going" onSegment={jest.fn()} view={null} />);
    expect(screen.queryByTestId('empty-state')).toBeNull();
    expect(screen.queryByTestId('gender-female')).toBeNull();
  });

  it('mostra titolo, etichetta e nota sul calcolo', async () => {
    await render(<WhoIsGoing segment="going" onSegment={jest.fn()} view={null} />);
    expect(screen.getByText('venue:who.title')).toBeOnTheScreen();
    expect(screen.getByText('venue:who.label')).toBeOnTheScreen();
    expect(screen.getByText('venue:who.basis')).toBeOnTheScreen();
  });

  it('cambia segmento dal controllo Ci vado / Forse / Tutti', async () => {
    const onSegment = jest.fn();
    await render(<WhoIsGoing segment="going" onSegment={onSegment} view={null} />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:who.segment.maybe' }));
    expect(onSegment).toHaveBeenCalledWith('maybe');
    await fireEvent.press(screen.getByRole('button', { name: 'venue:who.segment.all' }));
    expect(onSegment).toHaveBeenCalledWith('all');
  });
});
