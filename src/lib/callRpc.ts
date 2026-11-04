import { RpcError, toRpcErrorCode } from './rpcError';
import { supabase } from './supabase';

// Generic wrapper: callers validate the response shape (zod) where it carries data.
export async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await (
    supabase.rpc as (fn: string, params?: object) => PromiseLike<{ data: unknown; error: unknown }>
  )(name, args);
  if (error) throw new RpcError(toRpcErrorCode(error));
  return data as T;
}
