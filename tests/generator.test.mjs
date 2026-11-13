/*
 * Pattern Generator Studio.
 *
 * A pattern somebody makes here is a product too: they will print it, so it
 * has to tile as reliably as one from a Collection. And the seed is a
 * promise — type it back in and you get the same pattern — so that is
 * checked rather than assumed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { generateSpec, randomSeed, MOTIFS, LAYOUTS, DEFAULTS } from '../studio/modules/pattern-generator-studio/generate.mjs';
import { rasterize, checkSeams, checkPeriodic } from '../tools/patterns/raster.mjs';
import { renderSvg } from '../js/patterns/engine.mjs';

const COLORS = { bg: '#f7f2e8', ink: '#14172a', accent: '#ef3c80', accent2: '#00b2ad' };
const COLORWAYS = [{ name: 'Riso', colors: COLORS }];

const make = (over, seed = 'TESTSEED') =>
  generateSpec({ ...DEFAULTS, ...over }, seed, COLORWAYS);

/* ------------------------------------------------------------------ *
 * Seeds
 * ------------------------------------------------------------------ */

test('the same seed and settings give exactly the same pattern', () => {
  const a = make({ motif: 'stars', density: 5 }, 'REPEATME');
  const b = make({ motif: 'stars', density: 5 }, 'REPEATME');
  assert.deepEqual(a.draw, b.draw);
});

test('a different seed gives a different pattern', () => {
  const a = make({ motif: 'blobs' }, 'SEEDONE1');
  const b = make({ motif: 'blobs' }, 'SEEDTWO2');
  assert.notDeepEqual(a.draw, b.draw);
});

test('changing a setting changes the pattern, with the seed held', () => {
  const base = make({ motif: 'arcs', density: 4 }, 'HOLDTHIS');
  assert.notDeepEqual(make({ motif: 'arcs', density: 7 }, 'HOLDTHIS').draw, base.draw);
  assert.notDeepEqual(make({ motif: 'arcs', density: 4, rotation: 45 }, 'HOLDTHIS').draw, base.draw);
  assert.notDeepEqual(make({ motif: 'crosses', density: 4 }, 'HOLDTHIS').draw, base.draw);
});

test('a generated seed is readable and uses no ambiguous characters', () => {
  for (let i = 0; i < 50; i++) {
    const seed = randomSeed();
    assert.match(seed, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6,10}$/, 'hard to read back: ' + seed);
  }
});

/* ------------------------------------------------------------------ *
 * Every motif, in every layout
 * ------------------------------------------------------------------ */

const motifValues = MOTIFS.map((m) => (typeof m === 'string' ? m : m.value));
const layoutValues = LAYOUTS.map((l) => (typeof l === 'string' ? l : l.value));

test('the generator offers a real choice', () => {
  assert.ok(motifValues.length >= 10, 'only ' + motifValues.length + ' motifs');
  assert.ok(layoutValues.length >= 3, 'only ' + layoutValues.length + ' layouts');
  for (const motif of motifValues) assert.ok(motif && typeof motif === 'string');
});

test('every motif and layout draws something, in clean SVG', () => {
  const problems = [];
  for (const motif of motifValues) {
    for (const layout of layoutValues) {
      const spec = make({ motif, layout }, 'DRAWCHCK');
      if (!spec.draw || !spec.draw.length) {
        problems.push(motif + '/' + layout + ' draws nothing');
        continue;
      }
      const svg = renderSvg(spec, COLORS);
      if (/NaN|undefined|Infinity/.test(svg)) problems.push(motif + '/' + layout + ' has a bad number in it');
    }
  }
  assert.deepEqual(problems, []);
});

test('every motif and layout produces a pattern that tiles', () => {
  /*
   * The whole point of the tool is seamless repeats. Each combination is
   * checked the same way the Collections are: the edges have to meet, and
   * shifting the pattern by half a tile has to give the same picture.
   */
  const problems = [];

  for (const motif of motifValues) {
    for (const layout of layoutValues) {
      const spec = make({ motif, layout }, 'TILECHCK');

      const seams = checkSeams(rasterize(spec, COLORS, 256));
      if (!seams.ok) {
        problems.push(
          motif + '/' + layout + ': edges do not meet (v ' + seams.vertical.edge.toFixed(1) +
          '/' + seams.vertical.limit.toFixed(1) + ', h ' + seams.horizontal.edge.toFixed(1) +
          '/' + seams.horizontal.limit.toFixed(1) + ')'
        );
      }

      const periodic = checkPeriodic(spec, COLORS, 256);
      if (!periodic.ok) {
        problems.push(motif + '/' + layout + ': does not repeat (' + periodic.mean.toFixed(2) + ' per pixel)');
      }
    }
  }

  assert.deepEqual(problems, []);
});

test('patterns tile at the extremes of every slider', () => {
  const extremes = [
    { density: 1 },
    { density: 12 },
    { scale: 0.2 },
    { scale: 1 },
    { rotation: 0 },
    { rotation: 90 },
    { spacing: 0 },
    { spacing: 0.9 },
    { accentShare: 0 },
    { accentShare: 1 },
    { jitter: 0 },
    { jitter: 1 },
    { weight: 0.1 },
    { weight: 1 }
  ];

  const problems = [];
  for (const over of extremes) {
    for (const layout of layoutValues) {
      const spec = make({ ...over, layout, motif: 'leaves' }, 'EDGECASE');
      if (!spec.draw.length) continue;
      const periodic = checkPeriodic(spec, COLORS, 256);
      if (!periodic.ok) {
        problems.push(JSON.stringify(over) + '/' + layout + ': ' + periodic.mean.toFixed(2));
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('the tile is square and its viewBox matches', () => {
  for (const motif of motifValues) {
    const spec = make({ motif }, 'BOXCHECK');
    assert.ok(spec.tile > 0);
    const svg = renderSvg(spec, COLORS);
    assert.ok(
      svg.includes('viewBox="0 0 ' + spec.tile + ' ' + spec.tile + '"'),
      motif + ': the viewBox is not the tile'
    );
  }
});

test('the defaults produce a usable pattern without touching anything', () => {
  const spec = generateSpec(DEFAULTS, randomSeed(), COLORWAYS);
  assert.ok(spec.draw.length > 0, 'the default settings draw nothing');
  assert.ok(checkPeriodic(spec, COLORS, 256).ok, 'the default settings do not tile');
});
