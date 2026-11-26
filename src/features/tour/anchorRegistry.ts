import { createContext, useContext, useSyncExternalStore } from 'react';

import type { Rect } from './domain/layout';
import type { TourStepId } from './domain/steps';

type Entry = { rect: Rect | null; measure: () => void };

export type AnchorRegistry = {
  // Returns the function that removes the anchor (unmount).
  register: (id: TourStepId, token: object, measure: () => void) => () => void;
  setRect: (id: TourStepId, token: object, rect: Rect) => void;
  rectOf: (id: TourStepId) => Rect | null;
  remeasure: (id: TourStepId) => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
};

// In memory only: positions are meaningless after a restart, so nothing here is persisted.
export function createAnchorRegistry(): AnchorRegistry {
  const anchors = new Map<TourStepId, Map<object, Entry>>();
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version += 1;
    listeners.forEach((listener) => listener());
  };
  const entriesOf = (id: TourStepId) => anchors.get(id) ?? new Map<object, Entry>();
  return {
    register(id, token, measure) {
      const entries = entriesOf(id);
      entries.set(token, { rect: null, measure });
      anchors.set(id, entries);
      return () => {
        entries.delete(token);
        changed();
      };
    },
    setRect(id, token, rect) {
      const entry = entriesOf(id).get(token);
      if (!entry) return;
      entry.rect = rect.width > 0 && rect.height > 0 ? rect : null;
      changed();
    },
    // The most recently measured one wins: the same id can live in several mounted screens.
    rectOf(id) {
      const rects = [...entriesOf(id).values()].flatMap((entry) =>
        entry.rect ? [entry.rect] : [],
      );
      return rects.at(-1) ?? null;
    },
    remeasure: (id) => entriesOf(id).forEach((entry) => entry.measure()),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    version: () => version,
  };
}

export const AnchorRegistryContext = createContext<AnchorRegistry>(createAnchorRegistry());

export function useAnchorRegistry(): AnchorRegistry {
  return useContext(AnchorRegistryContext);
}

// Re-renders the caller whenever any anchor is added, removed or measured.
export function useAnchorVersion(registry: AnchorRegistry): number {
  return useSyncExternalStore(registry.subscribe, registry.version, registry.version);
}
