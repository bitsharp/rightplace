import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { permissionResponse } from '@/test/notificationFixtures';
import { Platform } from 'react-native';

import { fakeSupabase } from '@/test/fakeSupabase';

import { registerDevicePushToken } from './pushToken';
import { resetNotificationState, useNotificationStore } from './store/notificationStore';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'project-123' } } } },
}));

const getToken = jest.mocked(Notifications.getExpoPushTokenAsync);
const permissions = jest.mocked(Notifications.getPermissionsAsync);
const grant = () => permissions.mockResolvedValue(permissionResponse('granted'));

describe('registerDevicePushToken', () => {
  beforeEach(() => {
    resetNotificationState();
    grant();
    Platform.OS = 'ios';
  });

  it('con il permesso registra il token Expo del dispositivo e lo ricorda per il logout', async () => {
    getToken.mockResolvedValueOnce({ type: 'expo', data: 'ExponentPushToken[abc]' });
    await expect(registerDevicePushToken()).resolves.toBe('registered');
    expect(getToken).toHaveBeenCalledWith({ projectId: 'project-123' });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('register_push_token', {
      p_token: 'ExponentPushToken[abc]',
      p_platform: 'ios',
    });
    expect(useNotificationStore.getState().pushToken).toBe('ExponentPushToken[abc]');
  });

  it('senza permesso non chiede nessun token', async () => {
    permissions.mockResolvedValue(permissionResponse('denied', false));
    await expect(registerDevicePushToken()).resolves.toBe('no-permission');
    expect(getToken).not.toHaveBeenCalled();
    expect(fakeSupabase.rpc).not.toHaveBeenCalled();
  });

  it('se il token non è disponibile (Expo Go su Android) non va in crash e non registra nulla', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    getToken.mockRejectedValueOnce(new Error('Push notifications are not supported in Expo Go'));
    await expect(registerDevicePushToken()).resolves.toBe('unavailable');
    expect(fakeSupabase.rpc).not.toHaveBeenCalled();
    expect(warn.mock.calls.flat().join(' ')).not.toContain('ExponentPushToken');
    warn.mockRestore();
  });

  it('se il server rifiuta la registrazione non ricorda il token', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    getToken.mockResolvedValueOnce({ type: 'expo', data: 'ExponentPushToken[abc]' });
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'INVALID_TOKEN' } });
    await expect(registerDevicePushToken()).resolves.toBe('unavailable');
    expect(useNotificationStore.getState().pushToken).toBeNull();
    warn.mockRestore();
  });

  it('senza projectId non può ottenere un token', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const previous = Constants.expoConfig;
    Object.assign(Constants, { expoConfig: {} });
    await expect(registerDevicePushToken()).resolves.toBe('unavailable');
    expect(getToken).not.toHaveBeenCalled();
    Object.assign(Constants, { expoConfig: previous });
    warn.mockRestore();
  });
});
