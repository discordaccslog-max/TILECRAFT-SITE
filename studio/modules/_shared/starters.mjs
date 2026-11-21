/*
 * Starting points: the seed pack and the motif library.
 *
 * Both are extras bought at checkout, and both answer the same problem —
 * an empty tool is hard to begin with. The seed pack is sixty settings
 * and seeds worth keeping; the motif library is forty shapes drawn here
 * in the browser so a repeat can be built without supplying artwork.
 *
 * Both are generated rather than stored: the seeds are a list, and the
 * motifs are drawn from code, so neither adds a download to the Studio.
 */

import { TAU } from '../../../js/patterns/compose.mjs';

/* ------------------------------------------------------------------ *
 * The seed pack
 * ------------------------------------------------------------------ */

/*
 * The twelve motifs Pattern Generator Studio actually offers. A seed is
 * only a starting point if the tool can draw it, so this list has to stay
 * in step with MOTIFS in ../pattern-generator-studio/generate.mjs — a
 * test holds the two together.
 */
const MOTIF_KEYS = [
  'dots', 'stars', 'blobs', 'arcs', 'leaves', 'crosses',
  'hexagons', 'triangles', 'squares', 'rings', 'lines', 'chevrons'
];

const LAYOUTS = ['grid', 'halfDrop', 'scatter'];

/*
 * Sixty combinations, built by walking the motifs against a set of looks
 * rather than written out one at a time. Each look is a considered set of
 * settings — a dense fine ground, a sparse bold one, and so on — so every
 * entry in the pack is a finished starting point rather than a random
 * throw of the sliders.
 */
const LOOKS = [
  { name: 'Fine ground', density: 8, scale: 0.42, rotation: 0, spacing: 0.1, accentShare: 0.15, weight: 0.4 },
  { name: 'Open scatter', density: 3, scale: 0.7, rotation: 18, spacing: 0.45, accentShare: 0.35, weight: 0.6 },
  { name: 'Bold grid', density: 4, scale: 0.9, rotation: 0, spacing: 0.08, accentShare: 0.5, weight: 0.85 },
  { name: 'Tilted', density: 6, scale: 0.6, rotation: 45, spacing: 0.2, accentShare: 0.25, weight: 0.5 },
  { name: 'Sparse accent', density: 2, scale: 0.8, rotation: 0, spacing: 0.5, accentShare: 0.7, weight: 0.45 }
];

/** A readable seed from the license alphabet, derived rather than random. */
function seedFor(index) {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let n = (index + 1) * 2654435761 % 2147483647;
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + (index + 7) * 31;
  }
  return out;
}

/**
 * The seed pack: sixty named starting points.
 *
 * @returns {Array<{name, seed, settings}>}
 */
export function seedPack() {
  const out = [];
  let index = 0;

  for (const look of LOOKS) {
    for (const motif of MOTIF_KEYS) {
      const layout = LAYOUTS[index % LAYOUTS.length];
      out.push({
        name: look.name + ' · ' + motif[0].toUpperCase() + motif.slice(1),
        seed: seedFor(index),
        settings: { ...look, motif, layout, name: undefined }
      });
      index++;
    }
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * The motif library
 * ------------------------------------------------------------------ */

/*
 * Forty motifs, each drawn into its own canvas on a transparent ground so
 * Repeat Builder can lay them out exactly as it lays out a file somebody
 * brought in. They are drawn here rather than shipped as images so the
 * extra costs nothing to download and stays crisp at any size.
 */
const MOTIF_SHAPES = [
  'circle', 'ring', 'square', 'diamond', 'triangle', 'hexagon', 'star5', 'star6',
  'cross', 'plus', 'arc', 'crescent', 'leaf', 'petal', 'teardrop', 'heart',
  'wave', 'zigzag', 'dash', 'bar', 'chevron', 'arrow', 'spiral', 'flower',
  'clover', 'sun', 'eye', 'shell', 'pine', 'sprig', 'berry', 'bud',
  'blockA', 'blockB', 'notch', 'step', 'lens', 'pill', 'quarter', 'fan'
];

function polygonPath(ctx, cx, cy, radius, points, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const a = rotation + (i / points) * TAU;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function starPath(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i / (points * 2)) * TAU;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draw one motif into a square canvas on a transparent ground. */
export function drawMotif(shape, size = 160, color = '#14172a') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const r = size * 0.36;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.09;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape) {
    case 'circle':
      ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.fill(); break;
    case 'ring':
      ctx.beginPath(); ctx.arc(c, c, r * 0.8, 0, TAU); ctx.stroke(); break;
    case 'square':
      ctx.fillRect(c - r * 0.8, c - r * 0.8, r * 1.6, r * 1.6); break;
    case 'diamond':
      polygonPath(ctx, c, c, r, 4, 0); ctx.fill(); break;
    case 'triangle':
      polygonPath(ctx, c, c, r, 3); ctx.fill(); break;
    case 'hexagon':
      polygonPath(ctx, c, c, r, 6); ctx.fill(); break;
    case 'star5':
      starPath(ctx, c, c, r, r * 0.45, 5); ctx.fill(); break;
    case 'star6':
      starPath(ctx, c, c, r, r * 0.55, 6); ctx.fill(); break;
    case 'cross':
      ctx.beginPath();
      ctx.moveTo(c - r * 0.7, c - r * 0.7); ctx.lineTo(c + r * 0.7, c + r * 0.7);
      ctx.moveTo(c + r * 0.7, c - r * 0.7); ctx.lineTo(c - r * 0.7, c + r * 0.7);
      ctx.stroke(); break;
    case 'plus':
      ctx.beginPath();
      ctx.moveTo(c, c - r); ctx.lineTo(c, c + r);
      ctx.moveTo(c - r, c); ctx.lineTo(c + r, c);
      ctx.stroke(); break;
    case 'arc':
      ctx.beginPath(); ctx.arc(c, c + r * 0.3, r, Math.PI, TAU); ctx.stroke(); break;
    case 'crescent':
      ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(c + r * 0.45, c - r * 0.2, r * 0.92, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; break;
    case 'leaf':
      ctx.beginPath();
      ctx.moveTo(c, c - r);
      ctx.quadraticCurveTo(c + r, c, c, c + r);
      ctx.quadraticCurveTo(c - r, c, c, c - r);
      ctx.fill(); break;
    case 'petal':
      ctx.beginPath();
      ctx.moveTo(c, c + r);
      ctx.quadraticCurveTo(c + r * 0.9, c - r * 0.2, c, c - r);
      ctx.quadraticCurveTo(c - r * 0.9, c - r * 0.2, c, c + r);
      ctx.fill(); break;
    case 'teardrop':
      ctx.beginPath();
      ctx.arc(c, c + r * 0.25, r * 0.7, 0, Math.PI);
      ctx.lineTo(c, c - r); ctx.closePath(); ctx.fill(); break;
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(c, c + r * 0.8);
      ctx.bezierCurveTo(c - r * 1.5, c - r * 0.3, c - r * 0.4, c - r * 1.1, c, c - r * 0.35);
      ctx.bezierCurveTo(c + r * 0.4, c - r * 1.1, c + r * 1.5, c - r * 0.3, c, c + r * 0.8);
      ctx.fill(); break;
    case 'wave':
      ctx.beginPath();
      ctx.moveTo(c - r, c);
      ctx.quadraticCurveTo(c - r * 0.5, c - r * 0.7, c, c);
      ctx.quadraticCurveTo(c + r * 0.5, c + r * 0.7, c + r, c);
      ctx.stroke(); break;
    case 'zigzag':
      ctx.beginPath();
      ctx.moveTo(c - r, c + r * 0.4);
      ctx.lineTo(c - r * 0.33, c - r * 0.4);
      ctx.lineTo(c + r * 0.33, c + r * 0.4);
      ctx.lineTo(c + r, c - r * 0.4);
      ctx.stroke(); break;
    case 'dash':
      ctx.fillRect(c - r, c - r * 0.18, r * 2, r * 0.36); break;
    case 'bar':
      ctx.fillRect(c - r * 0.22, c - r, r * 0.44, r * 2); break;
    case 'chevron':
      ctx.beginPath();
      ctx.moveTo(c - r, c + r * 0.4);
      ctx.lineTo(c, c - r * 0.5);
      ctx.lineTo(c + r, c + r * 0.4);
      ctx.stroke(); break;
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(c, c - r); ctx.lineTo(c, c + r);
      ctx.moveTo(c - r * 0.5, c - r * 0.45); ctx.lineTo(c, c - r);
      ctx.lineTo(c + r * 0.5, c - r * 0.45);
      ctx.stroke(); break;
    case 'spiral':
      ctx.beginPath();
      for (let t = 0; t < TAU * 2.4; t += 0.08) {
        const rr = (t / (TAU * 2.4)) * r;
        const x = c + Math.cos(t) * rr;
        const y = c + Math.sin(t) * rr;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = size * 0.06; ctx.stroke(); break;
    case 'flower':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.ellipse(c + Math.cos(a) * r * 0.5, c + Math.sin(a) * r * 0.5, r * 0.34, r * 0.5, a, 0, TAU);
        ctx.fill();
      }
      break;
    case 'clover':
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * r * 0.45, c + Math.sin(a) * r * 0.45, r * 0.45, 0, TAU);
        ctx.fill();
      }
      break;
    case 'sun':
      ctx.beginPath(); ctx.arc(c, c, r * 0.45, 0, TAU); ctx.fill();
      ctx.lineWidth = size * 0.055;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * r * 0.66, c + Math.sin(a) * r * 0.66);
        ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
        ctx.stroke();
      }
      break;
    case 'eye':
      ctx.beginPath();
      ctx.moveTo(c - r, c);
      ctx.quadraticCurveTo(c, c - r * 0.9, c + r, c);
      ctx.quadraticCurveTo(c, c + r * 0.9, c - r, c);
      ctx.fill(); break;
    case 'shell':
      ctx.lineWidth = size * 0.05;
      for (let k = 1; k <= 4; k++) {
        ctx.beginPath();
        ctx.arc(c, c + r * 0.6, (r * k) / 4, Math.PI, TAU);
        ctx.stroke();
      }
      break;
    case 'pine':
      for (let t = 0; t < 3; t++) {
        const w = r * (0.45 + t * 0.28);
        const y = c - r * 0.7 + t * r * 0.55;
        ctx.beginPath();
        ctx.moveTo(c, y - r * 0.4); ctx.lineTo(c + w, y + r * 0.2); ctx.lineTo(c - w, y + r * 0.2);
        ctx.closePath(); ctx.fill();
      }
      break;
    case 'sprig':
      ctx.lineWidth = size * 0.05;
      ctx.beginPath(); ctx.moveTo(c, c + r); ctx.lineTo(c, c - r); ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const y = c + r * 0.5 - k * r * 0.55;
        ctx.beginPath(); ctx.moveTo(c, y); ctx.lineTo(c + r * 0.55, y - r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c, y); ctx.lineTo(c - r * 0.55, y - r * 0.3); ctx.stroke();
      }
      break;
    case 'berry':
      ctx.beginPath(); ctx.arc(c - r * 0.35, c + r * 0.2, r * 0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(c + r * 0.35, c + r * 0.2, r * 0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(c, c - r * 0.4, r * 0.4, 0, TAU); ctx.fill();
      break;
    case 'bud':
      ctx.beginPath();
      ctx.ellipse(c, c - r * 0.2, r * 0.42, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = size * 0.05;
      ctx.beginPath(); ctx.moveTo(c, c + r * 0.4); ctx.lineTo(c, c + r); ctx.stroke();
      break;
    case 'blockA':
      ctx.fillRect(c - r, c - r, r, r); ctx.fillRect(c, c, r, r); break;
    case 'blockB':
      ctx.fillRect(c - r, c, r, r); ctx.fillRect(c, c - r, r, r); break;
    case 'notch':
      ctx.fillRect(c - r, c - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(c - r * 0.1, c - r * 0.1, r * 1.1, r * 1.1);
      ctx.globalCompositeOperation = 'source-over'; break;
    case 'step':
      ctx.fillRect(c - r, c + r * 0.3, r * 0.7, r * 0.7);
      ctx.fillRect(c - r * 0.3, c - r * 0.4, r * 0.7, r * 0.7);
      ctx.fillRect(c + r * 0.4, c - r, r * 0.7, r * 0.7); break;
    case 'lens':
      ctx.beginPath();
      ctx.ellipse(c, c, r, r * 0.42, 0, 0, TAU); ctx.fill(); break;
    case 'pill':
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(c - r, c - r * 0.42, r * 2, r * 0.84, r * 0.42);
      else ctx.rect(c - r, c - r * 0.42, r * 2, r * 0.84);
      ctx.fill(); break;
    case 'quarter':
      ctx.beginPath();
      ctx.moveTo(c - r, c + r);
      ctx.arc(c - r, c + r, r * 1.6, -Math.PI / 2, 0);
      ctx.closePath(); ctx.fill(); break;
    case 'fan':
      for (let k = 0; k < 5; k++) {
        const a0 = Math.PI + (k / 5) * Math.PI;
        const a1 = Math.PI + ((k + 0.72) / 5) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(c, c + r * 0.5);
        ctx.arc(c, c + r * 0.5, r, a0, a1);
        ctx.closePath(); ctx.fill();
      }
      break;
    default:
      ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.fill();
  }

  return canvas;
}

/** Every motif in the library, drawn and ready to lay out. */
export function motifLibrary(size = 160, color = '#14172a') {
  return MOTIF_SHAPES.map((shape) => ({
    name: shape,
    canvas: drawMotif(shape, size, color)
  }));
}

export const MOTIF_COUNT = MOTIF_SHAPES.length;

export default { seedPack, motifLibrary, drawMotif, MOTIF_COUNT };
