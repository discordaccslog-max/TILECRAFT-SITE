/*
 * Tilecraft Digital — display settings
 *
 * Theme and interface scale, shared by the storefront and the Studio and
 * remembered in this browser. Every read and write is guarded, because site
 * data can be blocked or cleared and nothing here is important enough to
 * break a page over.
 */

const KEY = 'tilecraft:settings:v1';

const DEFAULTS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  scale: 'normal', // 'normal' | 'large'
  reducedMotion: 'system', // 'system' | 'reduce'
  walkthroughSeen: false,
  lastModule: null
};

let cache = null;

function read() {
  if (cache) return cache;
  cache = { ...DEFAULTS };
  try {
    const raw = globalThis.localStorage && localStorage.getItem(KEY);
    if (raw) Object.assign(cache, JSON.parse(raw));
  } catch {
    /* defaults are fine */
  }
  return cache;
}

function write(next) {
  cache = { ...read(), ...next };
  try {
    if (globalThis.localStorage) localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* the in-memory copy still applies for this page */
  }
  return cache;
}

/** Every setting. */
export function getSettings() {
  return { ...read() };
}

/** Change one or more settings and apply them to the document. */
export function setSettings(next) {
  const settings = write(next);
  applySettings();
  document.dispatchEvent(new CustomEvent('tilecraft:settingschange', { detail: { ...settings } }));
  return { ...settings };
}

/** True when the page is currently showing the dark theme. */
export function isDark() {
  const { theme } = read();
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/** True when motion should be suppressed. */
export function prefersReducedMotion() {
  if (read().reducedMotion === 'reduce') return true;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Write the settings onto the document element, where CSS reads them. */
export function applySettings() {
  const { theme, scale, reducedMotion } = read();
  const root = document.documentElement;

  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  if (scale === 'normal') root.removeAttribute('data-scale');
  else root.setAttribute('data-scale', scale);

  if (reducedMotion === 'reduce') root.setAttribute('data-motion', 'reduce');
  else root.removeAttribute('data-motion');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark() ? '#121020' : '#f7f2e8');

  document.dispatchEvent(new CustomEvent('tilecraft:themechange'));
}

/** Step the theme through light, dark, and following the system. */
export function cycleTheme() {
  const order = ['system', 'light', 'dark'];
  const current = read().theme;
  const next = order[(order.indexOf(current) + 1) % order.length];
  setSettings({ theme: next });
  return next;
}

/** A short label for the current theme setting. */
export function themeLabel(theme = read().theme) {
  if (theme === 'light') return 'Light';
  if (theme === 'dark') return 'Dark';
  return 'System';
}

export default { getSettings, setSettings, applySettings, cycleTheme, isDark, themeLabel, prefersReducedMotion };
