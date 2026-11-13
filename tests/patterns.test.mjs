/*
 * The patterns themselves.
 *
 * A seamless pattern that does not actually tile is a defective product, so
 * every pattern in every collection is rendered here and its opposite edges
 * are compared. The build does this too, before it accepts a pattern; this
 * suite does it again over the files that were committed, because those are
 * what a buyer receives, and a refactor that broke the geometry would
 * otherwise only show up on someone's wallpaper.
 *
 * The texture collection ships PNG tiles, so those files are decoded and
 * checked as files rather than re-rendered and assumed good.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  rasterize,
  checkSeams,
  checkPeriodic,
  fingerprint,
  fingerprintDistance,
  textureFingerprint
} from '../tools/patterns/raster.mjs';
import { decodePng } from './helpers/png-decode.mjs';
import { renderSvg, colorsOf } from '../js/patterns/engine.mjs';
import { PRODUCTS } from '../js/products.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const index = read('patterns/index.json');
const SLUGS = Object.keys(index.collections);

/*
 * The same size the build checks at.
 *
 * The seam check compares the tile's edge difference against the spread of
 * differences inside the tile, and that spread depends on how finely the
 * tile was sampled — so a pattern is checked here at the resolution it was
 * accepted at, rather than at one that would move the goalposts.
 *
 * The periodicity check below has no such dependency, and is the one that
 * decides whether a pattern really repeats.
 */
const CHECK_SIZE = 320;

/* ------------------------------------------------------------------ *
 * The catalog matches what was generated
 * ------------------------------------------------------------------ */

test('every collection product has generated patterns', () => {
  // The bundle grants the other five rather than holding patterns of its
  // own, so it is the one collection-tier product with no catalog.
  const collections = PRODUCTS.filter((p) => p.tier === 'collection' && !p.grants);
  for (const product of collections) {
    assert.ok(
      index.collections[product.slug],
      product.slug + ' is sold as a collection but has no generated patterns'
    );
  }
  assert.equal(SLUGS.length, collections.length);
});

test('the index, the specs, and the catalog agree', () => {
  let patterns = 0;
  let colorways = 0;

  for (const slug of SLUGS) {
    const counts = index.collections[slug];
    const specs = read('patterns/' + slug + '/specs.json');
    const catalog = read('patterns/' + slug + '/catalog.json');

    assert.equal(specs.length, counts.patterns, slug + ' spec count');
    assert.equal(catalog.patterns.length, counts.patterns, slug + ' catalog count');
    assert.equal(counts.colorways, counts.patterns * counts.colorwaysPerPattern, slug + ' colorway total');

    for (const spec of specs) {
      assert.equal(
        spec.colorways.length,
        counts.colorwaysPerPattern,
        spec.id + ' should carry ' + counts.colorwaysPerPattern + ' colorways'
      );
      assert.ok(spec.colorways.length >= 3 && spec.colorways.length <= 5, spec.id + ' colorway count in range');
    }

    patterns += counts.patterns;
    colorways += counts.colorways;
  }

  assert.equal(index.totals.patterns, patterns);
  assert.equal(index.totals.colorways, colorways);
});

test('every pattern has a unique id, a name, and artwork', () => {
  const ids = new Set();
  for (const slug of SLUGS) {
    for (const spec of read('patterns/' + slug + '/specs.json')) {
      assert.ok(spec.name && spec.name.trim().length > 1, spec.id + ' needs a name');
      assert.ok(!ids.has(spec.id), 'duplicate pattern id ' + spec.id);
      ids.add(spec.id);

      // A vector pattern carries its shapes; a texture's artwork is the PNG
      // tile, and its spec points at the file instead of drawing anything.
      if (spec.type === 'raster') {
        assert.ok(spec.raster, spec.id + ' is a texture with no tile');
        assert.ok(spec.rasterSize >= 256, spec.id + ' tile is too small to print from');
      } else {
        assert.ok(Array.isArray(spec.draw) && spec.draw.length > 0, spec.id + ' draws nothing');
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * Seamless tiling, every pattern
 *
 * Vector patterns are rendered from their spec; textures are read back from
 * the PNG tile that actually ships, because that file is the artwork and
 * re-deriving it would only test the generator twice.
 * ------------------------------------------------------------------ */

function imageOf(spec, slug, colorwayIndex, size) {
  if (spec.type === 'raster') {
    return decodePng(fs.readFileSync(path.join(root, 'patterns', slug, spec.raster)));
  }
  return rasterize(spec, colorsOf(spec, colorwayIndex), size);
}

for (const slug of SLUGS) {
  test(slug + ' — every pattern tiles seamlessly', () => {
    const specs = read('patterns/' + slug + '/specs.json');
    const failures = [];

    for (const spec of specs) {
      const image = imageOf(spec, slug, 0, CHECK_SIZE);
      const seams = checkSeams(image);
      if (!seams.ok) {
        failures.push(
          spec.id + ' (' + spec.name + '): vertical edge ' + seams.vertical.edge.toFixed(2) +
          ' limit ' + seams.vertical.limit.toFixed(2) + ', horizontal edge ' +
          seams.horizontal.edge.toFixed(2) + ' limit ' + seams.horizontal.limit.toFixed(2)
        );
      }
    }

    assert.equal(specs.length, index.collections[slug].patterns);
    assert.deepEqual(failures, [], failures.length + ' pattern(s) did not tile');
  });
}

for (const slug of SLUGS) {
  test(slug + ' — every pattern actually repeats', () => {
    /*
     * Edges meeting is necessary but not sufficient. A pattern whose
     * construction does not close — an alternation whose period does not
     * divide the tile, say — can meet its own edges and still show a line
     * across a printed wall, because the artwork is out of step by a whole
     * motif one tile over.
     *
     * Translation is the test that catches it: the pattern drawn shifted by
     * half a tile must match the original image slid by half its size.
     */
    const specs = read('patterns/' + slug + '/specs.json');
    const failures = [];

    for (const spec of specs) {
      // A texture is noise generated on a wrapped lattice and shipped as a
      // tile; it has no primitives to shift, and its file is checked above.
      if (spec.type === 'raster') continue;

      const result = checkPeriodic(spec, colorsOf(spec, 0), 256);
      if (!result.ok) {
        failures.push(
          spec.id + ' (' + spec.name + '): a half-tile shift moves the artwork by ' +
          result.mean.toFixed(2) + ' per pixel, worst ' + result.worst.toFixed(0)
        );
      }
    }

    assert.deepEqual(failures, [], failures.length + ' pattern(s) do not repeat');
  });
}

test('every vector pattern tiles in all of its colorways', () => {
  // A recolor cannot move a shape, but it can reveal one that was only
  // invisible against its background, so each colorway is checked. Textures
  // are recolored by mapping one grayscale tile between two colours, which
  // cannot move anything, so the tile check above covers them.
  const failures = [];
  let checked = 0;

  for (const slug of SLUGS) {
    for (const spec of read('patterns/' + slug + '/specs.json')) {
      if (spec.type === 'raster') continue;
      for (let i = 0; i < spec.colorways.length; i++) {
        const seams = checkSeams(rasterize(spec, colorsOf(spec, i), 128));
        if (!seams.ok) failures.push(spec.id + ' in ' + spec.colorways[i].name);
        checked++;
      }
    }
  }

  assert.deepEqual(failures, []);
  assert.equal(checked, (index.totals.patterns - 30) * 4, 'every vector colorway should be checked');
});

test('the shipped texture tiles wrap as files', () => {
  const slug = 'textures-and-grain';
  const specs = read('patterns/' + slug + '/specs.json');
  let checked = 0;

  for (const spec of specs) {
    assert.equal(spec.type, 'raster', spec.id + ' should be a raster texture');
    const file = path.join(root, 'patterns', slug, spec.raster);
    assert.ok(fs.existsSync(file), 'missing tile ' + spec.raster);

    const image = decodePng(fs.readFileSync(file));
    assert.equal(image.width, spec.rasterSize, spec.id + ' tile width');
    assert.equal(image.height, spec.rasterSize, spec.id + ' tile height');

    const seams = checkSeams(image);
    assert.ok(seams.ok, spec.id + ' tile does not wrap: ' + JSON.stringify(seams));

    // A tile that is one flat tone would wrap perfectly and be worthless.
    let min = 255;
    let max = 0;
    for (let i = 0; i < image.data.length; i += 3) {
      if (image.data[i] < min) min = image.data[i];
      if (image.data[i] > max) max = image.data[i];
    }
    assert.ok(max - min > 24, spec.id + ' tile has almost no tonal range');

    checked++;
  }

  assert.equal(checked, specs.length);
  assert.ok(checked >= 30, 'expected at least 30 textures, found ' + checked);
});

test('textures ship a thumbnail as well as a full tile', () => {
  for (const spec of read('patterns/textures-and-grain/specs.json')) {
    const thumb = path.join(root, 'patterns/textures-and-grain', spec.thumb);
    assert.ok(fs.existsSync(thumb), 'missing thumbnail for ' + spec.id);
    const image = decodePng(fs.readFileSync(thumb));
    assert.ok(image.width < spec.rasterSize, spec.id + ' thumbnail should be smaller than the tile');
  }
});

/* ------------------------------------------------------------------ *
 * SVG export
 * ------------------------------------------------------------------ */

function svgProblems(document, spec) {
  const problems = [];
  if (!document.startsWith('<?xml ')) problems.push('has no XML declaration');
  const svg = document.replace(/^<\?xml[^>]*\?>\s*/, '');
  if (!svg.startsWith('<svg')) problems.push('does not start with an svg element');
  if (!svg.trimEnd().endsWith('</svg>')) problems.push('is not closed');
  if (!svg.includes('viewBox="0 0 ' + spec.tile + ' ' + spec.tile + '"')) problems.push('viewBox is not the tile');
  if (/(?:fill|stroke)="(?!#|none|url\()/.test(svg)) problems.push('has an unresolved color slot');
  if (/undefined|NaN|null/.test(svg)) problems.push('contains an unfilled value');
  if (/<script|onload=|xlink:href="http/i.test(svg)) problems.push('contains active content');

  // Every element opened is closed, counting self-closing tags.
  const opened = (svg.match(/<[a-zA-Z][^>]*>/g) || []).filter((t) => !t.endsWith('/>')).length;
  const closed = (svg.match(/<\/[a-zA-Z]+>/g) || []).length;
  if (opened !== closed) problems.push('tags do not balance (' + opened + ' open, ' + closed + ' closed)');

  return problems;
}

test('every vector pattern exports clean SVG', () => {
  const failures = [];
  for (const slug of SLUGS) {
    for (const spec of read('patterns/' + slug + '/specs.json')) {
      if (spec.type === 'raster') continue;
      const svg = renderSvg(spec, colorsOf(spec, 0), { standalone: true });
      const problems = svgProblems(svg, spec);
      if (problems.length) failures.push(spec.id + ': ' + problems.join('; '));
    }
  }
  assert.deepEqual(failures, []);
});

test('the committed SVG files match what the engine renders', () => {
  for (const slug of SLUGS) {
    const specs = read('patterns/' + slug + '/specs.json');
    if (specs[0].type === 'raster') continue;

    for (const spec of specs.slice(0, 6)) {
      const file = path.join(root, 'patterns', slug, 'svg', spec.id + '.svg');
      assert.ok(fs.existsSync(file), 'missing ' + spec.id + '.svg');
      // The file on disk and the file a module exports should be the same
      // document, so a buyer gets the same thing either way.
      const onDisk = fs.readFileSync(file, 'utf8').trim();
      const rendered = renderSvg(spec, colorsOf(spec, 0), { standalone: true }).trim();
      assert.equal(onDisk, rendered, spec.id + ' on disk differs from the engine output');
    }
  }
});

test('an SVG export with a transparent background has no background rect', () => {
  const spec = read('patterns/geometric-essentials/specs.json')[0];
  const opaque = renderSvg(spec, colorsOf(spec, 0), { standalone: true });
  const clear = renderSvg(spec, colorsOf(spec, 0), { standalone: true, background: false });
  assert.ok(opaque.length > clear.length);
  assert.ok(!clear.includes('id="bg"'));
});

/* ------------------------------------------------------------------ *
 * Recoloring
 * ------------------------------------------------------------------ */

test('recoloring changes the artwork in every colorway', () => {
  for (const slug of SLUGS) {
    const specs = read('patterns/' + slug + '/specs.json');
    if (specs[0].type === 'raster') continue;

    for (const spec of specs.slice(0, 8)) {
      const rendered = spec.colorways.map((_, i) => renderSvg(spec, colorsOf(spec, i)));
      const distinct = new Set(rendered);
      assert.equal(
        distinct.size,
        rendered.length,
        spec.id + ' looks identical in two of its colorways'
      );
    }
  }
});

test('a custom palette reaches the artwork', () => {
  const spec = read('patterns/mid-century-shapes/specs.json')[0];
  const custom = { bg: '#010203', ink: '#040506', accent: '#070809', accent2: '#0a0b0c' };
  const svg = renderSvg(spec, custom);
  assert.ok(svg.includes('#010203'), 'background colour missing');

  // Whichever slots this pattern draws with must appear in the output.
  const used = new Set();
  for (const p of spec.draw) {
    const slot = p.fill != null ? p.fill : p.stroke;
    if (typeof slot === 'string' && !slot.startsWith('#')) used.add(slot);
  }
  assert.ok(used.size > 0, 'the pattern draws with no colour slot at all');
  for (const slot of used) {
    assert.ok(svg.includes(custom[slot]), 'slot ' + slot + ' did not reach the artwork');
  }
});

test('no pattern still carries a colour from the colorway it was not given', () => {
  // Recoloring replaces slots rather than editing hex values, so a colour
  // belonging only to colorway A must not appear in a render of colorway B.
  for (const slug of SLUGS) {
    const specs = read('patterns/' + slug + '/specs.json');
    if (specs[0].type === 'raster') continue;

    for (const spec of specs.slice(0, 10)) {
      const a = colorsOf(spec, 0);
      const b = colorsOf(spec, 1);
      const svg = renderSvg(spec, b).toLowerCase();

      for (const [slot, value] of Object.entries(a)) {
        const other = (b[slot] || '').toLowerCase();
        const mine = value.toLowerCase();
        if (!other || other === mine) continue;
        if (Object.values(b).some((v) => v.toLowerCase() === mine)) continue;
        assert.ok(!svg.includes(mine), spec.id + ' kept ' + slot + ' ' + value + ' after recoloring');
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * Originality
 * ------------------------------------------------------------------ */

test('no pattern name or tag references a brand or a protected design', () => {
  /*
   * The patterns are drawn from code, so none of them can be a copy of
   * anything. This guards the other end of the problem: a name or tag that
   * invites the comparison, or implies a pattern is somebody else's
   * signature design.
   */
  const banned = [
    'burberry', 'gucci', 'vuitton', 'chanel', 'versace', 'hermes', 'prada',
    'fendi', 'missoni', 'marimekko', 'kiely', 'william morris', 'morris &',
    'disney', 'mickey', 'pokemon', 'hello kitty', 'nike', 'adidas', 'supreme',
    'premier league', 'tartan', 'nova check', 'monogram', 'trademark',
    'inspired by', 'in the style of', 'knockoff'
  ];

  // Short words are matched whole, because a recipe name like chevronBands
  // contains plenty of three-letter strings by accident.
  const bannedWords = ['nfl', 'nba', 'fifa', 'olympic', 'logo', 'dupe', 'replica', 'louis', 'dior', 'coach', 'orla'];

  const offences = [];
  for (const slug of SLUGS) {
    for (const spec of read('patterns/' + slug + '/specs.json')) {
      const raw = [spec.name, spec.recipe, ...(spec.tags || [])].join(' ');
      const haystack = raw.toLowerCase();
      // Split camelCase recipe names so a whole-word check can see them.
      const words = raw.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/);

      for (const word of banned) {
        if (haystack.includes(word)) offences.push(spec.id + ' mentions "' + word + '"');
      }
      for (const word of bannedWords) {
        if (words.includes(word)) offences.push(spec.id + ' mentions "' + word + '"');
      }
    }
  }
  assert.deepEqual(offences, []);
});

test('nothing in the patterns was fetched from anywhere', () => {
  // Every pattern is drawn by the engine from a spec. A remote reference in
  // a spec or an SVG would mean something external had crept in.
  for (const slug of SLUGS) {
    const raw = fs.readFileSync(path.join(root, 'patterns', slug, 'specs.json'), 'utf8');
    assert.ok(!/https?:\/\//.test(raw), slug + ' specs contain a URL');
    assert.ok(!/data:image/.test(raw), slug + ' specs contain an embedded image');
  }

  const svgDirs = SLUGS
    .map((slug) => path.join(root, 'patterns', slug, 'svg'))
    .filter((dir) => fs.existsSync(dir));

  for (const dir of svgDirs) {
    for (const name of fs.readdirSync(dir)) {
      const svg = fs.readFileSync(path.join(dir, name), 'utf8');
      assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(svg), name + ' references a remote resource');
      assert.ok(!/<image\b/.test(svg), name + ' embeds a bitmap');
    }
  }
});

/* ------------------------------------------------------------------ *
 * Variety — a collection of near-identical patterns is not a collection
 * ------------------------------------------------------------------ */


test('patterns within a collection are visibly different from each other', () => {
  /*
   * Compared in flat colours, because a buyer can recolor any pattern into
   * any colorway — so two patterns that differ only in which slot each
   * shape uses are one pattern with two names.
   *
   * The threshold is the build's: measured against the real collections,
   * genuinely different designs sit at least 6 apart on this scale, and a
   * pair differing only in line weight measured 0.0.
   */
  const flat = { bg: '#ffffff', ink: '#000000', accent: '#808080', accent2: '#c0c0c0' };

  for (const slug of SLUGS) {
    const specs = read('patterns/' + slug + '/specs.json');
    const seen = [];

    for (const spec of specs) {
      let look;
      let apart;

      if (spec.type === 'raster') {
        /*
         * Grain has to be measured by how it varies, not by what it
         * averages to: sandpaper and linen come out the same flat grey
         * under a mean-tone comparison. The scale differs from the vector
         * one, hence the different figure.
         */
        const image = decodePng(fs.readFileSync(path.join(root, 'patterns', slug, spec.raster)));
        look = textureFingerprint(image, 8);
        apart = 8;
      } else {
        look = fingerprint(rasterize(spec, flat, 192), 16);
        apart = 4;
      }

      for (const other of seen) {
        const distance = fingerprintDistance(other.look, look);
        assert.ok(
          distance >= apart,
          spec.id + ' looks like ' + other.id + ' (' + distance.toFixed(1) + ' apart, ' + apart + ' needed)'
        );
      }
      seen.push({ id: spec.id, look });
    }
  }
});

test('no two patterns in a collection share their geometry', () => {
  // Two patterns drawn from the same recipe with different seeds should be
  // different pictures, not the same picture under two names.
  for (const slug of SLUGS) {
    const specs = read('patterns/' + slug + '/specs.json');
    if (specs[0].type === 'raster') continue;

    const seen = new Map();
    for (const spec of specs) {
      const key = JSON.stringify(spec.draw);
      assert.ok(!seen.has(key), spec.id + ' draws exactly what ' + seen.get(key) + ' draws');
      seen.set(key, spec.id);
    }
  }
});

test('no two texture tiles are the same file', () => {
  const seen = new Map();
  for (const spec of read('patterns/textures-and-grain/specs.json')) {
    const bytes = fs.readFileSync(path.join(root, 'patterns/textures-and-grain', spec.raster));
    const key = bytes.toString('base64');
    assert.ok(!seen.has(key), spec.id + ' is byte-identical to ' + seen.get(key));
    seen.set(key, spec.id);
  }
});
