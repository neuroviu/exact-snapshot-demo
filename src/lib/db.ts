// Minimal IndexedDB wrapper for encounters (persists across app restarts).
import type { Encounter } from "./bridge";

const DB = "neuroviu-bridge";
const STORE = "encounters";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise((res, rej) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => res(req ? (req.result as T) : undefined);
        t.onerror = () => rej(t.error);
      }),
  );
}

export async function getAll(): Promise<Encounter[]> {
  const list = (await tx<Encounter[]>("readonly", (s) => s.getAll())) ?? [];
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function putMany(list: Encounter[]) {
  await tx("readwrite", (s) => { list.forEach((e) => s.put(e)); });
}
export async function persistStorage() {
  try { await navigator.storage?.persist?.(); } catch {}
}
