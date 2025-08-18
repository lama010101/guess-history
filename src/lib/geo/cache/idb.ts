import { GeoHit } from '../types';

const DB_NAME = 'gh-geo';
const STORE = 'geocache';
const VERSION = 1;
const MAX_ITEMS = 500;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'key' });
        os.createIndex('ts', 'ts');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistToIndexedDB(key: string, hits: GeoHit[]): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.put({ key, ts: Date.now(), hits });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // trim
    await trimOld(db);
  } catch {
    // ignore
  }
}

async function trimOld(db: IDBDatabase) {
  const now = Date.now();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const idx = store.index('ts');
    const req = idx.openCursor();
    const toDelete: string[] = [];
    const items: { key: string; ts: number }[] = [];
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        const val = cursor.value as { key: string; ts: number };
        if (now - val.ts > TTL_MS) {
          toDelete.push(val.key);
        } else {
          items.push(val);
        }
        cursor.continue();
      } else {
        // delete expired
        for (const k of toDelete) store.delete(k);
        // enforce max
        if (items.length > MAX_ITEMS) {
          items
            .sort((a, b) => a.ts - b.ts)
            .slice(0, items.length - MAX_ITEMS)
            .forEach((v) => store.delete(v.key));
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function hydrateLRU(max = 100): Promise<{ key: string; hits: GeoHit[] }[]> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const now = Date.now();
        const vals = ((req.result as any[] | undefined) ?? []).filter((v) => now - v.ts <= TTL_MS);
        vals.sort((a, b) => b.ts - a.ts);
        resolve(vals.slice(0, max).map((v) => ({ key: v.key, hits: v.hits })));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
