import * as Notifications from 'expo-notifications';

import { getPermissionStatus, requestNotificationPermission } from './permissions';

const get = jest.mocked(Notifications.getPermissionsAsync);
const request = jest.mocked(Notifications.requestPermissionsAsync);
type Status = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;
const answer = (status: string, granted: boolean, canAskAgain: boolean) =>
  ({ status, granted, canAskAgain, expires: 'never' }) as Status;

describe('notification permission', () => {
  it('concesso', async () => {
    get.mockResolvedValueOnce(answer('granted', true, true));
    await expect(getPermissionStatus()).resolves.toBe('granted');
  });

  it('mai chiesto', async () => {
    get.mockResolvedValueOnce(answer('undetermined', false, true));
    await expect(getPermissionStatus()).resolves.toBe('undetermined');
  });

  it('negato ma si può ancora chiedere (Android) vale come non deciso', async () => {
    get.mockResolvedValueOnce(answer('denied', false, true));
    await expect(getPermissionStatus()).resolves.toBe('undetermined');
  });

  it('negato in modo definitivo: solo le impostazioni del telefono possono cambiarlo', async () => {
    get.mockResolvedValueOnce(answer('denied', false, false));
    await expect(getPermissionStatus()).resolves.toBe('denied');
  });

  it('chiede il permesso di sistema e restituisce l’esito', async () => {
    request.mockResolvedValueOnce(answer('granted', true, true));
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
