type SecureStorage = { getItemAsync(key: string): Promise<string | null>; setItemAsync(key: string, value: string): Promise<void>; deleteItemAsync(key: string): Promise<void> };
type Index = { generation: string; count: number };
function parse(raw: string | null): Index | null {
  if (!raw) return null;
  const index = JSON.parse(raw) as Index;
  if (!/^[a-z0-9-]+$/.test(index.generation) || !Number.isInteger(index.count) || index.count < 1 || index.count > 64) throw new Error('Invalid saved session');
  return index;
}
// Small chunks avoid platform value limits. Switch the index only after every chunk is durable.
export function secureSessionStorage(storage: SecureStorage) {
  let queue = Promise.resolve();
  const serial = <T,>(work: () => Promise<T>) => { const job = queue.then(work); queue = job.then(() => {}, () => {}); return job; };
  const removeChunks = async (key: string, index: Index | null) => {
    if (index) await Promise.all(Array.from({ length: index.count }, (_, i) => storage.deleteItemAsync(`${key}.${index.generation}.${i}`)));
  };
  return {
    getItem: (key: string) => serial(async () => {
      const index = parse(await storage.getItemAsync(key)); if (!index) return null;
      const chunks = await Promise.all(Array.from({ length: index.count }, (_, i) => storage.getItemAsync(`${key}.${index.generation}.${i}`)));
      if (chunks.some(chunk => chunk === null)) throw new Error('Saved session is incomplete. Sign in again.');
      return chunks.join('');
    }),
    setItem: (key: string, value: string) => serial(async () => {
      const characters = Array.from(value);
      const count = Math.max(1, Math.ceil(characters.length / 400));
      if (count > 64) throw new Error('Session is too large for secure storage');
      const old = parse(await storage.getItemAsync(key));
      const index = { generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count };
      try {
        for (let i = 0; i < count; i++) await storage.setItemAsync(`${key}.${index.generation}.${i}`, characters.slice(i * 400, (i + 1) * 400).join(''));
        await storage.setItemAsync(key, JSON.stringify(index));
      } catch (error) { await removeChunks(key, index).catch(() => {}); throw error; }
      await removeChunks(key, old).catch(() => {});
    }),
    removeItem: (key: string) => serial(async () => {
      let index: Index | null = null;
      try { index = parse(await storage.getItemAsync(key)); } catch { /* The index itself can still be removed. */ }
      await storage.deleteItemAsync(key);
      await removeChunks(key, index);
    }),
  };
}
