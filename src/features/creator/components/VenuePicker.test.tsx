import { fireEvent, render, screen } from '@testing-library/react-native';

import { VenuePicker } from './VenuePicker';

const venues = [
  { id: 'a', name: 'Arena Club', kind: 'club' as const, cityName: 'Milano' },
  { id: 'b', name: 'Bar Brera', kind: 'bar' as const, cityName: 'Milano' },
  { id: 'c', name: 'Terrazza Isola', kind: 'rooftop' as const, cityName: 'Milano' },
];

describe('VenuePicker', () => {
  it('senza scelta mostra la ricerca e i locali della città', async () => {
    await render(<VenuePicker venues={venues} value={null} onChange={jest.fn()} />);
    expect(screen.getByLabelText('creator:form.venue.searchLabel')).toBeOnTheScreen();
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('Bar Brera')).toBeOnTheScreen();
  });

  it('filtra mentre si scrive, ignorando accenti e maiuscole', async () => {
    await render(<VenuePicker venues={venues} value={null} onChange={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText('creator:form.venue.searchLabel'), 'TERRAZ');
    expect(screen.getByText('Terrazza Isola')).toBeOnTheScreen();
    expect(screen.queryByText('Arena Club')).toBeNull();
  });

  it('dice quando non c’è nessun locale', async () => {
    await render(<VenuePicker venues={venues} value={null} onChange={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText('creator:form.venue.searchLabel'), 'zzz');
    expect(screen.getByText('creator:form.venue.empty')).toBeOnTheScreen();
  });

  it('toccando un locale lo sceglie', async () => {
    const onChange = jest.fn();
    await render(<VenuePicker venues={venues} value={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Bar Brera' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('con un locale scelto lo mostra con "Cambia" e torna alla ricerca', async () => {
    const onChange = jest.fn();
    await render(<VenuePicker venues={venues} value="a" onChange={onChange} />);
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.queryByText('Bar Brera')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.venue.change' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('da bloccato (modifica) non si può cambiare', async () => {
    await render(<VenuePicker venues={venues} value="a" onChange={jest.fn()} locked />);
    expect(screen.queryByRole('button', { name: 'creator:form.venue.change' })).toBeNull();
    expect(screen.getByText('creator:form.venue.locked')).toBeOnTheScreen();
  });

  it('mostra l’errore sotto il campo', async () => {
    await render(
      <VenuePicker venues={venues} value={null} onChange={jest.fn()} error="Scegli il luogo" />,
    );
    expect(screen.getByText('Scegli il luogo')).toBeOnTheScreen();
  });
});
