import { fireEvent, render, screen } from '@testing-library/react-native';

import { VenueTopBar } from './VenueTopBar';

describe('VenueTopBar', () => {
  it('mostra l’etichetta di sezione come intestazione', async () => {
    await render(<VenueTopBar onBack={jest.fn()} />);
    expect(screen.getByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
  });

  it('può mostrare un titolo diverso (profilo creator, serata)', async () => {
    await render(<VenueTopBar onBack={jest.fn()} title="Serata" />);
    expect(screen.getByRole('header', { name: 'Serata' })).toBeOnTheScreen();
  });

  it('il tasto indietro torna indietro', async () => {
    const onBack = jest.fn();
    await render(<VenueTopBar onBack={onBack} />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
