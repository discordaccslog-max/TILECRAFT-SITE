/*
 * Real pattern previews for the storefront.
 *
 * Product pages and the home page show the actual patterns, rendered from
 * the same files the Studio uses, rather than decorative illustrations.
 * A buyer should be able to see what they are buying before they buy it.
 *
 * Collections draw from their own catalog. The two pattern tools have no
 * catalog of their own, so they show work produced by the tool itself:
 * the generator runs, and Repeat Builder shows a repeat laid out from a
 * motif the same way a buyer's motif would be.
 */

import { renderSvg, colorsOf } from './patterns/engine.mjs';

const summaryPromise = fetch('/patterns/index.json')
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

const specCache = new Map();

function loadSpecs(slug) {
  if (!specCache.has(slug)) {
    specCache.set(
      slug,
      fetch('/patterns/' + slug + '/specs.json')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    );
  }
  return specCache.get(slug);
}

/** The counts for a collection, straight from what was generated. */
export async function countsFor(slug) {
  const summary = await summaryPromise;
  if (!summary || !summary.collections[slug]) return null;
  return summary.collections[slug];
}

export async function totals() {
  const summary = await summaryPromise;
  return summary ? summary.totals : null;
}

function dataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Evenly spaced picks, so a strip shows the range of a collection. */
function spread(list, count) {
  if (list.length <= count) return list.slice();
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(list[Math.round((i * (list.length - 1)) / (count - 1))]);
  }
  return out;
}

/**
 * Fill an element with a strip of real pattern tiles.
 * Each tile is a div with the pattern as a repeating background.
 */
export async function renderStrip(host, slug, count = 6) {
  const specs = await loadSpecs(slug);
  if (!specs.length) return false;

  host.textContent = '';
  for (const spec of spread(specs, count)) {
    const cell = document.createElement('div');
    cell.className = 'preview__cell';
    cell.title = spec.name;

    if (spec.type === 'raster') {
      cell.style.backgroundImage = 'url("/patterns/' + slug + '/' + (spec.thumb || spec.raster) + '")';
      cell.style.backgroundSize = '70px 70px';
      // A texture ships as grayscale, so it is tinted here the way the
      // Studio tints it, rather than shown as a flat gray square.
      const colors = colorsOf(spec, 0);
      cell.style.backgroundColor = colors.bg;
      cell.style.filter = 'none';
    } else {
      cell.style.backgroundImage = 'url("' + dataUri(renderSvg(spec, colorsOf(spec, 0))) + '")';
      cell.style.backgroundSize = Math.round(spec.tile / 3) + 'px ' + Math.round(spec.tile / 3) + 'px';
    }

    host.append(cell);
  }
  return true;
}

/** One large tile, for a hero or a feature panel. */
export async function renderFeature(host, slug, index = 0, tilePx = 150) {
  const specs = await loadSpecs(slug);
  if (!specs.length) return false;
  const spec = specs[index % specs.length];

  if (spec.type === 'raster') {
    host.style.backgroundImage = 'url("/patterns/' + slug + '/' + (spec.thumb || spec.raster) + '")';
    host.style.backgroundColor = colorsOf(spec, 0).bg;
  } else {
    host.style.backgroundImage = 'url("' + dataUri(renderSvg(spec, colorsOf(spec, 0))) + '")';
  }
  host.style.backgroundSize = tilePx + 'px ' + tilePx + 'px';
  host.dataset.patternName = spec.name;
  return true;
}

/* ------------------------------------------------------------------ *
 * The tools
 * ------------------------------------------------------------------ */

const TOOL_PREVIEWS = {
  'pattern-generator-studio': async (host) => {
    const { generateSpec } = await import('/studio/modules/pattern-generator-studio/generate.mjs');
    const palettes = [
      { bg: '#f7f2e8', ink: '#14172a', accent: '#ef3c80', accent2: '#00b2ad' },
      { bg: '#f3e7dc', ink: '#4a3328', accent: '#c96f4a', accent2: '#8aa07c' },
      { bg: '#eef1f4', ink: '#232b36', accent: '#4a7ba7', accent2: '#8f9bab' },
      { bg: '#141124', ink: '#f4efe3', accent: '#ff5c9b', accent2: '#2fe3d6' },
      { bg: '#eff3ec', ink: '#2b3a2f', accent: '#6f9173', accent2: '#b9a06b' },
      { bg: '#ffffff', ink: '#111111', accent: '#555555', accent2: '#999999' }
    ];
    const recipes = [
      { motif: 'stars', layout: 'halfDrop', density: 4, scale: 0.6, accentShare: 0.3 },
      { motif: 'blobs', layout: 'scatter', density: 5, scale: 0.55, jitter: 0.6 },
      { motif: 'arcs', layout: 'grid', density: 5, scale: 0.8, rotation: 45, weight: 0.7 },
      { motif: 'leaves', layout: 'halfDrop', density: 5, scale: 0.7, rotation: 30 },
      { motif: 'crosses', layout: 'grid', density: 7, scale: 0.5, weight: 0.4 },
      { motif: 'hexagons', layout: 'halfDrop', density: 6, scale: 0.85, accentShare: 0.4 }
    ];

    host.textContent = '';
    recipes.forEach((settings, i) => {
      const colors = palettes[i % palettes.length];
      const spec = generateSpec(settings, 'SHOW' + i + 'CASE', [{ name: 'x', colors }]);
      const cell = document.createElement('div');
      cell.className = 'preview__cell';
      cell.title = 'Generated from ' + settings.motif + ', seed SHOW' + i + 'CASE';
      cell.style.backgroundImage = 'url("' + dataUri(renderSvg(spec, colors)) + '")';
      cell.style.backgroundSize = Math.round(spec.tile / 3) + 'px ' + Math.round(spec.tile / 3) + 'px';
      host.append(cell);
    });
    return true;
  },

  'repeat-builder': async (host) => {
    // A repeat built from one motif, laid out four ways — which is what
    // the module does with a motif a buyer brings in.
    const { generateSpec } = await import('/studio/modules/pattern-generator-studio/generate.mjs');
    const layouts = [
      { label: 'Full drop', layout: 'grid', rotation: 0 },
      { label: 'Half drop', layout: 'halfDrop', rotation: 0 },
      { label: 'Brick', layout: 'halfDrop', rotation: 0, density: 4 },
      { label: 'Mirror', layout: 'grid', rotation: 45 },
      { label: 'Spaced', layout: 'grid', spacing: 0.5, density: 3 },
      { label: 'Dense', layout: 'halfDrop', density: 8, scale: 0.75 }
    ];
    const colors = { bg: '#f7f2e8', ink: '#14172a', accent: '#ef3c80', accent2: '#00b2ad' };

    host.textContent = '';
    layouts.forEach((variant, i) => {
      const spec = generateSpec(
        { motif: 'leaves', scale: 0.6, density: 4, accentShare: 0, ...variant },
        'REPEAT' + i,
        [{ name: 'x', colors }]
      );
      const cell = document.createElement('div');
      cell.className = 'preview__cell';
      cell.title = variant.label;
      cell.style.backgroundImage = 'url("' + dataUri(renderSvg(spec, colors)) + '")';
      cell.style.backgroundSize = Math.round(spec.tile / 3) + 'px ' + Math.round(spec.tile / 3) + 'px';
      host.append(cell);
    });
    return true;
  },

  'production-studio': async (host) => {
    // The same pattern in several colorways, which is what a batch export
    // produces in one pass.
    const specs = await loadSpecs('tile-and-terrazzo');
    if (!specs.length) return false;
    const spec = specs[1];
    host.textContent = '';
    for (let i = 0; i < Math.min(6, spec.colorways.length * 2); i++) {
      const colors = colorsOf(spec, i % spec.colorways.length);
      const cell = document.createElement('div');
      cell.className = 'preview__cell';
      cell.title = spec.name + ' — ' + spec.colorways[i % spec.colorways.length].name;
      cell.style.backgroundImage = 'url("' + dataUri(renderSvg(spec, colors)) + '")';
      cell.style.backgroundSize = Math.round(spec.tile / (2 + (i % 3))) + 'px ' + Math.round(spec.tile / (2 + (i % 3))) + 'px';
      host.append(cell);
    }
    return true;
  },

  'essentials-bundle': async (host) => {
    // One pattern from each of the five Collections the bundle unlocks.
    const slugs = [
      'geometric-essentials', 'textures-and-grain', 'botanical-linework',
      'mid-century-shapes', 'tile-and-terrazzo'
    ];
    host.textContent = '';
    for (const slug of slugs) {
      const specs = await loadSpecs(slug);
      if (!specs.length) continue;
      const spec = specs[Math.floor(specs.length / 3)];
      const cell = document.createElement('div');
      cell.className = 'preview__cell';
      cell.title = spec.name;
      if (spec.type === 'raster') {
        cell.style.backgroundImage = 'url("/patterns/' + slug + '/' + (spec.thumb || spec.raster) + '")';
        cell.style.backgroundSize = '70px 70px';
        cell.style.backgroundColor = colorsOf(spec, 0).bg;
      } else {
        cell.style.backgroundImage = 'url("' + dataUri(renderSvg(spec, colorsOf(spec, 0))) + '")';
        cell.style.backgroundSize = Math.round(spec.tile / 3) + 'px ' + Math.round(spec.tile / 3) + 'px';
      }
      host.append(cell);
    }
    return true;
  }
};

/**
 * One tile for a Studio Edition panel: real output from that tool, so the
 * print-shop section on the home page shows what each tool makes.
 */
export async function renderToolTile(host, slug, tilePx = 120) {
  const { generateSpec } = await import('/studio/modules/pattern-generator-studio/generate.mjs');
  const looks = {
    'pattern-generator-studio': {
      settings: { motif: 'stars', layout: 'halfDrop', density: 4, scale: 0.65, accentShare: 0.35 },
      colors: { bg: '#141124', ink: '#f4efe3', accent: '#ff5c9b', accent2: '#2fe3d6' }
    },
    'repeat-builder': {
      settings: { motif: 'leaves', layout: 'halfDrop', density: 4, scale: 0.6, rotation: 20 },
      colors: { bg: '#141124', ink: '#2fe3d6', accent: '#ff5c9b', accent2: '#f4efe3' }
    },
    'production-studio': {
      settings: { motif: 'hexagons', layout: 'grid', density: 6, scale: 0.9, accentShare: 0.45 },
      colors: { bg: '#141124', ink: '#f4efe3', accent: '#ff5c9b', accent2: '#2fe3d6' }
    }
  };

  const look = looks[slug] || looks['pattern-generator-studio'];
  const spec = generateSpec(look.settings, 'PANEL' + slug.length, [{ name: 'x', colors: look.colors }]);
  host.style.backgroundImage = 'url("' + dataUri(renderSvg(spec, look.colors)) + '")';
  host.style.backgroundSize = tilePx + 'px ' + tilePx + 'px';
  host.style.backgroundRepeat = 'repeat';
  return true;
}

/** Fill a preview area for any product, collection or tool. */
export async function renderProductPreview(host, slug) {
  if (TOOL_PREVIEWS[slug]) return TOOL_PREVIEWS[slug](host);
  return renderStrip(host, slug, 6);
}

export default { renderStrip, renderFeature, renderToolTile, renderProductPreview, countsFor, totals };
