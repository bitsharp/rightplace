import { createChunkedStorage } from './chunkedSecureStore';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: jest.fn(async (key: string) => data.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      if (value.length > 2048) throw new Error('too big for SecureStore');
      data.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      data.delete(key);
    }),
  };
}

describe('createChunkedStorage', () => {
  it('salva e rilegge valori più grandi del limite di 2 KB di SecureStore', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 1000);
    const session = 'x'.repeat(4500);
    await storage.setItem('sb-auth-token', session);
    expect(await storage.getItem('sb-auth-token')).toBe(session);
    expect(store.data.size).toBeGreaterThan(1);
  });

  it('restituisce null per una chiave mai salvata', async () => {
    expect(await createChunkedStorage(memoryStore()).getItem('nulla')).toBeNull();
  });

  it('cancella tutti i pezzi, anche quelli di un valore precedente più lungo', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 1000);
    await storage.setItem('k', 'a'.repeat(3500));
    await storage.setItem('k', 'b'.repeat(500));
    expect(await storage.getItem('k')).toBe('b'.repeat(500));
    await storage.removeItem('k');
    expect(store.data.size).toBe(0);
  });
});
