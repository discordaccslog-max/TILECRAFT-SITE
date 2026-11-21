/*
 * Seam Inspector
 *
 * Answers one question about a tile: does it actually repeat? It measures
 * the tile's opposite edges against the differences found inside it, shows
 * the four corners meeting so the join can be seen rather than taken on
 * trust, and can mend a tile that does not meet by offsetting or mirroring
 * it.
 *
 * Everything happens here. The image is read through an object URL into an
 * <img> and drawn to a canvas on this machine; nothing is uploaded. An
 * uploaded SVG is only ever drawn as an image and is never inserted into
 * the page, so it cannot run code of its own.
 *
 * See MODULES.md for the contract this implements.
 */

import { el, loadStyles, field, slider, segmented, status, guard } from '../_shared/ui.mjs';
import { makeZip } from '../_shared/zip.mjs';
import { licenseNote, safeName, setPngDpi } from '../_shared/export.mjs';

const MAX_BYTES = 12 * 1024 * 1024;
const WORK = 512;

const FIXES = [
  { value: 'none', label: 'As loaded' },
  { value: 'offset', label: 'Offset' },
  { value: 'mirror', label: 'Mirror' },
  { value: 'blend', label: 'Blend edges' }
];

/* ------------------------------------------------------------------ *
 * Measuring
 * ------------------------------------------------------------------ */

/**
 * How well a tile meets itself.
 *
 * The left and right edge columns are compared, then every neighbouring
 * pair of columns inside the tile, and the same downward. A tile that
 * repeats has an edge difference no worse than the differences already
 * present inside it; one that does not stands out immediately.
 */
function measure(data, width, height) {
  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const diff = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;

  const columnDiff = (x0, x1) => {
    let total = 0;
    for (let y = 0; y < height; y++) total += diff(at(x0, y), at(x1, y));
    return total / height;
  };
  const rowDiff = (y0, y1) => {
    let total = 0;
    for (let x = 0; x < width; x++) total += diff(at(x, y0), at(x, y1));
    return total / width;
  };

  const interiorV = [];
  for (let x = 1; x < width; x++) interiorV.push(columnDiff(x - 1, x));
  const interiorH = [];
  for (let y = 1; y < height; y++) interiorH.push(rowDiff(y - 1, y));

  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const max = (list) => list.reduce((a, b) => Math.max(a, b), 0);

  const edgeV = columnDiff(width - 1, 0);
  const edgeH = rowDiff(height - 1, 0);
  const limitV = Math.max(max(interiorV), mean(interiorV) * 2) + 2;
  const limitH = Math.max(max(interiorH), mean(interiorH) * 2) + 2;

  return {
    vertical: { edge: edgeV, limit: limitV, ok: edgeV <= limitV },
    horizontal: { edge: edgeH, limit: limitH, ok: edgeH <= limitH },
    ok: edgeV <= limitV && edgeH <= limitH
  };
}

/* ------------------------------------------------------------------ *
 * Mending
 * ------------------------------------------------------------------ */

/** Roll the image half a tile both ways, which moves the seam inward. */
function offsetTile(source) {
  const size = source.width;
  const half = Math.floor(size / 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  for (const dx of [0, half - size, half]) {
    for (const dy of [0, half - size, half]) {
      ctx.drawImage(source, dx, dy);
    }
  }
  return canvas;
}

/**
 * Mirror the tile into each quarter. Any image treated this way repeats,
 * because every edge becomes a reflection of itself — at the cost of a
 * visible axis of symmetry.
 */
function mirrorTile(source) {
  const size = source.width;
  const half = Math.round(size / 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(source, 0, 0, size, size, 0, 0, half, half);
  ctx.save();
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0, size, size, 0, 0, half, half);
  ctx.restore();
  ctx.save();
  ctx.translate(0, size);
  ctx.scale(1, -1);
  ctx.drawImage(source, 0, 0, size, size, 0, 0, half, half);
  ctx.restore();
  ctx.save();
  ctx.translate(size, size);
  ctx.scale(-1, -1);
  ctx.drawImage(source, 0, 0, size, size, 0, 0, half, half);
  ctx.restore();

  return canvas;
}

/**
 * Fade the tile's own edges into the opposite ones.
 *
 * A band at each edge is cross-faded with the band from the other side, so
 * the two meet exactly. It softens the border, which suits texture and
 * noise and suits hard geometry much less.
 */
function blendEdges(source, share) {
  const size = source.width;
  const band = Math.max(2, Math.round(size * share));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);

  const image = ctx.getImageData(0, 0, size, size);
  const d = image.data;
  const copy = new Uint8ClampedArray(d);

  const mix = (x, y, ox, oy, t) => {
    const i = (y * size + x) * 4;
    const j = (((oy + size) % size) * size + ((ox + size) % size)) * 4;
    for (let k = 0; k < 3; k++) d[i + k] = copy[i + k] * (1 - t) + copy[j + k] * t;
  };

  for (let y = 0; y < size; y++) {
    for (let b = 0; b < band; b++) {
      const t = 0.5 * (1 - b / band);
      mix(b, y, b + size, y, t);
      mix(size - 1 - b, y, size - 1 - b - size, y, t);
    }
  }
  for (let x = 0; x < size; x++) {
    for (let b = 0; b < band; b++) {
      const t = 0.5 * (1 - b / band);
      mix(x, b, x, b + size, t);
      mix(x, size - 1 - b, x, size - 1 - b - size, t);
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

/* ------------------------------------------------------------------ *
 * The workspace
 * ------------------------------------------------------------------ */

export async function mount(container, context) {
  loadStyles();

  const state = { source: null, fixed: null, name: 'tile', fix: 'none', blend: 0.08 };

  const root = el('div', { class: 'mod' });
  const statusNode = el('p', { class: 'module-status', role: 'status' });

  /*
   * guard() wraps a function and hands the wrapper back rather than
   * running it, so every call site here invokes what it builds. Anything
   * that throws inside reports itself in the status line instead of
   * failing silently.
   */
  const withGuard = (run) => guard(statusNode, context, run)();

  const verdict = el('div', { class: 'panel' });
  const seamView = el('canvas', { class: 'mod__seam', width: 420, height: 420 });
  const tiledView = el('div', { class: 'stage__surface mod__repeat' });

  /** The four corners of the tile meeting in the middle of the view. */
  function drawSeam(canvas) {
    const ctx = seamView.getContext('2d');
    const size = seamView.width;
    const half = size / 2;
    ctx.clearRect(0, 0, size, size);
    for (const [dx, dy] of [[0, 0], [half, 0], [0, half], [half, half]]) {
      ctx.drawImage(canvas, dx === 0 ? canvas.width / 2 : 0, dy === 0 ? canvas.height / 2 : 0,
        canvas.width / 2, canvas.height / 2, dx, dy, half, half);
    }
    ctx.strokeStyle = 'rgba(239,60,128,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, size);
    ctx.moveTo(0, half);
    ctx.lineTo(size, half);
    ctx.stroke();
  }

  function applyFix() {
    if (!state.source) return null;
    if (state.fix === 'offset') return offsetTile(state.source);
    if (state.fix === 'mirror') return mirrorTile(state.source);
    if (state.fix === 'blend') return blendEdges(state.source, state.blend);
    return state.source;
  }

  function report() {
    if (!state.source) {
      verdict.textContent = 'Load a tile to check it.';
      return;
    }

    const canvas = applyFix();
    state.fixed = canvas;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = measure(data, canvas.width, canvas.height);

    drawSeam(canvas);
    tiledView.style.backgroundImage = 'url("' + canvas.toDataURL('image/png') + '")';
    tiledView.style.backgroundSize = '96px 96px';

    verdict.textContent = '';
    verdict.append(
      el('h3', {
        text: result.ok ? 'This tile repeats.' : 'This tile does not repeat.'
      }),
      el('p', {
        text: result.ok
          ? 'Both edges meet within the range of differences already inside the tile, so it can be laid out at any size without a join showing.'
          : 'One or both edges differ from the opposite side by more than anything inside the tile, which will show as a line wherever it is repeated.'
      }),
      el('ul', { class: 'terms-plain' }, [
        el('li', {
          text:
            'Left to right: ' + result.vertical.edge.toFixed(1) +
            ' against a limit of ' + result.vertical.limit.toFixed(1) +
            ' — ' + (result.vertical.ok ? 'meets' : 'does not meet')
        }),
        el('li', {
          text:
            'Top to bottom: ' + result.horizontal.edge.toFixed(1) +
            ' against a limit of ' + result.horizontal.limit.toFixed(1) +
            ' — ' + (result.horizontal.ok ? 'meets' : 'does not meet')
        })
      ]),
      result.ok
        ? el('p', { class: 'hint', text: 'The view on the right shows the four corners meeting. A tile that repeats shows nothing at the cross.' })
        : el('p', { class: 'hint', text: 'Try an offset or a mirror below, then look at the cross again.' })
    );
  }

  /* ---- Loading ---- */

  const fileInput = el('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/svg+xml',
    style: { display: 'none' }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    withGuard(async () => {
      if (file.size > MAX_BYTES) throw new Error('That file is larger than 12 MB.');

      const url = URL.createObjectURL(file);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('That file could not be read as an image.'));
          img.src = url;
        });

        // Square it off at a working size, because a tile is square and
        // the measurements below compare opposite edges of equal length.
        const canvas = document.createElement('canvas');
        canvas.width = WORK;
        canvas.height = WORK;
        canvas.getContext('2d').drawImage(image, 0, 0, WORK, WORK);

        state.source = canvas;
        state.name = file.name.replace(/\.[^.]+$/, '') || 'tile';
        report();
        status(statusNode, 'Checked ' + file.name + '. Nothing left this device.');
      } finally {
        URL.revokeObjectURL(url);
        fileInput.value = '';
      }
    });
  });

  /* ---- Export ---- */

  const exportButton = el('button', {
    type: 'button',
    class: 'button button--ink',
    text: 'Download the tile',
    onclick: () => withGuard(async () => {
      if (!state.fixed) throw new Error('There is no tile loaded yet.');

      const blob = await new Promise((resolve) => state.fixed.toBlob(resolve, 'image/png'));
      let bytes = new Uint8Array(await blob.arrayBuffer());
      bytes = setPngDpi(bytes, 300);

      const base = safeName(state.name) + (state.fix === 'none' ? '' : '-' + state.fix);
      const zip = makeZip([
        { name: base + '.png', data: bytes },
        {
          name: 'LICENSE.txt',
          data: licenseNote(context, {
            pattern: state.name,
            size: WORK + ' x ' + WORK + ' px at 300 DPI'
          })
        }
      ]);

      context.files.downloadBlob(zip, 'tilecraft-' + base + '.zip');
      status(statusNode, 'Downloaded the tile as ' + base + '.png.');
    })
  });

  /* ---- Layout ---- */

  const blendSlider = slider('Blend width', {
    min: 2,
    max: 30,
    step: 1,
    value: Math.round(state.blend * 100),
    format: (v) => v + '% of the tile',
    onInput: (v) => {
      state.blend = v / 100;
      if (state.fix === 'blend') report();
    }
  });

  const panel = el('div', { class: 'panel' }, [
    el('h3', { class: 'panel__title', text: 'The tile' }),
    el('p', { class: 'panel__row' }, [
      el('button', {
        type: 'button',
        class: 'button button--small',
        text: 'Load a tile',
        onclick: () => fileInput.click()
      })
    ]),
    el('p', {
      class: 'hint',
      text: 'PNG, JPEG or SVG, up to 12 MB. Your file is read by this browser and is not uploaded.'
    }),

    el('h3', { class: 'panel__title', text: 'Mend it' }),
    field('Method', segmented(FIXES, state.fix, (value) => {
      state.fix = value;
      report();
    })),
    blendSlider.node,
    el('p', {
      class: 'hint',
      text:
        'An offset moves the join into the middle, where it can be retouched. ' +
        'A mirror always repeats but leaves an axis of symmetry. ' +
        'Blending fades the edges into each other, which suits texture more than hard geometry.'
    }),

    el('p', { class: 'panel__row' }, [exportButton]),
    fileInput
  ]);

  const main = el('div', { class: 'mod__main' }, [
    verdict,
    el('h3', { class: 'panel__title', text: 'Where the corners meet' }),
    seamView,
    el('h3', { class: 'panel__title', text: 'Repeated' }),
    tiledView
  ]);

  root.append(el('div', { class: 'mod mod--split' }, [panel, main]), statusNode);
  container.append(root);

  report();
  return () => {};
}

export default { mount };
