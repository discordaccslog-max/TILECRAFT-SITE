/*
 * Repeat Builder's layouts.
 *
 * A buyer brings their own motif and the module lays it into a repeat. The
 * part that decides whether that repeat tiles is the placement maths, so
 * it lives apart from the canvas and is tested here directly: every motif
 * that crosses an edge must also be drawn at the matching place on the
 * opposite edge, or the repeat shows a seam the moment it is used.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { planRepeat, gridFor, LAYOUTS, LAYOUT_VALUES } from '../studio/modules/repeat-builder/layout.mjs';

const TILE = 600;

const settings = (over = {}) => ({
  layout: 'full',
  scale: 0.25,
  spacing: 0.1,
  rotation: 0,
  offset: 0.5,
  ...over
});

/* ------------------------------------------------------------------ *
 * The grid
 * ------------------------------------------------------------------ */

test('the grid divides the tile exactly', () => {
  for (const scale of [0.12, 0.2, 0.25, 0.34, 0.5, 1]) {
    const { columns, cell } = gridFor(settings({ scale }), TILE);
    assert.ok(columns >= 1);
    assert.ok(Math.abs(columns * cell - TILE) < 1e-9, 'the grid does not fill the tile at scale ' + scale);
  }
});

test('a larger scale means fewer, bigger motifs', () => {
  const small = gridFor(settings({ scale: 0.15 }), TILE);
  const large = gridFor(settings({ scale: 0.5 }), TILE);
  assert.ok(large.columns < small.columns);
  assert.ok(large.cell > small.cell);
});

test('spacing shrinks the motif without changing the grid', () => {
  const tight = gridFor(settings({ spacing: 0 }), TILE);
  const loose = gridFor(settings({ spacing: 0.5 }), TILE);
  assert.equal(tight.columns, loose.columns);
  assert.equal(tight.cell, loose.cell);
  assert.ok(loose.size < tight.size);
  assert.ok(Math.abs(loose.size - tight.size / 2) < 1e-9);
});

test('an extreme scale does not produce an empty or absurd grid', () => {
  for (const scale of [0, -1, 0.001, 5, NaN]) {
    const { columns } = gridFor(settings({ scale }), TILE);
    assert.ok(Number.isFinite(columns) && columns >= 1 && columns <= 9, 'scale ' + scale + ' gave ' + columns);
  }
});

/* ------------------------------------------------------------------ *
 * Every layout places something
 * ------------------------------------------------------------------ */

test('the four layouts the interface offers are the four it plans', () => {
  assert.deepEqual(LAYOUT_VALUES, ['full', 'half', 'brick', 'mirror']);
  assert.equal(LAYOUTS.length, 4);
  for (const layout of LAYOUTS) {
    assert.ok(layout.label && layout.label.length > 2, layout.value + ' has no readable label');
  }
});

for (const layout of LAYOUT_VALUES) {
  test(layout + ' — lays out a full grid of motifs', () => {
    const state = settings({ layout });
    const { columns } = gridFor(state, TILE);
    const plan = planRepeat(state, TILE, 1);

    const original = plan.filter((p) => !p.wrapped);
    assert.equal(original.length, columns * columns, layout + ' did not place one motif per cell');

    for (const place of plan) {
      assert.ok(Number.isFinite(place.x) && Number.isFinite(place.y), layout + ' placed a motif nowhere');
      assert.ok(place.size > 0, layout + ' placed a motif with no size');
    }
  });

  test(layout + ' — every motif crossing an edge is drawn on the other side', () => {
    /*
     * This is the seamlessness check. For each placement whose box hangs
     * over an edge, the plan has to contain its counterpart one tile over;
     * without it the repeat has a half-motif at one edge and nothing to
     * meet it at the other.
     */
    const state = settings({ layout, spacing: 0, scale: 0.34 });
    const plan = planRepeat(state, TILE, 1);
    const at = (x, y) => plan.some((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6);

    for (const place of plan) {
      const half = place.size / 2;
      if (place.x - half < 0) assert.ok(at(place.x + TILE, place.y), layout + ': nothing meets the left edge');
      if (place.x + half > TILE) assert.ok(at(place.x - TILE, place.y), layout + ': nothing meets the right edge');
      if (place.y - half < 0) assert.ok(at(place.x, place.y + TILE), layout + ': nothing meets the top edge');
      if (place.y + half > TILE) assert.ok(at(place.x, place.y - TILE), layout + ': nothing meets the bottom edge');
    }
  });

  test(layout + ' — nothing is planned entirely outside the tile', () => {
    const plan = planRepeat(settings({ layout }), TILE, 1);
    for (const place of plan) {
      const half = place.size / 2;
      assert.ok(place.x + half > 0 && place.x - half < TILE, layout + ': a motif was planned off the side');
      assert.ok(place.y + half > 0 && place.y - half < TILE, layout + ': a motif was planned off the top or bottom');
    }
  });
}

/* ------------------------------------------------------------------ *
 * What each layout actually does
 * ------------------------------------------------------------------ */

test('a full drop lines every row up with the one above', () => {
  const plan = planRepeat(settings({ layout: 'full' }), TILE, 1).filter((p) => !p.wrapped);
  const columns = [...new Set(plan.map((p) => Math.round(p.x)))];
  const rows = [...new Set(plan.map((p) => Math.round(p.y)))];
  assert.equal(columns.length, rows.length, 'a full drop should be a square grid');
  assert.equal(plan.length, columns.length * rows.length);
});

test('a half drop offsets alternate rows by the offset', () => {
  const state = settings({ layout: 'half', offset: 0.5 });
  const { cell } = gridFor(state, TILE);
  const plan = planRepeat(state, TILE, 1).filter((p) => !p.wrapped);

  const firstRow = plan.filter((p) => Math.abs(p.y - cell * 0.5) < 1e-6).map((p) => p.x).sort((a, b) => a - b);
  const secondRow = plan.filter((p) => Math.abs(p.y - cell * 1.5) < 1e-6).map((p) => p.x).sort((a, b) => a - b);

  assert.ok(firstRow.length > 0 && secondRow.length > 0);
  // Every position in the second row sits half a cell from one in the first.
  for (const x of secondRow) {
    const shifted = ((x - cell * 0.5) % TILE + TILE) % TILE;
    assert.ok(
      firstRow.some((f) => Math.abs(f - shifted) < 1e-6),
      'the second row is not offset by half a cell'
    );
  }
});

test('the offset control changes the drop', () => {
  const half = planRepeat(settings({ layout: 'half', offset: 0.5 }), TILE, 1);
  const third = planRepeat(settings({ layout: 'half', offset: 0.33 }), TILE, 1);
  assert.notDeepEqual(half.map((p) => p.x), third.map((p) => p.x));
});

test('a brick offsets alternate rows by exactly half, whatever the offset', () => {
  const a = planRepeat(settings({ layout: 'brick', offset: 0.2 }), TILE, 1).map((p) => Math.round(p.x * 1000));
  const b = planRepeat(settings({ layout: 'brick', offset: 0.8 }), TILE, 1).map((p) => Math.round(p.x * 1000));
  assert.deepEqual(a, b, 'a brick should ignore the drop offset');
});

test('a mirror flips alternate columns and rows', () => {
  const plan = planRepeat(settings({ layout: 'mirror' }), TILE, 1).filter((p) => !p.wrapped);
  assert.ok(plan.some((p) => p.flipX && !p.flipY), 'nothing is mirrored across');
  assert.ok(plan.some((p) => !p.flipX && p.flipY), 'nothing is mirrored down');
  assert.ok(plan.some((p) => p.flipX && p.flipY), 'nothing is mirrored both ways');
  assert.ok(plan.some((p) => !p.flipX && !p.flipY), 'everything is mirrored');
});

test('no other layout mirrors anything', () => {
  for (const layout of ['full', 'half', 'brick']) {
    for (const place of planRepeat(settings({ layout }), TILE, 1)) {
      assert.equal(place.flipX, false, layout + ' mirrored a motif');
      assert.equal(place.flipY, false, layout + ' mirrored a motif');
    }
  }
});

/* ------------------------------------------------------------------ *
 * Several motifs, and none
 * ------------------------------------------------------------------ */

test('with no motif there is nothing to place', () => {
  assert.deepEqual(planRepeat(settings(), TILE, 0), []);
});

test('several motifs are dealt around the grid in turn', () => {
  const plan = planRepeat(settings({ scale: 0.25 }), TILE, 3).filter((p) => !p.wrapped);
  const used = new Set(plan.map((p) => p.motif));
  assert.deepEqual([...used].sort(), [0, 1, 2]);
  for (const place of plan) {
    assert.ok(Number.isInteger(place.motif) && place.motif >= 0 && place.motif < 3);
  }
});

test('a motif index is always one the caller can draw', () => {
  for (const count of [1, 2, 5, 9]) {
    for (const place of planRepeat(settings({ scale: 0.15 }), TILE, count)) {
      assert.ok(place.motif < count, 'index ' + place.motif + ' with only ' + count + ' motifs');
    }
  }
});

test('rotation is carried through to every placement', () => {
  for (const place of planRepeat(settings({ rotation: 37 }), TILE, 1)) {
    assert.equal(place.rotation, 37);
  }
});

test('an unknown layout falls back to a full drop rather than placing nothing', () => {
  const odd = planRepeat(settings({ layout: 'herringbone' }), TILE, 1);
  const full = planRepeat(settings({ layout: 'full' }), TILE, 1);
  assert.deepEqual(odd, full);
});

/* ------------------------------------------------------------------ *
 * The promise that uploads stay on the device
 * ------------------------------------------------------------------ */

test('Repeat Builder never sends a loaded image anywhere', () => {
  /*
   * The page says images never leave the device, and that has to be true
   * in the code, not only in the copy. There is no network call in the
   * module at all, which is the simplest way to be sure of it.
   */
  const source = fs.readFileSync(
    path.join(import.meta.dirname, '../studio/modules/repeat-builder/index.js'),
    'utf8'
  );

  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', 'WebSocket', 'EventSource']) {
    assert.ok(!source.includes(forbidden), 'Repeat Builder uses ' + forbidden);
  }
});

test('an uploaded SVG is only ever drawn, never put into the page', () => {
  // An SVG inserted into the document can run script; one drawn through an
  // <img> cannot. So the module must not have a path that inlines one.
  const source = fs.readFileSync(
    path.join(import.meta.dirname, '../studio/modules/repeat-builder/index.js'),
    'utf8'
  );

  assert.ok(source.includes('createObjectURL'), 'files should be read through an object URL');
  assert.ok(!/innerHTML\s*=\s*[^;]*svg/i.test(source), 'an SVG is written into the page');
  assert.ok(!source.includes('DOMParser'), 'an uploaded SVG is parsed into nodes');
  assert.ok(!source.includes('insertAdjacentHTML'), 'markup is inserted directly');
});
