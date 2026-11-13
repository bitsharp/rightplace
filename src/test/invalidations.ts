import type { QueryClient } from '@tanstack/react-query';

// Records every query key a mutation invalidates, so tests can state which cached data must reload.
export function spyOnInvalidations(client: QueryClient): () => readonly unknown[][] {
  const spy = jest.spyOn(client, 'invalidateQueries');
  return () =>
    spy.mock.calls.flatMap(([filters]) => (filters?.queryKey ? [[...filters.queryKey]] : []));
}
