/*
 * Tilecraft Digital — shared page behavior
 *
 * Runs on every storefront page: the theme control, the small-screen menu,
 * the footer's year and support line, and the decorative canvases.
 *
 * Everything here enhances markup that already works without it. With
 * scripting switched off, every page still reads correctly and every link
 * still goes where it should.
 */

import { SITE, hasSupportEmail, supportEmail, supportMailto } from './site-config.js';
import { applySettings, cycleTheme, themeLabel, getSettings } from './settings.js';
import { drawComposition, liveCanvas, seedFrom } from './riso.js';

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

const SUN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>';

const MOON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/></svg>';

const SYSTEM =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M8.5 20.5h7"/></svg>';

function iconFor(theme) {
  if (theme === 'light') return SUN;
  if (theme === 'dark') return MOON;
  return SYSTEM;
}

function setUpThemeToggle() {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;

  const paint = () => {
    const { theme } = getSettings();
    button.innerHTML = iconFor(theme);
    button.setAttribute('aria-label', 'Change color theme. Currently: ' + themeLabel(theme));
    button.setAttribute('title', 'Theme: ' + themeLabel(theme));
  };

  button.addEventListener('click', () => {
    cycleTheme();
    paint();
  });

  document.addEventListener('tilecraft:settingschange', paint);
  paint();
}

/* ------------------------------------------------------------------ *
 * Small-screen menu
 * ------------------------------------------------------------------ */

function setUpNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (!toggle || !nav) return;

  const close = () => {
    nav.dataset.open = 'false';
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = nav.dataset.open === 'true';
    nav.dataset.open = open ? 'false' : 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.dataset.open === 'true') {
      close();
      toggle.focus();
    }
  });

  // A link inside the menu closes it, and so does growing past the breakpoint.
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  if (window.matchMedia) {
    const wide = window.matchMedia('(min-width: 60rem)');
    const sync = () => {
      if (wide.matches) close();
    };
    if (wide.addEventListener) wide.addEventListener('change', sync);
  }
}

/* ------------------------------------------------------------------ *
 * Current page marker
 * ------------------------------------------------------------------ */

function markCurrentPage() {
  const here = window.location.pathname.replace(/index\.html$/, '');
  for (const link of document.querySelectorAll('.nav__link, .nav__studio')) {
    const href = link.getAttribute('href');
    // Links to a section of another page are not "the current page", even
    // when that page is the one being read.
    if (href.includes('#')) continue;
    const target = new URL(href, window.location.href).pathname.replace(/index\.html$/, '');
    if (target !== '/' && here.startsWith(target)) link.setAttribute('aria-current', 'page');
  }
}

/* ------------------------------------------------------------------ *
 * Support address and year
 *
 * Contact details are rendered only when an address is configured. When
 * none is set, the line is left out entirely and nothing looks unfinished.
 * ------------------------------------------------------------------ */

export function renderSupportLines() {
  for (const slot of document.querySelectorAll('[data-support-email]')) {
    if (!hasSupportEmail()) {
      slot.remove();
      continue;
    }
    const label = slot.dataset.supportEmail || '';
    const link = document.createElement('a');
    link.href = supportMailto(slot.dataset.supportSubject || '');
    link.textContent = supportEmail();
    slot.textContent = '';
    if (label) slot.append(label + ' ');
    slot.append(link);
    slot.hidden = false;
  }
}

/**
 * The Contact page's channel block.
 *
 * The built page already carries whichever state matched the configuration
 * when it was generated. This keeps it right if site-config.js is edited
 * without rebuilding, so setting an address really is a one-file change.
 */
function renderContactBlock() {
  const block = document.querySelector('[data-contact-block]');
  if (!block || !hasSupportEmail()) return;

  const paragraph = document.createElement('p');
  paragraph.className = 'lede';
  paragraph.style.maxWidth = 'none';
  paragraph.append('Email ');

  const link = document.createElement('a');
  link.href = supportMailto('');
  link.textContent = supportEmail();
  paragraph.append(link, '.');

  block.textContent = '';
  block.append(paragraph);
}

function renderYear() {
  const year = String(new Date().getFullYear());
  for (const slot of document.querySelectorAll('[data-year]')) slot.textContent = year;
}

/* ------------------------------------------------------------------ *
 * Decorative canvases
 * ------------------------------------------------------------------ */

function setUpCanvases() {
  for (const canvas of document.querySelectorAll('canvas[data-riso]')) {
    const inks = (canvas.dataset.inks || 'pink,teal').split(',').map((s) => s.trim());
    const seed = seedFrom(canvas.dataset.riso || 'tilecraft');
    const paper = canvas.dataset.paper || '';
    liveCanvas(canvas, (element) =>
      drawComposition(element, { seed, inks, paper: paper || undefined })
    );
  }
}

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

export function start() {
  applySettings();
  setUpThemeToggle();
  setUpNav();
  markCurrentPage();
  renderSupportLines();
  renderContactBlock();
  renderYear();
  setUpCanvases();
  document.documentElement.dataset.siteReady = 'true';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

export { SITE };
