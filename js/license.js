/*
 * Tilecraft Digital — license codes, validation, and device activation.
 *
 * Everything here runs in the browser. There is no server and no database.
 * A license code is self-describing: it carries the product it belongs to and
 * a checksum over its own contents, so the browser can tell a well-formed
 * code from a mistyped one without asking anything else.
 *
 * Code shape
 *
 *   TILE-GMTR-K7N4PXBM-QM
 *   ^^^^ ^^^^ ^^^^^^^^ ^^
 *   |    |    |        checksum, 2 characters, over the product and random
 *   |    |    random section, 8 characters
 *   |    product code, 4 characters (see js/products.js)
 *   fixed prefix
 *
 * The three variable sections use a 31-character alphabet that leaves out
 * every pair a person could misread when copying a code by hand: no 0 or O,
 * and no 1, I, or L. The TILE prefix is a fixed literal, matched before the
 * rest of the code is checked against the alphabet, so the letters in it
 * never have to be told apart from anything.
 *
 * Codes are read back leniently: case is ignored, and dashes, spaces, and
 * other separators are discarded. They are always shown in the dashed form
 * above.
 */

import { SITE } from './site-config.js';
import { productByCode, grantsFor, chosenOptions } from './products.js';

/** Characters a license code's variable sections may use. */
export const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const PREFIX = SITE.licensePrefix;
export const PRODUCT_LEN = 4;
export const RANDOM_LEN = 8;
export const CHECKSUM_LEN = 2;

const STORAGE_KEY = 'tilecraft:licenses:v1';

/* ------------------------------------------------------------------ *
 * Hashing
 *
 * A small 32-bit mixing function. It is used for the checksum and for
 * deriving a code from an order reference. It is not a security
 * primitive and is not used as one: license codes are a convenience for
 * buyers, not an access control boundary.
 * ------------------------------------------------------------------ */

function hash32(input, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
    h = ((h << 13) | (h >>> 19)) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * Checksum
 * ------------------------------------------------------------------ */

/**
 * The checksum characters for a code body.
 *
 * The alphabet has 31 characters and 31 is prime, so each character can be
 * read as a number in the finite field GF(31) and the two checksum
 * characters computed as the parity symbols of a Reed-Solomon code
 * over that field. Written this way the code has a minimum distance of 3,
 * which means it detects *every* single wrong character and *every* pair of
 * wrong characters — including every transposition — rather than merely
 * almost all of them, which is what a hash folded down to two characters
 * would give.
 *
 * The two parity symbols satisfy, over the whole codeword:
 *
 *     sum of the symbols                     = 0  (mod 31)
 *     sum of each symbol times its position  = 0  (mod 31)
 *
 * @param {string} productCode four-character product code
 * @param {string} randomSection six-character random section
 * @returns {string} two characters from ALPHABET
 */
export function checksumFor(productCode, randomSection) {
  const body = (String(productCode) + String(randomSection)).toUpperCase();
  const n = ALPHABET.length; // 31, prime
  const m = body.length;

  if (m + 2 >= n) throw new Error('checksumFor: a code body of ' + m + ' is too long');

  let plain = 0; // sum of the symbols
  let weighted = 0; // sum of symbol x position

  for (let i = 0; i < m; i++) {
    const value = ALPHABET.indexOf(body[i]);
    if (value < 0) throw new Error('checksumFor: ' + body[i] + ' is not in the alphabet');
    plain = (plain + value) % n;
    weighted = (weighted + (i + 1) * value) % n;
  }

  // The two parity symbols sit at positions m+1 and m+2. Solving the pair of
  // checks above for them gives:
  const second = ((m + 1) * plain - weighted) % n;
  const first = (weighted - (m + 2) * plain) % n;

  return ALPHABET[((first % n) + n) % n] + ALPHABET[((second % n) + n) % n];
}

/* ------------------------------------------------------------------ *
 * Building codes
 * ------------------------------------------------------------------ */

function randomBytes(n) {
  const out = new Uint8Array(n);
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/** A uniformly random section of RANDOM_LEN characters from ALPHABET. */
export function randomSection(length = RANDOM_LEN) {
  const n = ALPHABET.length;
  // 248 is the largest multiple of 31 below 256; values at or above it are
  // discarded so that every character stays equally likely.
  const limit = Math.floor(256 / n) * n;
  let out = '';
  while (out.length < length) {
    const bytes = randomBytes(length * 2);
    for (let i = 0; i < bytes.length && out.length < length; i++) {
      if (bytes[i] < limit) out += ALPHABET[bytes[i] % n];
    }
  }
  return out;
}

/**
 * A section derived from an order reference, so that the same order always
 * produces the same license code for the same product.
 */
export function sectionFromOrder(productCode, orderId, length = RANDOM_LEN) {
  const base = PREFIX + '|' + String(productCode).toUpperCase() + '|' + String(orderId);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[hash32(base + '|' + i, 0x9e3779b9) % ALPHABET.length];
  }
  return out;
}

/** Join the parts of a code into its canonical dashed form. */
export function formatCode(productCode, randomPart, checksum) {
  return [PREFIX, String(productCode).toUpperCase(), String(randomPart).toUpperCase(), String(checksum).toUpperCase()].join('-');
}

/**
 * Generate a license code for a product.
 *
 * @param {object|string} product a catalog product, or a four-character code
 * @param {object} [options]
 * @param {string} [options.orderId] when present, the code is derived from it,
 *        so re-running this for the same order yields the same code
 * @returns {string} a canonical, dashed license code
 */
export function generateCode(product, options = {}) {
  const productCode = (typeof product === 'string' ? product : product && product.code || '').toUpperCase();
  if (!isValidProductCode(productCode)) {
    throw new Error('generateCode: invalid product code ' + JSON.stringify(productCode));
  }
  const orderId = options.orderId ? String(options.orderId).trim() : '';
  const part = orderId ? sectionFromOrder(productCode, orderId) : randomSection();
  return formatCode(productCode, part, checksumFor(productCode, part));
}

function isValidProductCode(code) {
  if (typeof code !== 'string' || code.length !== PRODUCT_LEN) return false;
  for (const ch of code) if (!ALPHABET.includes(ch)) return false;
  return true;
}

/* ------------------------------------------------------------------ *
 * Reading codes back
 * ------------------------------------------------------------------ */

/**
 * Parse a code typed, pasted, or scanned by a buyer.
 *
 * Case is ignored and separators are discarded. The result always reports
 * why a code was rejected, so callers can say something useful.
 *
 * @returns {{valid: boolean, reason: string, code: string|null,
 *            productCode: string|null, random: string|null,
 *            checksum: string|null, product: object|null, known: boolean}}
 */
export function parseCode(input) {
  const fail = (reason) => ({
    valid: false,
    reason,
    code: null,
    productCode: null,
    random: null,
    checksum: null,
    product: null,
    known: false
  });

  if (typeof input !== 'string' || !input.trim()) return fail('empty');

  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned.startsWith(PREFIX)) return fail('prefix');

  const body = cleaned.slice(PREFIX.length);
  const expected = PRODUCT_LEN + RANDOM_LEN + CHECKSUM_LEN;
  if (body.length !== expected) return fail(body.length < expected ? 'too-short' : 'too-long');

  for (const ch of body) {
    if (!ALPHABET.includes(ch)) return fail('character');
  }

  const productCode = body.slice(0, PRODUCT_LEN);
  const random = body.slice(PRODUCT_LEN, PRODUCT_LEN + RANDOM_LEN);
  const checksum = body.slice(PRODUCT_LEN + RANDOM_LEN);

  if (checksumFor(productCode, random) !== checksum) return fail('checksum');

  const product = productByCode(productCode);
  return {
    valid: true,
    reason: 'ok',
    code: formatCode(productCode, random, checksum),
    productCode,
    random,
    checksum,
    product: product,
    known: !!product
  };
}

/** True when a code is well formed and its checksum matches. */
export function isValidCode(input) {
  return parseCode(input).valid;
}

/** The canonical dashed form of a code, or null when it is not valid. */
export function canonicalize(input) {
  return parseCode(input).code;
}

/** A short, plain explanation of why a code was rejected. */
export function reasonText(reason) {
  switch (reason) {
    case 'empty':
      return 'Enter a license code.';
    case 'prefix':
      return 'That does not look like a Tilecraft Digital license code. Codes begin with ' + PREFIX + '.';
    case 'too-short':
      return 'That code is too short. A full code has ' + (PRODUCT_LEN + RANDOM_LEN + CHECKSUM_LEN) + ' characters after ' + PREFIX + '.';
    case 'too-long':
      return 'That code is too long. A full code has ' + (PRODUCT_LEN + RANDOM_LEN + CHECKSUM_LEN) + ' characters after ' + PREFIX + '.';
    case 'character':
      return 'That code contains a character license codes never use. Codes never include 0, O, 1, I, or L after the prefix.';
    case 'checksum':
      return 'That code did not check out, so a character is probably wrong. Compare it against your certificate.';
    case 'unknown-product':
      return 'That code is for a product that is not in the catalog.';
    default:
      return 'That code could not be read.';
  }
}

/* ------------------------------------------------------------------ *
 * Activation links
 *
 * The code sits in the fragment, after the "#", which browsers never send
 * to the web server. An activation link therefore reveals nothing to us.
 * ------------------------------------------------------------------ */

/** The absolute activation link for a code. */
export function activationUrl(code, origin = SITE.origin) {
  return String(origin).replace(/\/+$/, '') + '/studio/#activate=' + encodeURIComponent(code);
}

/** Pull a license code out of a location hash, or return null. */
export function codeFromHash(hash) {
  if (typeof hash !== 'string') return null;
  const frag = hash.replace(/^#/, '');
  if (!frag) return null;
  const params = new URLSearchParams(frag);
  const raw = params.get('activate');
  if (!raw) return null;
  const parsed = parseCode(raw);
  return parsed.valid ? parsed.code : null;
}

/* ------------------------------------------------------------------ *
 * Order references
 * ------------------------------------------------------------------ */

/** Query keys payment providers use for an order or session reference. */
export const ORDER_PARAM_KEYS = [
  'session_id',
  'order_id',
  'order',
  'transaction_id',
  'txn_id',
  'token'
];

/**
 * Read the extras a confirmation link carries.
 *
 * The selection travels as ?options=a,b beside the order reference. It is
 * only a list of ids here; which of them a product actually offers is
 * settled when the record is built.
 *
 * @returns {string[]}
 */
export function optionsFromUrl(url) {
  try {
    const u = new URL(String(url), SITE.origin);
    const raw = u.searchParams.get('options') || new URLSearchParams(u.hash.replace(/^#/, '')).get('options');
    return raw ? raw.split(',').map((id) => id.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Read an order reference out of a URL's query string or fragment.
 * The first key present, in the order above, wins.
 * @returns {string|null}
 */
export function orderRefFromUrl(url) {
  let search = '';
  let hash = '';
  try {
    const u = new URL(String(url), SITE.origin);
    search = u.search;
    hash = u.hash;
  } catch {
    return null;
  }
  const sources = [new URLSearchParams(search.replace(/^\?/, ''))];
  if (hash && hash.length > 1) sources.push(new URLSearchParams(hash.replace(/^#/, '')));
  for (const key of ORDER_PARAM_KEYS) {
    for (const params of sources) {
      const value = params.get(key);
      if (value && value.trim()) return value.trim();
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Storage
 *
 * Licenses live in this browser's localStorage and nowhere else. When
 * storage is unavailable — a private window, or site data blocked — the
 * store falls back to memory for the life of the page so that nothing
 * throws and the Studio still works for the current session.
 * ------------------------------------------------------------------ */

const memoryStore = new Map();

function readRaw(key) {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const value = ls.getItem(key);
      return value === null ? (memoryStore.has(key) ? memoryStore.get(key) : null) : value;
    }
  } catch {
    /* fall through to memory */
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

function writeRaw(key, value) {
  memoryStore.set(key, value);
  try {
    const ls = globalThis.localStorage;
    if (ls) ls.setItem(key, value);
  } catch {
    /* memory copy already holds it */
  }
}

/** True when this browser will keep licenses after the tab closes. */
export function storageIsPersistent() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return false;
    const probe = 'tilecraft:probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function loadAll() {
  const raw = readRaw(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.code === 'string') : [];
  } catch {
    return [];
  }
}

function saveAll(records) {
  writeRaw(STORAGE_KEY, JSON.stringify(records));
}

/** Every license held on this device, oldest first. */
export function listLicenses() {
  return loadAll().map((r) => ({ ...r }));
}

/** One license by code, or null. */
export function getLicense(code) {
  const canonical = canonicalize(code);
  if (!canonical) return null;
  const found = loadAll().find((r) => r.code === canonical);
  return found ? { ...found } : null;
}

/** Build a license record for a product without storing it. */
export function buildRecord(product, options = {}) {
  const code = options.code ? canonicalize(options.code) : generateCode(product, { orderId: options.orderRef });
  if (!code) throw new Error('buildRecord: invalid code');
  return {
    code,
    slug: product.slug,
    productCode: product.code,
    productName: product.name,
    tier: product.tier,
    grants: grantsFor(product),
    // The extras bought with it, filtered against what the product
    // actually offers, so nothing can be added by editing a link.
    options: chosenOptions(product, options.options).map((o) => o.id),
    issuedAt: options.issuedAt || new Date().toISOString(),
    orderRef: options.orderRef ? String(options.orderRef) : null,
    licensee: options.licensee ? String(options.licensee).trim() : null
  };
}

/**
 * Activate a license code on this device.
 *
 * @param {string} input a code in any readable form
 * @param {object} [options] orderRef, licensee, issuedAt
 * @returns {{ok: boolean, reason: string, license: object|null, already: boolean}}
 */
export function activate(input, options = {}) {
  const parsed = parseCode(input);
  if (!parsed.valid) return { ok: false, reason: parsed.reason, license: null, already: false };
  if (!parsed.known) return { ok: false, reason: 'unknown-product', license: null, already: false };

  const records = loadAll();
  const existing = records.find((r) => r.code === parsed.code);
  if (existing) {
    let changed = false;
    if (options.orderRef && !existing.orderRef) {
      existing.orderRef = String(options.orderRef);
      changed = true;
    }
    if (options.licensee && !existing.licensee) {
      existing.licensee = String(options.licensee).trim();
      changed = true;
    }
    // Extras are added to what is already held rather than replacing it,
    // so opening an older confirmation link cannot take one away.
    if (options.options) {
      const held = new Set(existing.options || []);
      const before = held.size;
      for (const option of chosenOptions(parsed.product, options.options)) held.add(option.id);
      if (held.size !== before) {
        existing.options = [...held];
        changed = true;
      }
    }
    if (changed) saveAll(records);
    return { ok: true, reason: 'already-active', license: { ...existing }, already: true };
  }

  const record = buildRecord(parsed.product, { ...options, code: parsed.code });
  records.push(record);
  saveAll(records);
  return { ok: true, reason: 'activated', license: { ...record }, already: false };
}

/** Remove a license from this device. Returns true when one was removed. */
export function removeLicense(code) {
  const canonical = canonicalize(code);
  if (!canonical) return false;
  const records = loadAll();
  const next = records.filter((r) => r.code !== canonical);
  if (next.length === records.length) return false;
  saveAll(next);
  return true;
}

/** Set or clear the licensee name shown on a certificate. */
export function setLicensee(code, licensee) {
  const canonical = canonicalize(code);
  if (!canonical) return null;
  const records = loadAll();
  const record = records.find((r) => r.code === canonical);
  if (!record) return null;
  const name = typeof licensee === 'string' ? licensee.trim() : '';
  record.licensee = name || null;
  saveAll(records);
  return { ...record };
}

/** Every product slug unlocked on this device. */
export function unlockedSlugs() {
  const set = new Set();
  for (const record of loadAll()) {
    const grants = Array.isArray(record.grants) && record.grants.length ? record.grants : [record.slug];
    for (const slug of grants) if (slug) set.add(slug);
  }
  return set;
}

/** True when a product slug is unlocked on this device. */
export function isUnlocked(slug) {
  return unlockedSlugs().has(slug);
}

/**
 * The extras held for a product, from every license that unlocks it.
 *
 * A Collection can be unlocked by its own license or by a bundle, and the
 * extras may have been bought with either, so both are considered. An
 * extra bought once is held for good: it is not taken away by buying the
 * same thing again without it.
 *
 * @returns {Set<string>} option ids
 */
export function optionsHeldFor(slug) {
  const held = new Set();
  for (const record of loadAll()) {
    const grants = Array.isArray(record.grants) && record.grants.length ? record.grants : [record.slug];
    if (!grants.includes(slug)) continue;
    for (const id of record.options || []) held.add(id);
  }
  return held;
}

/** Whether a product has a given extra on this device. */
export function hasOption(slug, optionId) {
  return optionsHeldFor(slug).has(optionId);
}

/** The license record that unlocks a slug, or null. */
export function licenseFor(slug) {
  const records = loadAll();
  for (const record of records) {
    const grants = Array.isArray(record.grants) && record.grants.length ? record.grants : [record.slug];
    if (grants.includes(slug)) return { ...record };
  }
  return null;
}

/** Replace the whole license store. Used by backup import. */
export function replaceAll(records) {
  const cleaned = [];
  const seen = new Set();
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || typeof record.code !== 'string') continue;
    const parsed = parseCode(record.code);
    if (!parsed.valid || !parsed.known) continue;
    if (seen.has(parsed.code)) continue;
    seen.add(parsed.code);
    cleaned.push({
      ...buildRecord(parsed.product, {
        code: parsed.code,
        issuedAt: record.issuedAt,
        orderRef: record.orderRef,
        licensee: record.licensee
      })
    });
  }
  saveAll(cleaned);
  return cleaned.map((r) => ({ ...r }));
}

/** Add licenses from a backup without discarding what is already here. */
export function mergeLicenses(records) {
  let added = 0;
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || typeof record.code !== 'string') continue;
    const before = loadAll().length;
    const result = activate(record.code, {
      issuedAt: record.issuedAt,
      orderRef: record.orderRef,
      licensee: record.licensee
    });
    if (result.ok && loadAll().length > before) added++;
  }
  return added;
}

/** Forget every license on this device. */
export function clearLicenses() {
  saveAll([]);
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

/** A license's issue date and time, written out for people. */
export function formatIssued(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return date + ' at ' + time;
}

/** A license's issue date alone, written out for people. */
export function formatIssuedDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
