import { createQueryClient, PERSIST_MAX_AGE_MS } from './queryClient';

describe('createQueryClient', () => {
  it('tiene in memoria i dati almeno quanto la cache persistita', () => {
    const gcTime = createQueryClient().getDefaultOptions().queries?.gcTime;
    expect(gcTime).toBeGreaterThanOrEqual(PERSIST_MAX_AGE_MS);
  });

  it('crea client indipendenti a ogni chiamata', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
