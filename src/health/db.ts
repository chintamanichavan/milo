import type { Day, Workout } from './types';

/**
 * The heavy half of HEALTH lives in IndexedDB: one row a day, one per
 * workout. A tiny typed wrapper, opened per call like the photo store.
 */
const DB = 'milo-health';

interface Stores {
  days: Day;
  workouts: Workout;
}
type Name = keyof Stores;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('days', { keyPath: 'date' });
      request.result.createObjectStore('workouts', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(name: Name, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const request = work(tx.objectStore(name));
      tx.oncomplete = () => resolve(request ? request.result : (undefined as T));
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const getAll = <N extends Name>(name: N): Promise<Stores[N][]> =>
  run(name, 'readonly', (s) => s.getAll() as IDBRequest<Stores[N][]>);

export const count = (name: Name): Promise<number> => run(name, 'readonly', (s) => s.count());

/** writes rows as given; the same key replaces what was there */
export const putAll = <N extends Name>(name: N, rows: Stores[N][]): Promise<void> =>
  run(name, 'readwrite', (s) => {
    for (const row of rows) s.put(row);
  });

export const clear = (name: Name): Promise<void> => run(name, 'readwrite', (s) => void s.clear());
