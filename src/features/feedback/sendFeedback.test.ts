import { uploadPhoto } from '@/lib/photos/photos';
import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import { sendFeedback, type SendFeedbackInput } from './sendFeedback';

jest.mock('@/lib/photos/photos', () => ({ uploadPhoto: jest.fn() }));

const upload = jest.mocked(uploadPhoto);

const input: SendFeedbackInput = {
  userId: 'me',
  rating: 4,
  comment: 'Bella',
  screen: '/venue/[id]',
  screenshotUri: 'file:///shot.jpg',
  appVersion: '0.1.0',
  platform: 'ios',
  locale: 'it',
};

describe('sendFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    upload.mockResolvedValue('me/abc.jpg');
    fakeSupabase.rpc.mockResolvedValue({ data: 'f1', error: null });
  });

  it('carica lo screenshot nel bucket feedback e poi chiama submit_feedback con i parametri giusti', async () => {
    await sendFeedback(input);
    expect(upload).toHaveBeenCalledWith('feedback', 'me', 'file:///shot.jpg');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('submit_feedback', {
      p_rating: 4,
      p_comment: 'Bella',
      p_screen: '/venue/[id]',
      p_screenshot_path: 'me/abc.jpg',
      p_app_version: '0.1.0',
      p_platform: 'ios',
      p_locale: 'it',
    });
  });

  it('senza screenshot non carica nulla e passa path null', async () => {
    await sendFeedback({ ...input, screenshotUri: null });
    expect(upload).not.toHaveBeenCalled();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith(
      'submit_feedback',
      expect.objectContaining({ p_screenshot_path: null }),
    );
  });

  it('se il caricamento fallisce non invia il feedback', async () => {
    upload.mockRejectedValue(new RpcError('NETWORK'));
    await expect(sendFeedback(input)).rejects.toMatchObject({ code: 'NETWORK' });
    expect(fakeSupabase.rpc).not.toHaveBeenCalled();
  });

  it('propaga il codice del server, ad esempio il limite giornaliero', async () => {
    fakeSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'FEEDBACK_LIMIT' } });
    await expect(sendFeedback(input)).rejects.toMatchObject({ code: 'FEEDBACK_LIMIT' });
  });
});
