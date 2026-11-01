import { createQueryClient, PERSIST_MAX_AGE_MS, shouldPersistQuery } from './queryClient';

describe('createQueryClient', () => {
  it('tiene in memoria i dati almeno quanto la cache persistita', () => {
    const gcTime = createQueryClient().getDefaultOptions().queries?.gcTime;
    expect(gcTime).toBeGreaterThanOrEqual(PERSIST_MAX_AGE_MS);
  });

  it('crea client indipendenti a ogni chiamata', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});

describe('shouldPersistQuery', () => {
  const query = (meta?: Record<string, unknown>) =>
    ({ meta, state: { status: 'success' } }) as unknown as Parameters<typeof shouldPersistQuery>[0];

  it('salva su disco le query riuscite', () => {
    expect(shouldPersistQuery(query())).toBe(true);
  });

  it('non salva su disco le query con dati privati (es. il proprio profilo)', () => {
    expect(shouldPersistQuery(query({ persist: false }))).toBe(false);
  });
});
