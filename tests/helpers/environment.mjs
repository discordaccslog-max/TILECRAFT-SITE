/*
 * A small browser environment for the test runner.
 *
 * The site's modules are written for a browser, so the tests give them the
 * handful of browser things they touch: localStorage, enough of document to
 * let the settings module write theme attributes, and an in-memory
 * IndexedDB covering exactly the API that js/storage.js uses.
 *
 * Import this file before importing anything from js/.
 */

/* ------------------------------------------------------------------ *
 * localStorage
 * ------------------------------------------------------------------ */

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }
  setItem(key, value) {
    this.map.set(String(key), String(value));
  }
  removeItem(key) {
    this.map.delete(String(key));
  }
  clear() {
    this.map.clear();
  }
  key(index) {
    return [...this.map.keys()][index] ?? null;
  }
  get length() {
    return this.map.size;
  }
}

/* ------------------------------------------------------------------ *
 * document
 * ------------------------------------------------------------------ */

function makeElement(tag = 'div') {
  const attributes = new Map();
  return {
    tagName: String(tag).toUpperCase(),
    dataset: {},
    classList: {
      _set: new Set(),
      add(name) {
        this._set.add(name);
      },
      remove(name) {
        this._set.delete(name);
      },
      contains(name) {
        return this._set.has(name);
      }
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    append() {},
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

function makeDocument() {
  const listeners = new Map();
  return {
    documentElement: makeElement('html'),
    body: makeElement('body'),
    createElement: makeElement,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      if (listeners.has(type)) listeners.get(type).delete(handler);
    },
    dispatchEvent(event) {
      for (const handler of listeners.get(event.type) || []) handler(event);
      return true;
    }
  };
}

/* ------------------------------------------------------------------ *
 * IndexedDB
 *
 * Enough of the API for js/storage.js: open with an upgrade, an object
 * store with a keyPath and one index, and get / getAll / put / delete /
 * openCursor inside a transaction. Requests resolve on a later tick so
 * that the success and complete handlers run in the right order.
 * ------------------------------------------------------------------ */

function makeRequest(run) {
  const request = { onsuccess: null, onerror: null, result: undefined, error: null };
  queueMicrotask(() => {
    try {
      request.result = run();
      if (request.onsuccess) request.onsuccess({ target: request });
    } catch (error) {
      request.error = error;
      if (request.onerror) request.onerror({ target: request });
    }
  });
  return request;
}

class FakeKeyRange {
  constructor(value) {
    this.value = value;
  }
  includes(other) {
    return other === this.value;
  }
  static only(value) {
    return new FakeKeyRange(value);
  }
}

class FakeIndex {
  constructor(store, keyPath) {
    this.store = store;
    this.keyPath = keyPath;
  }

  _matching(range) {
    const rows = [...this.store.rows.values()];
    if (range == null) return rows;
    const wanted = range instanceof FakeKeyRange ? range.value : range;
    return rows.filter((row) => row[this.keyPath] === wanted);
  }

  getAll(range) {
    return makeRequest(() => this._matching(range).map((row) => structuredClone(row)));
  }

  openCursor(range) {
    const matches = this._matching(range);
    const request = { onsuccess: null, onerror: null, result: null };
    let index = 0;

    const step = () => {
      queueMicrotask(() => {
        if (index >= matches.length) {
          request.result = null;
          if (request.onsuccess) request.onsuccess({ target: request });
          return;
        }
        const row = matches[index++];
        request.result = {
          value: structuredClone(row),
          delete: () => {
            this.store.rows.delete(row[this.store.keyPath]);
          },
          continue: step
        };
        if (request.onsuccess) request.onsuccess({ target: request });
      });
    };

    step();
    return request;
  }
}

class FakeObjectStore {
  constructor(name, keyPath) {
    this.name = name;
    this.keyPath = keyPath;
    this.rows = new Map();
    this.indexes = new Map();
  }
  createIndex(name, keyPath) {
    const index = new FakeIndex(this, keyPath);
    this.indexes.set(name, index);
    return index;
  }
  index(name) {
    const found = this.indexes.get(name);
    if (!found) throw new Error('no such index: ' + name);
    return found;
  }
}

class FakeStoreHandle {
  constructor(store, transaction) {
    this.store = store;
    this.transaction = transaction;
  }
  get(key) {
    this.transaction._touch();
    return makeRequest(() => {
      const row = this.store.rows.get(key);
      return row ? structuredClone(row) : undefined;
    });
  }
  getAll() {
    this.transaction._touch();
    return makeRequest(() => [...this.store.rows.values()].map((row) => structuredClone(row)));
  }
  put(value) {
    this.transaction._touch();
    return makeRequest(() => {
      const row = structuredClone(value);
      this.store.rows.set(row[this.store.keyPath], row);
      return row[this.store.keyPath];
    });
  }
  delete(key) {
    this.transaction._touch();
    return makeRequest(() => {
      this.store.rows.delete(key);
      return undefined;
    });
  }
  index(name) {
    this.transaction._touch();
    return this.store.index(name);
  }
}

class FakeTransaction {
  constructor(db, storeNames) {
    this.db = db;
    this.storeNames = [].concat(storeNames);
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this.error = null;
    this._pending = 0;
    this._settled = false;
    // Complete once the microtask queue has drained, which is after every
    // request made synchronously inside the transaction has resolved.
    queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => this._finish())));
  }
  _touch() {
    this._pending++;
  }
  _finish() {
    if (this._settled) return;
    this._settled = true;
    if (this.oncomplete) this.oncomplete({ target: this });
  }
  objectStore(name) {
    const store = this.db.stores.get(name);
    if (!store) throw new Error('no such store: ' + name);
    return new FakeStoreHandle(store, this);
  }
}

class FakeDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.stores = new Map();
  }
  get objectStoreNames() {
    const names = [...this.stores.keys()];
    return { contains: (name) => names.includes(name), length: names.length };
  }
  createObjectStore(name, options = {}) {
    const store = new FakeObjectStore(name, options.keyPath || 'id');
    this.stores.set(name, store);
    return store;
  }
  transaction(storeNames) {
    return new FakeTransaction(this, storeNames);
  }
  close() {}
}

class FakeIndexedDB {
  constructor() {
    this.databases = new Map();
  }
  open(name, version) {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      onblocked: null,
      result: null,
      error: null
    };

    queueMicrotask(() => {
      let db = this.databases.get(name);
      const isNew = !db || db.version < version;
      if (!db) {
        db = new FakeDatabase(name, version);
        this.databases.set(name, db);
      }
      request.result = db;
      if (isNew && request.onupgradeneeded) {
        db.version = version;
        request.onupgradeneeded({ target: request });
      }
      if (request.onsuccess) request.onsuccess({ target: request });
    });

    return request;
  }
  deleteDatabase(name) {
    this.databases.delete(name);
    return makeRequest(() => undefined);
  }
}

/* ------------------------------------------------------------------ *
 * Install
 * ------------------------------------------------------------------ */

if (!globalThis.localStorage) globalThis.localStorage = new MemoryStorage();
if (!globalThis.document) globalThis.document = makeDocument();
if (!globalThis.window) globalThis.window = globalThis;
if (!globalThis.indexedDB) globalThis.indexedDB = new FakeIndexedDB();
if (!globalThis.IDBKeyRange) globalThis.IDBKeyRange = FakeKeyRange;

if (!globalThis.CustomEvent) {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
}

if (!globalThis.matchMedia) {
  globalThis.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  });
}

/** Empty every store, so each test starts from nothing. */
export function resetEnvironment() {
  globalThis.localStorage.clear();
  if (globalThis.indexedDB instanceof FakeIndexedDB) {
    for (const db of globalThis.indexedDB.databases.values()) {
      for (const store of db.stores.values()) store.rows.clear();
    }
  }
}

export default { resetEnvironment };
