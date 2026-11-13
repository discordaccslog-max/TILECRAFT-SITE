/*
 * Pattern Generator Studio — the generator.
 *
 * Builds a seamless pattern spec from a set of settings and a seed. The
 * same settings and the same seed always produce the same pattern, which
 * is what makes a saved preset worth saving and what lets a result be
 * recreated exactly rather than approximately.
 *
 * Edge wrapping comes from js/patterns/compose.mjs, the same code that
 * generated the shipped collections, so a generated pattern tiles for the
 * same reason theirs do.
 */

import { rng, wrap, jitteredGrid, halfDropGrid, TAU } from '../../../js/patterns/compose.mjs';

export const MOTIFS = [
  { value: 'dots', label: 'Dots' },
  { value: 'squares', label: 'Squares' },
  { value: 'triangles', label: 'Triangles' },
  { value: 'hexagons', label: 'Hexagons' },
  { value: 'lines', label: 'Lines' },
  { value: 'arcs', label: 'Arcs' },
  { value: 'crosses', label: 'Crosses' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'blobs', label: 'Blobs' },
  { value: 'stars', label: 'Stars' },
  { value: 'rings', label: 'Rings' },
  { value: 'chevrons', label: 'Chevrons' }
];

export const LAYOUTS = [
  { value: 'grid', label: 'Grid' },
  { value: 'halfDrop', label: 'Half drop' },
  { value: 'scatter', label: 'Scatter' }
];

export const DEFAULTS = {
  motif: 'dots',
  layout: 'halfDrop',
  density: 5,
  scale: 0.5,
  rotation: 0,
  spacing: 0,
  jitter: 0.25,
  weight: 0.5,
  accentShare: 0.25,
  tile: 320
};

/* ------------------------------------------------------------------ *
 * Motifs
 *
 * Each returns the primitives for one motif centred on (x, y), at the
 * given radius, rotated by `angle`. Wrapping is handled afterwards.
 * ------------------------------------------------------------------ */

function leafOutline(cx, cy, length, width, angle, steps = 22) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const side = (sign) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const w = width * 0.5 * Math.pow(Math.sin(Math.PI * t), 1.25) * sign;
      const x = (t - 0.5) * length;
      pts.push([cx + x * cos - w * sin, cy + x * sin + w * cos]);
    }
    return pts;
  };
  return side(1).concat(side(-1).reverse());
}

function polygonPoints(cx, cy, radius, sides, angle) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = angle + (i / sides) * TAU;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return pts;
}

function motifFor(kind, random, x, y, radius, angle, slot, strokeWidth) {
  switch (kind) {
    case 'dots':
      return [{ t: 'circle', cx: x, cy: y, r: radius, fill: slot }];

    case 'rings':
      return [{ t: 'ring', cx: x, cy: y, r: radius, w: strokeWidth, stroke: slot }];

    case 'squares':
      return [{ t: 'poly', pts: polygonPoints(x, y, radius * 1.18, 4, angle + Math.PI / 4), fill: slot }];

    case 'triangles':
      return [{ t: 'poly', pts: polygonPoints(x, y, radius * 1.2, 3, angle - Math.PI / 2), fill: slot }];

    case 'hexagons':
      return [{ t: 'poly', pts: polygonPoints(x, y, radius * 1.1, 6, angle + Math.PI / 6), fill: slot }];

    case 'lines':
      return [{
        t: 'line',
        pts: [
          [x - Math.cos(angle) * radius * 1.6, y - Math.sin(angle) * radius * 1.6],
          [x + Math.cos(angle) * radius * 1.6, y + Math.sin(angle) * radius * 1.6]
        ],
        w: strokeWidth,
        stroke: slot,
        cap: 'round'
      }];

    case 'arcs':
      return [{
        t: 'arc', cx: x, cy: y, r: radius * 1.2,
        a0: angle, a1: angle + Math.PI * 1.1,
        w: strokeWidth, stroke: slot, cap: 'round'
      }];

    case 'crosses':
      return [
        {
          t: 'line',
          pts: [[x - Math.cos(angle) * radius, y - Math.sin(angle) * radius], [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]],
          w: strokeWidth, stroke: slot, cap: 'round'
        },
        {
          t: 'line',
          pts: [[x + Math.sin(angle) * radius, y - Math.cos(angle) * radius], [x - Math.sin(angle) * radius, y + Math.cos(angle) * radius]],
          w: strokeWidth, stroke: slot, cap: 'round'
        }
      ];

    case 'leaves':
      return [{ t: 'poly', pts: leafOutline(x, y, radius * 2.6, radius * 0.95, angle), fill: slot }];

    case 'blobs': {
      const radii = [];
      for (let i = 0; i < 9; i++) radii.push(radius * (1 + (random() - 0.5) * 0.4));
      return [{ t: 'blob', cx: x, cy: y, radii, rot: angle, fill: slot }];
    }

    case 'stars': {
      const points = 6;
      const out = [];
      for (let i = 0; i < points; i++) {
        const a = angle + (i / points) * TAU;
        out.push({
          t: 'line',
          pts: [[x, y], [x + Math.cos(a) * radius * 1.5, y + Math.sin(a) * radius * 1.5]],
          w: strokeWidth, stroke: slot, cap: 'round'
        });
      }
      return out;
    }

    case 'chevrons': {
      const arm = radius * 1.3;
      return [{
        t: 'line',
        pts: [
          [x - Math.cos(angle) * arm, y - Math.sin(angle) * arm + arm * 0.7],
          [x, y - arm * 0.5],
          [x + Math.cos(angle) * arm, y + Math.sin(angle) * arm + arm * 0.7]
        ],
        w: strokeWidth, stroke: slot, cap: 'round', join: 'round'
      }];
    }

    default:
      return [{ t: 'circle', cx: x, cy: y, r: radius, fill: slot }];
  }
}

/* ------------------------------------------------------------------ *
 * Generating
 * ------------------------------------------------------------------ */

/** A short, readable seed that a person can copy and type back in. */
export function randomSeed() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let out = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/**
 * Build a pattern spec from settings.
 *
 * @param {object} settings see DEFAULTS
 * @param {string} seed
 * @param {Array} colorways
 * @returns {object} a spec the engine can render
 */
export function generateSpec(settings, seed, colorways) {
  const s = { ...DEFAULTS, ...settings };
  const random = rng(seed + '|' + s.motif + '|' + s.layout + '|' + s.density + '|' + s.jitter);
  const tile = s.tile;

  const count = Math.max(1, Math.round(s.density));
  const cell = tile / count;
  const radius = cell * 0.5 * (0.2 + s.scale * 0.8) * (1 - s.spacing * 0.45);
  const strokeWidth = Math.max(1, radius * (0.14 + s.weight * 0.5));

  let points;
  if (s.layout === 'scatter') {
    points = jitteredGrid(random, tile, count * count, 0.2 + s.jitter * 0.3);
  } else if (s.layout === 'halfDrop') {
    points = halfDropGrid(tile, count, count);
  } else {
    points = [];
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) points.push([(i + 0.5) * cell, (j + 0.5) * cell]);
    }
  }

  const draw = [];
  for (const [px, py] of points) {
    // Jitter is applied to grid layouts too, so a grid can be loosened
    // without changing to scatter.
    const jx = s.layout === 'scatter' ? 0 : (random() - 0.5) * cell * s.jitter;
    const jy = s.layout === 'scatter' ? 0 : (random() - 0.5) * cell * s.jitter;
    const angle = (s.rotation * Math.PI) / 180 + (random() - 0.5) * s.jitter * Math.PI;
    const slot = random() < s.accentShare ? 'accent' : 'ink';
    draw.push(...motifFor(s.motif, random, px + jx, py + jy, radius, angle, slot, strokeWidth));
  }

  return {
    id: 'gen-' + seed,
    name: 'Generated ' + seed,
    collection: 'pattern-generator-studio',
    type: 'vector',
    tags: [s.motif, s.layout],
    tile,
    seed,
    settings: s,
    colorways,
    draw: wrap(draw, tile)
  };
}

export default { generateSpec, randomSeed, MOTIFS, LAYOUTS, DEFAULTS };
