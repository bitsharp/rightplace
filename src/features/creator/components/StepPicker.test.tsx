import { fireEvent, render, screen } from '@testing-library/react-native';

import { StepPicker } from './StepPicker';

const props = {
  label: 'Inizio',
  valueLabel: 'Sab 7 nov',
  previousLabel: 'Giorno prima',
  nextLabel: 'Giorno dopo',
  onPrevious: jest.fn(),
  onNext: jest.fn(),
};

describe('StepPicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra etichetta e valore', async () => {
    await render(<StepPicker {...props} />);
    expect(screen.getByText('Inizio')).toBeOnTheScreen();
    expect(screen.getByText('Sab 7 nov')).toBeOnTheScreen();
  });

  it('i due bottoni avanzano e arretrano', async () => {
    await render(<StepPicker {...props} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Giorno prima' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Giorno dopo' }));
    expect(props.onPrevious).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it('un bottone può essere spento (es. nessun giorno nel passato)', async () => {
    await render(<StepPicker {...props} previousDisabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Giorno prima' }));
    expect(props.onPrevious).not.toHaveBeenCalled();
  });
});
