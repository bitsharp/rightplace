type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

export type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

// SecureStore values are limited to ~2 KB and a Supabase session is larger: split it in chunks.
export function createChunkedStorage(store: SecureStoreLike, chunkSize = 1800): AsyncStorageLike {
  const countKey = (key: string) => `${key}.chunks`;
  const chunkKey = (key: string, index: number) => `${key}.${index}`;

  const removeItem = async (key: string) => {
    const count = Number((await store.getItemAsync(countKey(key))) ?? 0);
    for (let index = 0; index < count; index += 1)
      await store.deleteItemAsync(chunkKey(key, index));
    await store.deleteItemAsync(countKey(key));
  };

  const getItem = async (key: string) => {
    const count = Number((await store.getItemAsync(countKey(key))) ?? 0);
    if (count === 0) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => store.getItemAsync(chunkKey(key, index))),
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  };

  const setItem = async (key: string, value: string) => {
    await removeItem(key);
    const count = Math.max(1, Math.ceil(value.length / chunkSize));
    for (let index = 0; index < count; index += 1) {
      await store.setItemAsync(
        chunkKey(key, index),
        value.slice(index * chunkSize, (index + 1) * chunkSize),
      );
    }
    await store.setItemAsync(countKey(key), String(count));
  };

  return { getItem, setItem, removeItem };
}
