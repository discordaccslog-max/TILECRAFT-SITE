/*
 * Tilecraft Digital — build-time rasterizer
 *
 * Draws a pattern spec into pixels so the build can check that a tile
 * really is seamless, rather than trusting that it was built correctly.
 * It also writes PNG files, which is how the texture tiles are shipped.
 *
 * This is deliberately small and self-contained: every primitive is reduced
 * to simple closed polygons and filled with an even-odd scanline, drawn at
 * three times the target size and boxed down for antialiasing. It is not a
 * general SVG renderer and does not need to be — it only ever draws the
 * primitives this project generates.
 *
 * Build-time only. Nothing here ships to the browser.
 */

import zlib from 'node:zlib';
import {
  arcPoints,
  blobPoints,
  flattenSmooth,
  hexToRgb
} from '../../js/patterns/engine.mjs';

const SS = 3; // supersampling factor

/* ------------------------------------------------------------------ *
 * Turning primitives into simple closed polygons
 * ------------------------------------------------------------------ */

function circlePoly(cx, cy, r, steps = 64) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function ellipsePoly(cx, cy, rx, ry, rot = 0, steps = 64) {
  const pts = [];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return pts;
}

function roundRectPoly(x, y, w, h, rx) {
  if (!rx) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const r = Math.min(rx, w / 2, h / 2);
  const pts = [];
  const corner = (ccx, ccy, a0) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      pts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  corner(x + w - r, y + r, -Math.PI / 2);
  return pts;
}

/** A stroked polyline becomes one quad per segment plus joint discs. */
function strokePolys(pts, width, cap = 'butt', closed = false) {
  const half = Math.max(width, 0.01) / 2;
  const polys = [];
  const n = pts.length;
  const segments = closed ? n : n - 1;

  for (let i = 0; i < segments; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;

    let ax = a[0];
    let ay = a[1];
    let bx = b[0];
    let by = b[1];

    // A square cap simply extends the first and last segment.
    if (!closed && cap === 'square') {
      const ex = (dx / len) * half;
      const ey = (dy / len) * half;
      if (i === 0) { ax -= ex; ay -= ey; }
      if (i === segments - 1) { bx += ex; by += ey; }
    }

    polys.push([
      [ax + nx, ay + ny],
      [bx + nx, by + ny],
      [bx - nx, by - ny],
      [ax - nx, ay - ny]
    ]);
  }

  // Discs fill the gaps at joints, and make round caps round.
  const first = closed ? 0 : 1;
  const last = closed ? n : n - 1;
  for (let i = first; i < last; i++) polys.push(circlePoly(pts[i][0], pts[i][1], half, 16));
  if (!closed && cap === 'round') {
    polys.push(circlePoly(pts[0][0], pts[0][1], half, 16));
    polys.push(circlePoly(pts[n - 1][0], pts[n - 1][1], half, 16));
  }

  return polys;
}

/**
 * Every shape a primitive draws, as a list of fill operations. Each
 * operation is a list of subpaths filled with the even-odd rule, which is
 * what makes a ring a ring rather than a disc.
 */
function primitiveShapes(p) {
  switch (p.t) {
    case 'rect':
      return [[roundRectPoly(p.x, p.y, p.w, p.h, p.rx || 0)]];

    case 'circle':
      return [[circlePoly(p.cx, p.cy, p.r)]];

    case 'ellipse':
      return [[ellipsePoly(p.cx, p.cy, p.rx, p.ry, p.rot || 0)]];

    case 'ring': {
      const half = p.w / 2;
      return [[circlePoly(p.cx, p.cy, p.r + half), circlePoly(p.cx, p.cy, Math.max(0, p.r - half))]];
    }

    case 'arc': {
      const pts = arcPoints(p.cx, p.cy, p.r, p.a0, p.a1);
      return strokePolys(pts, p.w, p.cap || 'butt', false).map((poly) => [poly]);
    }

    case 'poly':
      return [[p.pts]];

    case 'line':
      return strokePolys(p.pts, p.w, p.cap || 'butt', !!p.closed).map((poly) => [poly]);

    case 'blob':
      return [[flattenSmooth(blobPoints(p.cx, p.cy, p.radii, p.rot || 0), true)]];

    case 'curve':
      return strokePolys(
        flattenSmooth(p.pts, !!p.closed),
        p.w,
        p.cap || 'butt',
        !!p.closed
      ).map((poly) => [poly]);

    default:
      return [];
  }
}

/* ------------------------------------------------------------------ *
 * Scanline fill
 * ------------------------------------------------------------------ */

function fillSubpaths(buffer, width, height, subpaths, rgb) {
  let minY = Infinity;
  let maxY = -Infinity;
  const edges = [];

  for (const pts of subpaths) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if (a[1] === b[1]) continue;
      edges.push([a[0], a[1], b[0], b[1]]);
      minY = Math.min(minY, a[1], b[1]);
      maxY = Math.max(maxY, a[1], b[1]);
    }
  }
  if (!edges.length) return;

  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(height - 1, Math.ceil(maxY));
  const crossings = [];

  for (let y = y0; y <= y1; y++) {
    const sy = y + 0.5;
    crossings.length = 0;

    for (const [ax, ay, bx, by] of edges) {
      if (sy < Math.min(ay, by) || sy >= Math.max(ay, by)) continue;
      crossings.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
    }
    if (crossings.length < 2) continue;

    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const xa = Math.max(0, Math.ceil(crossings[i] - 0.5));
      const xb = Math.min(width - 1, Math.floor(crossings[i + 1] - 0.5));
      for (let x = xa; x <= xb; x++) {
        const o = (y * width + x) * 3;
        buffer[o] = rgb[0];
        buffer[o + 1] = rgb[1];
        buffer[o + 2] = rgb[2];
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Rendering a spec
 * ------------------------------------------------------------------ */

function resolve(slot, colors) {
  if (typeof slot === 'string' && slot.startsWith('#')) return hexToRgb(slot);
  const value = colors[slot];
  return hexToRgb(typeof value === 'string' ? value : '#000000');
}

/**
 * Rasterize a pattern spec.
 *
 * @param {object} spec
 * @param {object} colors slot name to hex
 * @param {number} size output edge length in pixels
 * @returns {{width:number, height:number, data:Uint8Array}} RGB pixels
 */
export function rasterize(spec, colors, size = 384) {
  const big = size * SS;
  const scale = big / spec.tile;
  const buffer = new Uint8Array(big * big * 3);

  const background = resolve(spec.background || 'bg', colors);
  for (let i = 0; i < big * big; i++) {
    buffer[i * 3] = background[0];
    buffer[i * 3 + 1] = background[1];
    buffer[i * 3 + 2] = background[2];
  }

  for (const p of spec.draw) {
    const rgb = resolve(p.fill != null ? p.fill : p.stroke, colors);
    for (const subpaths of primitiveShapes(p)) {
      const scaled = subpaths.map((pts) => pts.map(([x, y]) => [x * scale, y * scale]));
      fillSubpaths(buffer, big, big, scaled, rgb);
    }
  }

  // Box-downsample for antialiasing.
  const out = new Uint8Array(size * size * 3);
  const area = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < SS; dy++) {
        const row = (y * SS + dy) * big;
        for (let dx = 0; dx < SS; dx++) {
          const o = (row + x * SS + dx) * 3;
          r += buffer[o];
          g += buffer[o + 1];
          b += buffer[o + 2];
        }
      }
      const o = (y * size + x) * 3;
      out[o] = Math.round(r / area);
      out[o + 1] = Math.round(g / area);
      out[o + 2] = Math.round(b / area);
    }
  }

  return { width: size, height: size, data: out };
}

/* ------------------------------------------------------------------ *
 * Checks
 * ------------------------------------------------------------------ */

function meanAbsDiff(image, ax, ay, bx, by, count, stepX, stepY) {
  const { width, data } = image;
  let total = 0;
  for (let i = 0; i < count; i++) {
    const oa = ((ay + stepY * i) * width + (ax + stepX * i)) * 3;
    const ob = ((by + stepY * i) * width + (bx + stepX * i)) * 3;
    total +=
      Math.abs(data[oa] - data[ob]) +
      Math.abs(data[oa + 1] - data[ob + 1]) +
      Math.abs(data[oa + 2] - data[ob + 2]);
  }
  return total / (count * 3);
}

/**
 * Does this tile meet its own opposite edge as smoothly as it meets itself
 * anywhere else?
 *
 * The left and right edge columns are compared, then the same comparison is
 * made for every neighbouring pair of columns inside the tile. A seamless
 * tile's edge difference sits inside the ordinary range of interior
 * differences; a broken one stands out immediately.
 */
export function checkSeams(image) {
  const { width, height } = image;

  const edgeV = meanAbsDiff(image, width - 1, 0, 0, 0, height, 0, 1);
  const edgeH = meanAbsDiff(image, 0, height - 1, 0, 0, width, 1, 0);

  const interiorV = [];
  for (let x = 1; x < width; x++) interiorV.push(meanAbsDiff(image, x - 1, 0, x, 0, height, 0, 1));
  const interiorH = [];
  for (let y = 1; y < height; y++) interiorH.push(meanAbsDiff(image, 0, y - 1, 0, y, width, 1, 0));

  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const max = (list) => list.reduce((a, b) => Math.max(a, b), 0);

  // The edge may be as different as the most different interior pair, plus
  // a small allowance for the half-pixel rounding at a tile boundary.
  const limitV = Math.max(max(interiorV), mean(interiorV) * 2) + 2;
  const limitH = Math.max(max(interiorH), mean(interiorH) * 2) + 2;

  return {
    vertical: { edge: edgeV, limit: limitV, ok: edgeV <= limitV },
    horizontal: { edge: edgeH, limit: limitH, ok: edgeH <= limitH },
    ok: edgeV <= limitV && edgeH <= limitH
  };
}

/* ------------------------------------------------------------------ *
 * Periodicity
 * ------------------------------------------------------------------ */

/**
 * Move a primitive bodily. Only the positional fields change; radii,
 * widths, and angles describe the shape, not where it sits.
 */
function movePrimitive(p, dx, dy) {
  const q = { ...p };
  if ('x' in q) q.x += dx;
  if ('y' in q) q.y += dy;
  if ('cx' in q) q.cx += dx;
  if ('cy' in q) q.cy += dy;
  if (q.pts) q.pts = q.pts.map(([x, y]) => [x + dx, y + dy]);
  return q;
}

/**
 * Is this tile actually periodic, or does it only look seamless at its
 * edges?
 *
 * Comparing edges catches a tile whose artwork stops at the boundary, but
 * not one whose construction fails to close — a herringbone whose pieces
 * lean the wrong way after a whole number of tiles, say, or a two-colour
 * alternation whose period does not divide the tile. Those tile cleanly at
 * the pixels along the join and still show a line across a wall.
 *
 * The honest test is translation. A tile that truly repeats describes an
 * infinite pattern, so drawing that pattern shifted by half a tile must
 * give the same picture as sliding the original image by half its width and
 * height. Anything that does not close shows up immediately, wherever in
 * the tile the failure is.
 *
 * @param {object} spec    the pattern, as the engine takes it
 * @param {object} colors  a colorway
 * @param {number} size    pixels; an even number, so half is exact
 * @returns {{mean: number, worst: number, ok: boolean}}
 */
export function checkPeriodic(spec, colors, size = 256) {
  const tile = spec.tile;
  const half = Math.floor(size / 2);

  const base = rasterize(spec, colors, size);

  // Shift everything by half a tile, then repeat each primitive at the
  // eight neighbouring tile positions so a shape that now sits outside is
  // still drawn where the infinite pattern would put it.
  const spread = [];
  for (const p of spec.draw || []) {
    const moved = movePrimitive(p, tile / 2, tile / 2);
    for (const dx of [-tile, 0, tile]) {
      for (const dy of [-tile, 0, tile]) spread.push(movePrimitive(moved, dx, dy));
    }
  }

  const shifted = rasterize({ ...spec, draw: spread }, colors, size);

  let total = 0;
  let worst = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = (((y + half) % size) * size + ((x + half) % size)) * 3;
      const b = (y * size + x) * 3;
      const d =
        (Math.abs(base.data[a] - shifted.data[b]) +
          Math.abs(base.data[a + 1] - shifted.data[b + 1]) +
          Math.abs(base.data[a + 2] - shifted.data[b + 2])) / 3;
      total += d;
      if (d > worst) worst = d;
    }
  }

  const mean = total / (size * size);

  // A tile that closes properly comes back identical apart from the odd
  // pixel at a mitred tip, where antialiasing lands differently at a
  // half-pixel offset. A tile that does not close is out by whole shapes.
  return { mean, worst, ok: mean < 1 };
}

/* ------------------------------------------------------------------ *
 * Telling patterns apart
 * ------------------------------------------------------------------ */

/**
 * A coarse description of what a tile looks like.
 *
 * The tile is divided into a grid and the mean tone of each cell recorded.
 * Two patterns with the same fingerprint are the same picture as far as a
 * customer scrolling a grid of thumbnails is concerned, whatever their
 * specs say — which is the thing worth checking, because a collection of
 * forty patterns is only worth forty if they are actually different.
 *
 * @returns {number[]} one value per cell
 */
export function fingerprint(image, cells = 16) {
  const step = Math.floor(image.width / cells);
  const print = [];

  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      let total = 0;
      let count = 0;
      for (let y = gy * step; y < (gy + 1) * step; y++) {
        for (let x = gx * step; x < (gx + 1) * step; x++) {
          total += image.data[(y * image.width + x) * 3];
          count++;
        }
      }
      print.push(total / count);
    }
  }

  return print;
}

/**
 * A fingerprint for a texture.
 *
 * Mean tone cannot tell grain apart: sandpaper and linen both average to
 * the same flat grey, so the measure that matters is how the tile varies,
 * not what it averages to. Each cell contributes its mean and its spread,
 * and the whole tile contributes its roughness along each axis — which is
 * what separates a weave from a speckle, and a fine grit from a coarse one.
 */
export function textureFingerprint(image, cells = 8) {
  const step = Math.floor(image.width / cells);
  const out = [];

  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      let sum = 0;
      let squares = 0;
      let count = 0;
      for (let y = gy * step; y < (gy + 1) * step; y++) {
        for (let x = gx * step; x < (gx + 1) * step; x++) {
          const v = image.data[(y * image.width + x) * 3];
          sum += v;
          squares += v * v;
          count++;
        }
      }
      const mean = sum / count;
      out.push(mean, Math.sqrt(Math.max(0, squares / count - mean * mean)));
    }
  }

  // Roughness across and down, weighted up so direction counts for as much
  // as tone — a vertical drag and a horizontal one are different textures.
  for (const down of [false, true]) {
    let total = 0;
    let count = 0;
    for (let y = 1; y < image.height; y++) {
      for (let x = 1; x < image.width; x++) {
        const here = (y * image.width + x) * 3;
        const there = down ? ((y - 1) * image.width + x) * 3 : (y * image.width + x - 1) * 3;
        total += Math.abs(image.data[here] - image.data[there]);
        count++;
      }
    }
    out.push((total / count) * 8);
  }

  return out;
}

/**
 * How far apart two fingerprints are, as a mean difference per cell.
 * Zero means identical; a few units means the difference would not be
 * noticed in a thumbnail.
 */
export function fingerprintDistance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

/**
 * Is the tile well filled, without a large bare patch or a solid block?
 * Coverage is measured against the background color over a grid of cells.
 */
export function checkCoverage(image, backgroundHex, options = {}) {
  const { width, height, data } = image;
  const bg = hexToRgb(backgroundHex);
  const cells = options.cells || 4;
  const cellW = Math.floor(width / cells);
  const cellH = Math.floor(height / cells);
  const perCell = [];
  let inkTotal = 0;

  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      let ink = 0;
      for (let y = cy * cellH; y < (cy + 1) * cellH; y++) {
        for (let x = cx * cellW; x < (cx + 1) * cellW; x++) {
          const o = (y * width + x) * 3;
          const distance =
            Math.abs(data[o] - bg[0]) + Math.abs(data[o + 1] - bg[1]) + Math.abs(data[o + 2] - bg[2]);
          if (distance > 24) ink++;
        }
      }
      const fraction = ink / (cellW * cellH);
      perCell.push(fraction);
      inkTotal += ink;
    }
  }

  const overall = inkTotal / (cells * cells * cellW * cellH);
  const emptiest = Math.min(...perCell);
  const fullest = Math.max(...perCell);

  // How much the tile varies overall. A tile that is one flat color has
  // nothing on it, whatever its coverage against the background happens to
  // say — a solid field of the "ink" color reads as 100% covered.
  let sum = 0;
  let sumSquares = 0;
  const samples = width * height;
  for (let i = 0; i < samples; i++) {
    const o = i * 3;
    const value = (data[o] + data[o + 1] + data[o + 2]) / 3;
    sum += value;
    sumSquares += value * value;
  }
  const variance = sumSquares / samples - (sum / samples) ** 2;

  const minInk = options.minInk == null ? 0.03 : options.minInk;

  return {
    overall,
    emptiest,
    fullest,
    variance,
    /*
     * A tile has to carry something, and must not leave an awkward hole.
     *
     * Coverage alone is the wrong measure for both: a bold two-color design
     * such as solid chevron bands covers the whole tile and still has
     * plenty going on, while a tile painted one flat color covers the whole
     * tile and has nothing. So the test is variance for "is anything
     * there", and the bare-cell rule only applies to designs that actually
     * sit on a visible background.
     *
     * The bare-cell rule also only applies to patterns dense enough for an
     * empty quarter to look like a mistake. An open line pattern such as a
     * Truchet arc tiling is supposed to leave room, and flagging that would
     * be throwing away good work.
     */
    ok:
      variance >= (options.minVariance == null ? 40 : options.minVariance) &&
      overall >= minInk &&
      !(overall >= 0.18 && overall < 0.6 && emptiest < 0.002)
  };
}

/* ------------------------------------------------------------------ *
 * PNG
 * ------------------------------------------------------------------ */

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/**
 * Encode pixels as a PNG.
 *
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} channels 1 for grayscale, 3 for RGB
 */
export function encodePng(pixels, width, height, channels = 3) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);

  // Filter type 1 (Sub) on every row, which suits the smooth gradients and
  // repeated runs these tiles are made of.
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 1;
    for (let x = 0; x < stride; x++) {
      const current = pixels[y * stride + x];
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      raw[rowStart + 1 + x] = (current - left) & 0xff;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 1 ? 0 : 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

export default { rasterize, checkSeams, checkCoverage, encodePng };
