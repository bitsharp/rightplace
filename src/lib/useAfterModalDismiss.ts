import { useCallback, useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';

import type { AfterModalDismiss } from './afterModalDismiss';

// The pending request lives in a ref and `run` is read through a ref: a parent re-render between the tap
// and the Modal's onDismiss (new callback identities) must never lose the navigation on iOS.
export function useAfterModalDismiss<T>(run: (value: T) => void): AfterModalDismiss<T> {
  const latestRun = useRef(run);
  // Not during render (react-hooks/refs): the layout effect runs before any tap or onDismiss can.
  useLayoutEffect(() => {
    latestRun.current = run;
  });
  const pending = useRef<{ value: T } | null>(null);
  const request = useCallback((value: T) => {
    if (Platform.OS !== 'ios') return latestRun.current(value);
    pending.current = { value };
  }, []);
  const onDismiss = useCallback(() => {
    if (pending.current === null) return;
    const { value } = pending.current;
    pending.current = null;
    latestRun.current(value);
  }, []);
  return { request, onDismiss };
}
