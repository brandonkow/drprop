/**
 * Session storage on top of the device keychain (expo-secure-store), which limits
 * the size of each value. The session is split into chunks under a fresh
 * generation; the index switches only after every chunk is written, so a failed
 * write keeps the previous complete session.
 */
type SecureStorage = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
type Index = { generation: string; count: number };

const CHUNK = 400; // characters; well under the keychain's per-value limit in UTF-8
const MAX_CHUNKS = 64;

function parse(raw: string | null): Index | null {
  if (!raw) return null;
  const index = JSON.parse(raw) as Index;
  if (!/^[a-z0-9-]+$/.test(index.generation) || !Number.isInteger(index.count) || index.count < 1 || index.count > MAX_CHUNKS) {
    throw new Error('Invalid saved session');
  }
  return index;
}

export function secureSessionStorage(storage: SecureStorage) {
  let queue = Promise.resolve();
  // One operation at a time: a read never sees half a write.
  const serial = <T>(work: () => Promise<T>) => {
    const job = queue.then(work);
    queue = job.then(
      () => {},
      () => {},
    );
    return job;
  };
  const removeChunks = async (key: string, index: Index | null) => {
    if (!index) return;
    await Promise.all(Array.from({ length: index.count }, (_, i) => storage.deleteItemAsync(`${key}.${index.generation}.${i}`)));
  };

  return {
    getItem: (key: string) =>
      serial(async () => {
        const index = parse(await storage.getItemAsync(key));
        if (!index) return null;
        const chunks = await Promise.all(
          Array.from({ length: index.count }, (_, i) => storage.getItemAsync(`${key}.${index.generation}.${i}`)),
        );
        if (chunks.some((c) => c === null)) throw new Error('Saved session is incomplete. Sign in again.');
        return chunks.join('');
      }),
    setItem: (key: string, value: string) =>
      serial(async () => {
        const characters = Array.from(value); // whole code points, never half a surrogate pair
        const count = Math.max(1, Math.ceil(characters.length / CHUNK));
        if (count > MAX_CHUNKS) throw new Error('Session is too large for secure storage');
        const old = parse(await storage.getItemAsync(key));
        const index = { generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count };
        try {
          for (let i = 0; i < count; i++) {
            await storage.setItemAsync(`${key}.${index.generation}.${i}`, characters.slice(i * CHUNK, (i + 1) * CHUNK).join(''));
          }
          await storage.setItemAsync(key, JSON.stringify(index));
        } catch (error) {
          await removeChunks(key, index).catch(() => {});
          throw error;
        }
        await removeChunks(key, old).catch(() => {});
      }),
    removeItem: (key: string) =>
      serial(async () => {
        let index: Index | null = null;
        try {
          index = parse(await storage.getItemAsync(key));
        } catch {
          // A corrupt index can still be removed.
        }
        await storage.deleteItemAsync(key);
        await removeChunks(key, index);
      }),
  };
}
