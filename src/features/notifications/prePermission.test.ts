import * as Notifications from 'expo-notifications';

import { permissionResponse } from '@/test/notificationFixtures';
import { Platform } from 'react-native';

import {
  acceptPrePermission,
  declinePrePermission,
  onDeclarationSheetDismiss,
  requestPrePermission,
  usePrePermissionStore,
} from './prePermission';
import { resetNotificationState, useNotificationStore } from './store/notificationStore';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'project-123' } } } },
}));

const permissions = jest.mocked(Notifications.getPermissionsAsync);
const undecided = permissionResponse('undetermined');

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('pre-permission dopo la dichiarazione', () => {
  beforeEach(() => {
    resetNotificationState();
    usePrePermissionStore.setState({ open: false, permissionVersion: 0 });
    permissions.mockResolvedValue(undecided);
    Platform.OS = 'android';
  });

  it('alla prima dichiarazione apre la domanda (Android: subito)', async () => {
    requestPrePermission();
    await flush();
    expect(usePrePermissionStore.getState().open).toBe(true);
  });

  it('su iOS aspetta che la sheet della dichiarazione sia sparita', async () => {
    Platform.OS = 'ios';
    requestPrePermission();
    await flush();
    expect(usePrePermissionStore.getState().open).toBe(false);
    onDeclarationSheetDismiss();
    await flush();
    expect(usePrePermissionStore.getState().open).toBe(true);
  });

  it('non chiede se il permesso è già concesso', async () => {
    permissions.mockResolvedValue(permissionResponse('granted'));
    requestPrePermission();
    await flush();
    expect(usePrePermissionStore.getState().open).toBe(false);
  });

  it('non chiede di nuovo prima di una settimana da "Non ora"', async () => {
    declinePrePermission();
    requestPrePermission();
    await flush();
    expect(usePrePermissionStore.getState().open).toBe(false);
  });

  it('"Non ora" chiude la domanda e ricorda quando è stata fatta', () => {
    usePrePermissionStore.setState({ open: true });
    declinePrePermission();
    expect(usePrePermissionStore.getState().open).toBe(false);
    expect(useNotificationStore.getState().permissionAskedAt).not.toBeNull();
  });

  it('"Sì" chiede il permesso di sistema, registra il dispositivo e fa rileggere i promemoria', async () => {
    usePrePermissionStore.setState({ open: true });
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permissionResponse('granted'));
    await acceptPrePermission();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    expect(usePrePermissionStore.getState()).toMatchObject({ open: false, permissionVersion: 1 });
  });
});
