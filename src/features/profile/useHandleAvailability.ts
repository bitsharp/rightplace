import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { checkHandleAvailability, type HandleAvailability } from './api';
import { validateHandle, type HandleFormatError } from './domain/handle';

export const HANDLE_AVAILABILITY_DEBOUNCE_MS = 400;

export type HandleCheck =
  | { kind: 'idle' }
  | { kind: 'format'; error: HandleFormatError }
  | { kind: 'checking' }
  | { kind: 'result'; value: HandleAvailability }
  | { kind: 'error' };

function useDebounced(value: string, delayMs: number): string {
  // Starts empty: even the first typed text waits for the pause, so no request leaves per keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// What the field under the input says about the typed @tag. The local rule answers at once; only a well-formed
// candidate asks the server, after a pause. Never persisted: availability changes by the minute.
export function useHandleAvailability(candidate: string, current: string): HandleCheck {
  const format = validateHandle(candidate);
  const skip = candidate === '' || candidate === current || !format.ok;
  const settled = useDebounced(candidate, HANDLE_AVAILABILITY_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: ['handleAvailability', settled],
    queryFn: () => checkHandleAvailability(settled),
    enabled: !skip && settled === candidate,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    meta: { persist: false },
  });

  if (candidate === '' || candidate === current) return { kind: 'idle' };
  if (!format.ok) return { kind: 'format', error: format.error };
  if (settled !== candidate || query.isPending) return { kind: 'checking' };
  if (query.isError) return { kind: 'error' };
  return { kind: 'result', value: query.data };
}
