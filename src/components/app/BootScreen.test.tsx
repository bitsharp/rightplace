import { fireEvent, render, screen } from '@testing-library/react-native';

import { BootScreen } from './BootScreen';

describe('BootScreen', () => {
  it('mostra il caricamento', async () => {
    await render(<BootScreen error={false} onRetry={jest.fn()} />);
    expect(screen.getByLabelText('common:boot.loading')).toBeOnTheScreen();
  });

  it('se il profilo non si carica propone di riprovare invece di restare bloccata', async () => {
    const onRetry = jest.fn();
    await render(<BootScreen error onRetry={onRetry} />);
    expect(screen.getByText('common:boot.error')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'common:boot.retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
