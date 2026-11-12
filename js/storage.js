/*
 * Tilecraft Digital — saved work
 *
 * Studio modules keep their saved work in IndexedDB, in this browser and
 * nowhere else. Each module receives a storage helper scoped to its own
 * product, so one module can neither read nor overwrite another's work.
 *
 * Everything is keyed as "<slug>:<key>" in a single object store, with an
 * index on the slug. That makes a module's own data easy to list and makes
 * the whole store easy to write into a backup file.
 */

const DB_NAME = 'tilecraft';
const DB_VERSION = 1;
const STORE = 'work';

let dbPromise = null;

/** Open the database, creating it the first time. */
export function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('This browser has no IndexedDB, so saved work cannot be kept.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('slug', 'slug', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the database.'));
    request.onblocked = () => reject(new Error('Another tab is holding the database open.'));
  });

  return dbPromise;
}

function transact(mode, run) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        try {
          result = run(store);
        } catch (error) {
          reject(error);
          return;
        }
        tx.oncomplete = () => resolve(result && result.value !== undefined ? result.value : result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('The write was abandoned.'));
      })
  );
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Every record in the store, for a backup. */
export async function exportAll() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Write records from a backup, replacing any with the same key. */
export async function importAll(records) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    let written = 0;
    for (const record of Array.isArray(records) ? records : []) {
      if (!record || typeof record.id !== 'string' || typeof record.slug !== 'string') continue;
      store.put({
        id: record.id,
        slug: record.slug,
        key: typeof record.key === 'string' ? record.key : record.id.slice(record.slug.length + 1),
        value: record.value,
        updatedAt: record.updatedAt || new Date().toISOString()
      });
      written++;
    }
    tx.oncomplete = () => resolve(written);
    tx.onerror = () => reject(tx.error);
  });
}

/** Delete every record belonging to one product. */
export async function clearSlug(slug) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const index = tx.objectStore(STORE).index('slug');
    const req = index.openCursor(IDBKeyRange.only(slug));
    let removed = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      cursor.delete();
      removed++;
      cursor.continue();
    };
    tx.oncomplete = () => resolve(removed);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * A storage helper scoped to one product.
 *
 * Every method returns a promise. Keys are the module's own, and are kept
 * apart from every other module's by the slug prefix.
 */
export function scopedStorage(slug) {
  const prefix = slug + ':';
  const idFor = (key) => prefix + String(key);

  return {
    slug,

    /** Read one value, or undefined. */
    async get(key) {
      const db = await openDatabase();
      const tx = db.transaction(STORE, 'readonly');
      const record = await request(tx.objectStore(STORE).get(idFor(key)));
      return record ? record.value : undefined;
    },

    /** Write one value. Anything structured-cloneable may be stored. */
    async set(key, value) {
      await transact('readwrite', (store) =>
        store.put({
          id: idFor(key),
          slug,
          key: String(key),
          value,
          updatedAt: new Date().toISOString()
        })
      );
      return value;
    },

    /** Remove one value. */
    async remove(key) {
      await transact('readwrite', (store) => store.delete(idFor(key)));
    },

    /** Every key this product has stored. */
    async keys() {
      const db = await openDatabase();
      const tx = db.transaction(STORE, 'readonly');
      const records = await request(tx.objectStore(STORE).index('slug').getAll(IDBKeyRange.only(slug)));
      return (records || []).map((record) => record.key);
    },

    /** Every key and value this product has stored. */
    async entries() {
      const db = await openDatabase();
      const tx = db.transaction(STORE, 'readonly');
      const records = await request(tx.objectStore(STORE).index('slug').getAll(IDBKeyRange.only(slug)));
      return (records || []).map((record) => [record.key, record.value]);
    },

    /** Remove everything this product has stored. */
    async clear() {
      return clearSlug(slug);
    }
  };
}

/* ------------------------------------------------------------------ *
 * Persistent storage
 * ------------------------------------------------------------------ */

/** Whether the browser has promised to keep this site's data. */
export async function storagePersisted() {
  try {
    if (navigator.storage && navigator.storage.persisted) return await navigator.storage.persisted();
  } catch {
    /* treated as not persisted */
  }
  return false;
}

/** Ask the browser to keep this site's data. Returns whether it agreed. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch {
    /* treated as refused */
  }
  return false;
}

/** How much room the browser is giving this site, when it will say. */
export async function storageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) return await navigator.storage.estimate();
  } catch {
    /* no estimate available */
  }
  return null;
}

export default { openDatabase, scopedStorage, exportAll, importAll, clearSlug, storagePersisted, requestPersistentStorage, storageEstimate };
