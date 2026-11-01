export const MIN_PASSWORD_LENGTH = 8;

export type PasswordStrength = 'weak' | 'fair' | 'strong';

const CHARACTER_CLASSES = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];

export function isPasswordValid(password: string): boolean {
  return password.trim().length >= MIN_PASSWORD_LENGTH;
}

export function passwordStrength(password: string): PasswordStrength {
  const classes = CHARACTER_CLASSES.filter((pattern) => pattern.test(password)).length;
  if (!isPasswordValid(password) || classes < 2) return 'weak';
  if (password.length >= 12 && classes >= 3) return 'strong';
  return 'fair';
}
