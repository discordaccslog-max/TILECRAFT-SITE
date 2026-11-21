/*
 * Colorway Studio
 *
 * Builds palettes and tries them on real patterns. A palette here is the
 * same four slots every pattern in the shop uses — background, ink and two
 * accents — so a palette built here drops straight into any Collection.
 *
 * Palettes can be built by hand, generated from a base colour by ordinary
 * colour-wheel relationships, or lifted from an image the buyer brings in.
 * That image is read by this browser and nothing else: it is drawn to a
 * canvas on the machine and never sent anywhere.
 *
 * See MODULES.md for the contract this implements.
 */

import { el, loadStyles, field, slider, segmented, status, guard } from '../_shared/ui.mjs';
import { createStage } from '../_shared/viewer.mjs';
import { loadCollection, asPattern, renderTile, tileDataUri } from '../_shared/render.mjs';
import { makeZip } from '../_shared/zip.mjs';
import { licenseNote, safeName } from '../_shared/export.mjs';

const SLOTS = [
  { id: 'bg', label: 'Background' },
  { id: 'ink', label: 'Ink' },
  { id: 'accent', label: 'Accent' },
  { id: 'accent2', label: 'Second accent' }
];

const HARMONIES = [
  { value: 'complement', label: 'Complement' },
  { value: 'analogous', label: 'Analogous' },
  { value: 'triad', label: 'Triad' },
  { value: 'tonal', label: 'Tonal' }
];

/* ------------------------------------------------------------------ *
 * Colour maths
 * ------------------------------------------------------------------ */

function hexToRgb(hex) {
  const v = String(hex).replace('#', '');
  const full = v.length === 3 ? [...v].map((c) => c + c).join('') : v;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0
  ];
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h, s, l) {
  const hue = ((h % 1) + 1) % 1;
  const sat = Math.max(0, Math.min(1, s));
  const lum = Math.max(0, Math.min(1, l));

  if (sat === 0) {
    const v = lum * 255;
    return rgbToHex(v, v, v);
  }

  const q = lum < 0.5 ? lum * (1 + sat) : lum + sat - lum * sat;
  const p = 2 * lum - q;
  const channel = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return rgbToHex(channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255);
}

/** Relative luminance, for deciding whether a ground is light or dark. */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio between two colours. */
function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * A four-slot palette built from one colour by an ordinary colour-wheel
 * relationship. The background is pulled to one end of the scale and the
 * ink to the other, so the result is usable rather than merely pretty.
 */
function harmonise(base, kind, dark) {
  const [h, s, l] = rgbToHsl(...hexToRgb(base));
  const sat = Math.max(0.12, Math.min(0.85, s));

  const bg = dark ? hslToHex(h, sat * 0.35, 0.1) : hslToHex(h, sat * 0.22, 0.95);
  const ink = dark ? hslToHex(h, sat * 0.25, 0.93) : hslToHex(h, sat * 0.55, 0.14);

  let accentHue = h;
  let secondHue = h;
  if (kind === 'complement') {
    accentHue = h + 0.5;
    secondHue = h + 0.42;
  } else if (kind === 'analogous') {
    accentHue = h + 0.08;
    secondHue = h - 0.08;
  } else if (kind === 'triad') {
    accentHue = h + 1 / 3;
    secondHue = h + 2 / 3;
  } else {
    accentHue = h;
    secondHue = h;
  }

  /*
   * An accent is only an accent if it can be seen against the ground.
   * A saturated hue at a middling lightness can land under 1.5:1 on a pale
   * ground and disappear the moment it is printed small, so the lightness
   * is walked away from the background until the accent clears a usable
   * contrast — or until there is nowhere left to walk, on a mid-grey
   * ground where nothing of that hue would work.
   */
  const readable = (hue, saturation, start) => {
    const away = luminance(bg) > 0.5 ? -1 : 1;
    let best = hslToHex(hue, saturation, start);
    for (let step = 0; step <= 12; step++) {
      const lightness = Math.max(0.08, Math.min(0.92, start + away * step * 0.05));
      const candidate = hslToHex(hue, saturation, lightness);
      best = candidate;
      if (contrastRatio(bg, candidate) >= 3) break;
    }
    return best;
  };

  const accent = readable(accentHue, Math.min(0.9, sat + 0.12), dark ? 0.62 : 0.52);
  const accent2 =
    kind === 'tonal'
      ? readable(secondHue, sat * 0.5, dark ? 0.44 : 0.68)
      : readable(secondHue, Math.min(0.85, sat), dark ? 0.5 : 0.62);

  return { bg, ink, accent, accent2 };
}

/**
 * The colours an image is mostly made of.
 *
 * Pixels are bucketed into a coarse colour cube and the fullest buckets
 * win, which is quick and gives steadier results on photographs than
 * picking individual pixels would.
 */
function paletteFromImage(image, wanted = 4) {
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key =
      (data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4);
    const found = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    found.count++;
    found.r += data[i];
    found.g += data[i + 1];
    found.b += data[i + 2];
    buckets.set(key, found);
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((b) => rgbToHex(b.r / b.count, b.g / b.count, b.b / b.count));

  if (!ranked.length) return null;

  // Sort by lightness so the palest becomes the ground and the darkest
  // the ink, which is the arrangement the patterns expect.
  const picked = [];
  for (const hex of ranked) {
    if (picked.length >= Math.max(wanted, 4)) break;
    // Skip anything too close to a colour already taken.
    if (picked.some((p) => contrastRatio(p, hex) < 1.12)) continue;
    picked.push(hex);
  }
  while (picked.length < 4) picked.push(picked[picked.length - 1] || '#808080');

  const byLight = [...picked].sort((a, b) => luminance(b) - luminance(a));
  return {
    bg: byLight[0],
    ink: byLight[byLight.length - 1],
    accent: byLight[1],
    accent2: byLight[2]
  };
}

/* ------------------------------------------------------------------ *
 * The workspace
 * ------------------------------------------------------------------ */

export async function mount(container, context) {
  loadStyles();

  const state = {
    colors: { bg: '#f7f2e8', ink: '#14172a', accent: '#ef3c80', accent2: '#00b2ad' },
    saved: [],
    base: '#ef3c80',
    harmony: 'complement',
    dark: false,
    pattern: null,
    collection: null
  };

  const root = el('div', { class: 'mod' });
  const statusNode = el('p', { class: 'module-status', role: 'status' });

  /*
   * guard() wraps a function and hands the wrapper back rather than
   * running it, so every call site here invokes what it builds. Anything
   * that throws inside reports itself in the status line instead of
   * failing silently.
   */
  const withGuard = (run) => guard(statusNode, context, run)();

  /* ---- Which pattern the palette is tried on ---- */

  // Collections the buyer owns, so the preview is of something real. The
  // tool is useful without one, so a built-in fallback stands in.
  const owned = (context.unlocked || []).filter((slug) => CollectionSlugs.includes(slug));
  const stage = createStage({ initialTile: 150 });

  async function loadPattern(slug) {
    if (!slug) {
      state.pattern = null;
      return;
    }
    const { specs, base } = await loadCollection(slug);
    state.collection = slug;
    state.pattern = asPattern(specs[Math.floor(specs.length / 2)], base);
  }

  async function paint() {
    if (!state.pattern) {
      stage.setTile('');
      stage.setCaption('Open a Collection you own to preview a palette on a real pattern.');
      return;
    }
    const uri = await tileDataUri(state.pattern, state.colors, 320);
    stage.setTile(uri);
    stage.setCaption(state.pattern.name + ' — in the palette on the left');
  }

  /* ---- The four slots ---- */

  const slotInputs = {};
  const slotsRow = el('div', { class: 'colorways__slots' });

  for (const slot of SLOTS) {
    const input = el('input', { type: 'color', value: state.colors[slot.id] });
    input.addEventListener('input', () => {
      state.colors[slot.id] = input.value;
      paint();
      showContrast();
    });
    slotInputs[slot.id] = input;
    slotsRow.append(el('label', { class: 'colorways__slot' }, [
      el('span', { class: 'colorways__slot-name', text: slot.label }),
      input
    ]));
  }

  const syncSlots = () => {
    for (const slot of SLOTS) slotInputs[slot.id].value = state.colors[slot.id];
  };

  /* ---- Contrast, because a palette that cannot be read is no use ---- */

  const contrastNode = el('p', { class: 'hint' });

  function showContrast() {
    const ratio = contrastRatio(state.colors.bg, state.colors.ink);
    const accent = contrastRatio(state.colors.bg, state.colors.accent);
    const verdict =
      ratio >= 7 ? 'strong' : ratio >= 4.5 ? 'comfortable' : ratio >= 3 ? 'soft' : 'very low';
    contrastNode.textContent =
      'Ink against background: ' + ratio.toFixed(1) + ':1 (' + verdict + '). ' +
      'Accent against background: ' + accent.toFixed(1) + ':1. ' +
      'Under about 3:1 a pattern starts to disappear at small sizes.';
  }

  /* ---- Building a palette from one colour ---- */

  const baseInput = el('input', { type: 'color', value: state.base });
  baseInput.addEventListener('input', () => {
    state.base = baseInput.value;
  });

  const buildButton = el('button', {
    type: 'button',
    class: 'button button--small',
    text: 'Build palette',
    onclick: () => {
      state.colors = harmonise(state.base, state.harmony, state.dark);
      syncSlots();
      paint();
      showContrast();
      status(statusNode, 'Built a ' + state.harmony + ' palette from your base colour.');
    }
  });

  const groundToggle = segmented(
    [{ value: 'light', label: 'Light ground' }, { value: 'dark', label: 'Dark ground' }],
    'light',
    (value) => {
      state.dark = value === 'dark';
    }
  );

  /* ---- Lifting a palette out of an image ---- */

  const fileInput = el('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/webp',
    style: { display: 'none' }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    withGuard(async () => {
      const url = URL.createObjectURL(file);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('That image could not be read.'));
          img.src = url;
        });
        const palette = paletteFromImage(image);
        if (!palette) throw new Error('No colours could be read out of that image.');
        state.colors = palette;
        syncSlots();
        await paint();
        showContrast();
        status(statusNode, 'Lifted a palette from ' + file.name + '. Nothing left this device.');
      } finally {
        URL.revokeObjectURL(url);
        fileInput.value = '';
      }
    });
  });

  const pickButton = el('button', {
    type: 'button',
    class: 'button button--small',
    text: 'Lift from an image',
    onclick: () => fileInput.click()
  });

  /* ---- Saving ---- */

  const nameInput = el('input', { type: 'text', class: 'browser__search', placeholder: 'Name this palette' });
  const savedList = el('ul', { class: 'colorways__saved' });

  function renderSaved() {
    savedList.textContent = '';
    if (!state.saved.length) {
      savedList.append(el('li', { class: 'hint', text: 'No palettes saved yet.' }));
      return;
    }
    state.saved.forEach((palette, index) => {
      const swatches = el('span', { class: 'colorways__chips' });
      for (const slot of SLOTS) {
        swatches.append(el('span', {
          class: 'colorways__chip',
          style: { background: palette.colors[slot.id] }
        }));
      }
      savedList.append(el('li', { class: 'colorways__saved-item' }, [
        el('button', {
          type: 'button',
          class: 'colorways__saved-open',
          onclick: () => {
            state.colors = { ...palette.colors };
            syncSlots();
            paint();
            showContrast();
          }
        }, [swatches, el('span', { text: palette.name })]),
        el('button', {
          type: 'button',
          class: 'link-button',
          text: 'Remove',
          onclick: async () => {
            state.saved.splice(index, 1);
            await context.storage.set('palettes', state.saved);
            renderSaved();
          }
        })
      ]));
    });
  }

  const saveButton = el('button', {
    type: 'button',
    class: 'button button--small',
    text: 'Save palette',
    onclick: () => withGuard(async () => {
      const name = (nameInput.value || '').trim() || 'Palette ' + (state.saved.length + 1);
      state.saved.push({ name, colors: { ...state.colors } });
      await context.storage.set('palettes', state.saved);
      nameInput.value = '';
      renderSaved();
      status(statusNode, 'Saved “' + name + '”. It is kept on this device.');
    })
  });

  /* ---- Export ---- */

  /** A swatch sheet: each colour as a block with its hex beneath it. */
  function swatchSheet(palette) {
    const width = 1200;
    const height = 400;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const cell = width / SLOTS.length;
    SLOTS.forEach((slot, i) => {
      ctx.fillStyle = palette.colors[slot.id];
      ctx.fillRect(i * cell, 0, cell, height - 90);
      ctx.fillStyle = '#111111';
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.fillText(slot.label, i * cell + 24, height - 50);
      ctx.font = '22px ui-monospace, monospace';
      ctx.fillStyle = '#555555';
      ctx.fillText(palette.colors[slot.id].toUpperCase(), i * cell + 24, height - 18);
    });

    return canvas;
  }

  const exportButton = el('button', {
    type: 'button',
    class: 'button button--ink',
    text: 'Download palettes',
    onclick: () => withGuard(async () => {
      const palettes = state.saved.length
        ? state.saved
        : [{ name: 'Current palette', colors: { ...state.colors } }];

      const entries = [];
      for (const palette of palettes) {
        const canvas = swatchSheet(palette);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        entries.push({
          name: safeName(palette.name) + '.png',
          data: new Uint8Array(await blob.arrayBuffer())
        });
      }

      // A plain, readable file other software can import, plus the same
      // data as JSON for anything that prefers it.
      entries.push({
        name: 'palettes.json',
        data: JSON.stringify({ palettes, slots: SLOTS.map((s) => s.id) }, null, 2)
      });
      entries.push({
        name: 'palettes.txt',
        data: palettes
          .map((p) => p.name + '\n' + SLOTS.map((s) => '  ' + s.label + ': ' + p.colors[s.id].toUpperCase()).join('\n'))
          .join('\n\n') + '\n'
      });
      entries.push({ name: 'LICENSE.txt', data: licenseNote(context, { pattern: 'Palettes' }) });

      context.files.downloadBlob(makeZip(entries), 'tilecraft-palettes.zip');
      status(statusNode, 'Downloaded ' + palettes.length + ' palette' + (palettes.length === 1 ? '' : 's') + '.');
    })
  });

  /* ---- Layout ---- */

  const patternPicker = el('select', { class: 'browser__search' });
  patternPicker.append(el('option', { value: '', text: owned.length ? 'Pick a Collection' : 'No Collections unlocked' }));
  for (const slug of owned) {
    patternPicker.append(el('option', { value: slug, text: titleFor(slug) }));
  }
  patternPicker.addEventListener('change', () => withGuard(async () => {
    await loadPattern(patternPicker.value);
    await paint();
  }));

  const panel = el('div', { class: 'panel' }, [
    el('h3', { class: 'panel__title', text: 'Palette' }),
    slotsRow,
    contrastNode,

    el('h3', { class: 'panel__title', text: 'Build from a colour' }),
    field('Base colour', baseInput),
    field('Relationship', segmented(HARMONIES, state.harmony, (value) => {
      state.harmony = value;
    })),
    field('Ground', groundToggle),
    el('p', { class: 'panel__row' }, [buildButton, pickButton]),
    el('p', {
      class: 'hint',
      text: 'Images are read by this browser and are not uploaded.'
    }),

    el('h3', { class: 'panel__title', text: 'Saved palettes' }),
    el('p', { class: 'panel__row' }, [nameInput, saveButton]),
    savedList,
    el('p', { class: 'panel__row' }, [exportButton]),
    fileInput
  ]);

  const main = el('div', { class: 'mod__main' }, [
    field('Preview on', patternPicker),
    stage.node,
    slider('Preview scale', {
      min: 40,
      max: 420,
      step: 2,
      value: 150,
      format: (v) => v + 'px',
      onInput: (v) => stage.setSize(v)
    }).node
  ]);

  root.append(el('div', { class: 'mod mod--split' }, [panel, main]), statusNode);
  container.append(root);

  /* ---- Start ---- */

  state.saved = (await context.storage.get('palettes')) || [];
  renderSaved();
  syncSlots();
  showContrast();

  if (owned.length) {
    patternPicker.value = owned[0];
    await loadPattern(owned[0]);
  }
  await paint();

  return () => {};
}

/* The Collections this tool can preview on. Tools are not Collections, so
 * they are filtered out rather than fetched and failed on. */
const CollectionSlugs = [
  'geometric-essentials', 'textures-and-grain', 'botanical-linework',
  'mid-century-shapes', 'tile-and-terrazzo', 'art-deco-lines',
  'stripes-and-rules', 'checks-and-weaves', 'waves-and-water',
  'stars-and-night', 'folk-geometry', 'arches-and-columns',
  'scallops-and-shells', 'confetti-and-specks', 'crystal-and-facet'
];

function titleFor(slug) {
  return slug
    .split('-')
    .map((word) => (word === 'and' ? 'and' : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

export default { mount };
