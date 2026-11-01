export const AUTH_ERROR_CODES = [
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'CAPTCHA_FAILED',
  'EMAIL_NOT_CONFIRMED',
  'WEAK_PASSWORD',
  'RATE_LIMITED',
  'NETWORK',
  'UNKNOWN',
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const BY_SUPABASE_CODE: Record<string, AuthErrorCode> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  user_already_exists: 'EMAIL_TAKEN',
  email_exists: 'EMAIL_TAKEN',
  captcha_failed: 'CAPTCHA_FAILED',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  weak_password: 'WEAK_PASSWORD',
  over_email_send_rate_limit: 'RATE_LIMITED',
  over_request_rate_limit: 'RATE_LIMITED',
};

type ErrorLike = { name?: unknown; code?: unknown; message?: unknown };

export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, message } = error as ErrorLike;
  return (
    name === 'AuthRetryableFetchError' ||
    (error instanceof TypeError && /network/i.test(String(message)))
  );
}

export function toAuthErrorCode(error: unknown): AuthErrorCode {
  if (isNetworkError(error)) return 'NETWORK';
  if (typeof error !== 'object' || error === null) return 'UNKNOWN';
  const code = (error as ErrorLike).code;
  return (typeof code === 'string' && BY_SUPABASE_CODE[code]) || 'UNKNOWN';
}
