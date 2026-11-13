import { fireEvent, render, screen } from '@testing-library/react-native';

import { usePrePermissionStore } from '../prePermission';
import { PrePermissionSheet } from './PrePermissionSheet';

describe('PrePermissionSheet', () => {
  beforeEach(() => usePrePermissionStore.setState({ open: false, permissionVersion: 0 }));

  it('è chiusa finché nessuno la apre', async () => {
    await render(<PrePermissionSheet />);
    expect(screen.queryByText('notifications:prePermission.title')).toBeNull();
  });

  it('chiede con il testo del prodotto e due scelte', async () => {
    usePrePermissionStore.setState({ open: true });
    await render(<PrePermissionSheet />);
    expect(screen.getByText('notifications:prePermission.body')).toBeOnTheScreen();
    expect(screen.getByText('notifications:prePermission.yes')).toBeOnTheScreen();
    expect(screen.getByText('notifications:prePermission.no')).toBeOnTheScreen();
  });

  it('"Non ora" la chiude', async () => {
    usePrePermissionStore.setState({ open: true });
    await render(<PrePermissionSheet />);
    await fireEvent.press(screen.getByText('notifications:prePermission.no'));
    expect(usePrePermissionStore.getState().open).toBe(false);
  });
});
