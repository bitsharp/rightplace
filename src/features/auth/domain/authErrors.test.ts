import { toAuthErrorCode } from './authErrors';

describe('toAuthErrorCode', () => {
  it.each([
    [{ name: 'AuthApiError', code: 'invalid_credentials' }, 'INVALID_CREDENTIALS'],
    [{ name: 'AuthApiError', code: 'user_already_exists' }, 'EMAIL_TAKEN'],
    [{ name: 'AuthApiError', code: 'email_exists' }, 'EMAIL_TAKEN'],
    [{ name: 'AuthApiError', code: 'captcha_failed' }, 'CAPTCHA_FAILED'],
    [{ name: 'AuthApiError', code: 'email_not_confirmed' }, 'EMAIL_NOT_CONFIRMED'],
    [{ name: 'AuthApiError', code: 'weak_password' }, 'WEAK_PASSWORD'],
    [{ name: 'AuthApiError', code: 'over_email_send_rate_limit' }, 'RATE_LIMITED'],
    [{ name: 'AuthApiError', code: 'over_request_rate_limit' }, 'RATE_LIMITED'],
    [{ name: 'AuthRetryableFetchError', message: 'Network request failed' }, 'NETWORK'],
    [new TypeError('Network request failed'), 'NETWORK'],
    [{ name: 'AuthApiError', code: 'something_new' }, 'UNKNOWN'],
    [null, 'UNKNOWN'],
  ])('traduce %j in %s', (error, code) => {
    expect(toAuthErrorCode(error)).toBe(code);
  });
});
