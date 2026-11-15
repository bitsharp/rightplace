export const HANDLE_CHANGE_DAYS = 30;
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

// Handles generated before the free choice could reach 23 characters: they stay valid wherever one is read.
const HANDLE_SHAPE = /^[a-z][a-z0-9._]{1,22}[a-z0-9]$/;

export type HandleFormatError =
  'tooShort' | 'tooLong' | 'badChars' | 'badStart' | 'badEnd' | 'doubleDot';
export type HandleValidation = { ok: true } | { ok: false; error: HandleFormatError };

export function formatHandle(handle: string): string {
  return handle.startsWith('@') ? handle : `@${handle}`;
}

// Applied while typing: the field shows the @ itself, so a typed one is dropped (one only: "@@x" stays wrong).
export function normalizeHandle(typed: string): string {
  return typed.replace(/\s+/g, '').replace(/^@/, '').toLowerCase();
}

// One rule, mirrored by private.is_valid_handle in SQL (same test cases): the server has the last word.
export function validateHandle(handle: string): HandleValidation {
  if (!/^[a-z0-9._]*$/.test(handle)) return { ok: false, error: 'badChars' };
  if (handle.length < MIN_LENGTH) return { ok: false, error: 'tooShort' };
  if (handle.length > MAX_LENGTH) return { ok: false, error: 'tooLong' };
  if (!/^[a-z]/.test(handle)) return { ok: false, error: 'badStart' };
  if (!/[a-z0-9]$/.test(handle)) return { ok: false, error: 'badEnd' };
  if (handle.includes('..')) return { ok: false, error: 'doubleDot' };
  return { ok: true };
}

// For handles that come from outside (deep links) or from the server: shape only, not the creation rules.
export function isHandleShaped(handle: string): boolean {
  return HANDLE_SHAPE.test(handle) && !handle.includes('..');
}

// null when the handle can be changed now (never changed, or the last change is older than 30 days).
export function nextHandleChangeAt(changedAt: string | null, now: Date): Date | null {
  if (changedAt === null) return null;
  const next = new Date(new Date(changedAt).getTime() + HANDLE_CHANGE_DAYS * DAY_MS);
  return next > now ? next : null;
}
