/*
 * Color contrast.
 *
 * The Accessibility page promises WCAG 2.1 AA for all running text in both
 * themes. This reads the color tokens straight out of the stylesheet and
 * checks that promise, so it cannot quietly stop being true.
 *
 * The two fluorescent inks are deliberately excluded from the text check:
 * they are used for graphics and large display type only, which is why the
 * readable --pink-text and --teal-text exist alongside them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

/* ------------------------------------------------------------------ *
 * Contrast arithmetic, straight from the WCAG definition
 * ------------------------------------------------------------------ */

function channels(color) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color.trim().replace(/^#/, ''));
  assert.ok(match, 'not a six-digit hex color: ' + color);
  return [match[1], match[2], match[3]].map((pair) => parseInt(pair, 16));
}

function relativeLuminance(color) {
  const [r, g, b] = channels(color).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

test('the contrast arithmetic matches the known reference values', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff') * 100) / 100, 21);
  assert.equal(Math.round(contrast('#ffffff', '#ffffff') * 100) / 100, 1);
  assert.equal(Math.round(contrast('#777777', '#ffffff') * 10) / 10, 4.5);
});

/* ------------------------------------------------------------------ *
 * Reading the tokens out of the stylesheet
 * ------------------------------------------------------------------ */

/**
 * The tokens declared in one block of the stylesheet.
 * @param {string} selector the exact selector text to read from
 */
function tokensFor(selector) {
  const index = css.indexOf(selector);
  assert.ok(index >= 0, 'no block found for ' + selector);
  const open = css.indexOf('{', index);
  const close = css.indexOf('}', open);
  const block = css.slice(open + 1, close);

  const tokens = {};
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const THEMES = {
  light: tokensFor(':root {'),
  dark: tokensFor(":root[data-theme='dark'] {")
};

const TEXT_TOKENS = ['--ink', '--ink-muted', '--ink-faint', '--pink-text', '--teal-text'];
const SURFACE_TOKENS = ['--paper', '--paper-raised', '--paper-sunk'];

test('both themes define every color token the site uses', () => {
  for (const [name, tokens] of Object.entries(THEMES)) {
    for (const token of [...TEXT_TOKENS, ...SURFACE_TOKENS, '--pink', '--teal']) {
      assert.ok(tokens[token], name + ' is missing ' + token);
      assert.match(tokens[token], /^#[0-9a-f]{6}$/i, name + ' ' + token + ' should be a hex color');
    }
  }
});

test('every text color clears AA on every surface, in both themes', () => {
  const failures = [];

  for (const [theme, tokens] of Object.entries(THEMES)) {
    for (const text of TEXT_TOKENS) {
      for (const surface of SURFACE_TOKENS) {
        const ratio = contrast(tokens[text], tokens[surface]);
        if (ratio < 4.5) {
          failures.push(
            theme + ': ' + text + ' on ' + surface + ' is ' + ratio.toFixed(2) + ':1'
          );
        }
      }
    }
  }

  assert.deepEqual(failures, [], 'contrast below 4.5:1:\n' + failures.join('\n'));
});

test('the inverted button clears AA both ways round', () => {
  for (const [theme, tokens] of Object.entries(THEMES)) {
    // .button paints --paper on --ink.
    const ratio = contrast(tokens['--paper'], tokens['--ink']);
    assert.ok(ratio >= 4.5, theme + ': the solid button is only ' + ratio.toFixed(2) + ':1');
  }
});

test('the dark print shop section clears AA', () => {
  // The Studio Editions band sets its own colors rather than using tokens.
  const background = '#0d0b18';
  for (const [name, color] of [
    ['body text', '#cdc7dc'],
    ['headings', '#f4efe3'],
    ['eyebrow', '#2fe3d6'],
    ['the featured flag', '#ff8ab6']
  ]) {
    const ratio = contrast(color, background);
    assert.ok(ratio >= 4.5, 'print shop ' + name + ' is only ' + ratio.toFixed(2) + ':1');
  }

  // The panels sit on a slightly lighter card.
  for (const [name, color] of [['panel text', '#cdc7dc'], ['panel price', '#2fe3d6']]) {
    const ratio = contrast(color, '#141127');
    assert.ok(ratio >= 4.5, name + ' is only ' + ratio.toFixed(2) + ':1');
  }
});

/*
 * The misregistration layers are the one place the fluorescent inks carry
 * letterforms. They are duplicates of the heading sitting at z-index -1,
 * behind a crisp layer in the text ink, and they are hidden from assistive
 * technology because they come from generated content. Nobody reads them;
 * they are the smudge of a second ink pass. The test below checks that they
 * really are only ever used on headings, which keeps this exemption honest.
 */
const OVERPRINT_LAYERS = ['.overprint::before', '.overprint::after'];

test('the overprint effect is only ever applied to headings', () => {
  const pages = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .flatMap((entry) => {
      const file = path.join(root, entry.name, 'index.html');
      return fs.existsSync(file) ? [file] : [];
    })
    .concat([path.join(root, 'index.html'), path.join(root, '404.html')]);

  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<([a-z0-9]+)[^>]*>\s*<span class="overprint"/g)) {
      assert.match(
        match[1],
        /^h[1-3]$/,
        path.relative(root, file) + ': overprint used inside <' + match[1] + '>'
      );
    }
  }
});

test('the fluorescent inks are never used for small text', () => {
  // They may appear as a border, a background, a bullet, or large display
  // type — but never as the color of a small run of text. Any rule that
  // sets `color: var(--pink)` or `var(--teal)` must also be large type.
  const offenders = [];

  for (const match of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = match[1].trim().split('\n').pop().trim();
    if (OVERPRINT_LAYERS.includes(selector)) continue;
    const body = match[2];
    const colored = /(?:^|[^-])\bcolor:\s*var\(--(pink|teal)\)/.exec(body);
    if (!colored) continue;

    const size = /font-size:\s*([^;]+);/.exec(body);
    const isLarge =
      size &&
      (/var\(--step-[2-9]\)/.test(size[1]) ||
        /clamp\([^)]*\b([2-9]|1[0-9])(\.\d+)?rem/.test(size[1]) ||
        /(\d+(\.\d+)?)rem/.test(size[1]) && Number(/(\d+(\.\d+)?)rem/.exec(size[1])[1]) >= 1.5);

    if (!isLarge) offenders.push(selector + ' uses --' + colored[1] + ' as a text color');
  }

  assert.deepEqual(offenders, [], 'fluorescent ink used for small text:\n' + offenders.join('\n'));
});

test('focus is always visible, and never removed without a replacement', () => {
  assert.ok(/:focus-visible\s*\{[^}]*outline:\s*3px solid/.test(css), 'there must be a focus ring');

  const removals = [...css.matchAll(/([^{}]+)\{([^}]*outline:\s*(?:none|0)[^}]*)\}/g)];
  for (const [, selector, body] of removals) {
    const name = selector.trim().split('\n').pop().trim();
    // Removing the ring is only acceptable where the element is not a focus
    // target in its own right.
    assert.ok(
      /\.studio__workspace:focus\b/.test(name),
      'focus outline removed for ' + name + ': ' + body.trim()
    );
  }
});
