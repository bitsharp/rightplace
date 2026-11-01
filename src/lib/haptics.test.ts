import * as Haptics from 'expo-haptics';

import { confirmFeedback, selectionFeedback } from './haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

describe('haptics', () => {
  it('dà un feedback leggero sulle selezioni', () => {
    selectionFeedback();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('dà un feedback di conferma sulle azioni importanti', () => {
    confirmFeedback();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('non fa fallire l’interazione se il device non supporta la vibrazione', async () => {
    jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('unsupported'));
    expect(() => selectionFeedback()).not.toThrow();
    await Promise.resolve();
  });
});
