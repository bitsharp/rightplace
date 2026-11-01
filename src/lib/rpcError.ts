import { isNetworkError } from '@/features/auth/domain/authErrors';

// Codes raised by the SQL RPCs (see supabase/README.md).
const SERVER_ERROR_CODES = [
  'NOT_AUTHENTICATED',
  'UNDERAGE',
  'INVALID_ARGUMENT',
  'INVALID_INTENT',
  'CITY_NOT_ACTIVE',
  'VENUE_NOT_ACTIVE',
  'EVENT_NOT_ACTIVE',
  'LOCATION_OPT_OUT',
  'CONTACTS_OPT_OUT',
  'INVALID_HASH',
  'CANNOT_FOLLOW_SELF',
  'BLOCKED',
  'NOT_CREATOR',
  'NOT_FOUND',
  'HANDLE_ALREADY_CHANGED',
] as const;

export const RPC_ERROR_CODES = [...SERVER_ERROR_CODES, 'NETWORK', 'UNKNOWN'] as const;
export type RpcErrorCode = (typeof RPC_ERROR_CODES)[number];

export function toRpcErrorCode(error: unknown): RpcErrorCode {
  if (isNetworkError(error)) return 'NETWORK';
  const message =
    typeof error === 'object' && error !== null
      ? (error as { message?: unknown }).message
      : undefined;
  return SERVER_ERROR_CODES.find((code) => code === message) ?? 'UNKNOWN';
}

export class RpcError extends Error {
  constructor(readonly code: RpcErrorCode) {
    super(code);
    this.name = 'RpcError';
  }
}
