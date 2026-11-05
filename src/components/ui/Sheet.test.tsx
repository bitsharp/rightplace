import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Sheet } from './Sheet';

describe('Sheet', () => {
  it('non mostra nulla quando è chiuso', async () => {
    await render(
      <Sheet visible={false} onClose={jest.fn()}>
        <Text>contenuto</Text>
      </Sheet>,
    );
    expect(screen.queryByText('contenuto')).not.toBeOnTheScreen();
  });

  it('mostra contenuto e maniglia quando è aperto', async () => {
    await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>contenuto</Text>
      </Sheet>,
    );
    expect(screen.getByText('contenuto')).toBeOnTheScreen();
    expect(screen.getByTestId('sheet-handle')).toBeOnTheScreen();
  });

  it('inoltra onDismiss al Modal, per aprire cose native solo a foglio sparito', async () => {
    const onDismiss = jest.fn();
    await render(<Sheet visible onClose={jest.fn()} onDismiss={onDismiss} />);
    await fireEvent(screen.getByTestId('sheet-panel', { includeHiddenElements: true }), 'dismiss');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('si chiude toccando lo sfondo', async () => {
    const onClose = jest.fn();
    await render(<Sheet visible onClose={onClose} />);
    // The backdrop sits outside the accessibility-modal panel, so it is hidden from screen readers.
    await fireEvent.press(screen.getByTestId('sheet-backdrop', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('si chiude con il gesto "indietro" degli screen reader', async () => {
    const onClose = jest.fn();
    await render(<Sheet visible onClose={onClose} />);
    await fireEvent(screen.getByTestId('sheet-panel'), 'accessibilityEscape');
    expect(onClose).toHaveBeenCalled();
  });
});
