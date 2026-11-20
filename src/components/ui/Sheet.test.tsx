import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet, Text } from 'react-native';

import { Sheet } from './Sheet';

const mockInsets = { top: 47, bottom: 34, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual<object>('react-native-safe-area-context'),
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 800, scale: 3, fontScale: 1 }),
}));

describe('Sheet', () => {
  it('sale sopra la tastiera con una sola strategia su iOS e Android: padding della libreria', async () => {
    for (const os of ['ios', 'android'] as const) {
      jest.replaceProperty(Platform, 'OS', os);
      await render(
        <Sheet visible onClose={jest.fn()}>
          <Text>contenuto</Text>
        </Sheet>,
      );
      expect(screen.getByTestId('sheet-keyboard-avoider').props.behavior).toBe('padding');
      await screen.unmount();
    }
  });

  it('il Modal è una finestra nativa a sé: ha il suo KeyboardProvider ed è edge-to-edge', async () => {
    await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>contenuto</Text>
      </Sheet>,
    );
    const provider = screen.getByTestId('keyboard-provider');
    expect(provider.props.statusBarTranslucent).toBe(true);
    expect(provider.props.navigationBarTranslucent).toBe(true);
    expect(screen.getByTestId('sheet-modal').props.navigationBarTranslucent).toBe(true);
    expect(screen.getByTestId('sheet-modal').props.statusBarTranslucent).toBe(true);
  });

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

  it('non supera lo schermo: altezza massima = finestra - inset superiore - margine', async () => {
    await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>contenuto</Text>
      </Sheet>,
    );
    // 800 - 47 (barra di stato / notch) - 20 (spacing.xl)
    expect(StyleSheet.flatten(screen.getByTestId('sheet-surface').props.style).maxHeight).toBe(
      800 - 47 - 20,
    );
  });

  it('il contenuto scorre dentro il foglio e i tap sui bottoni passano con la tastiera aperta', async () => {
    await render(
      <Sheet visible onClose={jest.fn()}>
        <Text>contenuto</Text>
      </Sheet>,
    );
    const scroll = screen.getByTestId('sheet-content');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(screen.getByText('contenuto')).toBeOnTheScreen();
  });
});
