/*
 * Repeat Builder
 *
 * Turns a buyer's own motifs into a seamless repeat: full drop, half drop,
 * brick, or mirror, with adjustable spacing, scale, rotation, and
 * background, plus a seam check.
 *
 * Everything happens in the browser. The files a buyer loads are read with
 * FileReader and drawn to a canvas on their machine; nothing is uploaded,
 * and there is no code here that could upload anything.
 *
 * Uploaded SVGs are loaded only as images, through an object URL and an
 * <img> element. An SVG drawn that way cannot run script, load anything of
 * its own, or reach into the page — which is exactly why it is never
 * inserted into the document.
 */

import { el, loadStyles, slider, segmented, toggle, status, guard, debounce } from '../_shared/ui.mjs';
import { createStage, createMockups } from '../_shared/viewer.mjs';
import { makeZip, blobBytes } from '../_shared/zip.mjs';
import { licenseNote, maxExportSize, describeLimit, safeName, setPngDpi } from '../_shared/export.mjs';
import { LAYOUTS, planRepeat } from './layout.mjs';

const ACCEPT = 'image/png,image/jpeg,image/svg+xml';
const MAX_BYTES = 12 * 1024 * 1024;

export async function mount(container, context) {
  loadStyles();

  const statusNode = el('p', { class: 'module-status', role: 'status' });

  /* ---- State ---- */

  const state = {
    motifs: [],        // { id, name, bitmap, width, height }
    selected: 0,
    layout: 'half',
    offset: 0.5,
    scale: 0.55,
    rotation: 0,
    spacing: 0.1,
    background: '#f7f2e8',
    tile: 600,
    seamCheck: false
  };

  let tileCanvas = null;
  let currentUri = '';
  let exportLimit = 8192;

  maxExportSize().then((value) => {
    exportLimit = value;
    limitNote.textContent =
      'Largest export this device handles: ' + describeLimit(value) + '.';
    fillSizes();
  });

  /* ---- Loading motifs ---- */

  /**
   * Read one file into an ImageBitmap.
   *
   * SVG is routed through an <img> rather than being parsed or inserted,
   * so a file that contains script simply never gets the chance to run it.
   */
  async function readMotif(file) {
    if (!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)) {
      throw new Error('"' + file.name + '" is not a PNG, JPEG, or SVG.');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('"' + file.name + '" is larger than 12 MB. Scale it down first.');
    }

    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('"' + file.name + '" could not be read as an image.'));
        img.src = url;
      });

      // An SVG with no intrinsic size reports zero, so a sensible box is
      // used and the aspect ratio preserved by the browser.
      const width = image.naturalWidth || 512;
      const height = image.naturalHeight || 512;

      const canvas = document.createElement('canvas');
      const longest = Math.max(width, height);
      const limit = 1024;
      const factor = longest > limit ? limit / longest : 1;
      canvas.width = Math.max(1, Math.round(width * factor));
      canvas.height = Math.max(1, Math.round(height * factor));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      return {
        id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
        name: file.name.replace(/\.[^.]+$/, ''),
        canvas,
        width: canvas.width,
        height: canvas.height,
        dataUrl: canvas.toDataURL('image/png')
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function addFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    status(statusNode, 'Reading ' + files.length + ' file' + (files.length === 1 ? '' : 's') + '…', 'busy');
    for (const file of files) {
      const motif = await readMotif(file);
      state.motifs.push(motif);
    }
    state.selected = state.motifs.length - 1;
    renderMotifs();
    await saveProject();
    await build();
    status(statusNode, state.motifs.length + ' motif' + (state.motifs.length === 1 ? '' : 's') + ' loaded. Nothing left your device.');
  }

  /* ---- Building the repeat ---- */

  function drawMotifAt(ctx, motif, cx, cy, size, rotation) {
    const ratio = motif.width / motif.height;
    const w = ratio >= 1 ? size : size * ratio;
    const h = ratio >= 1 ? size / ratio : size;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(motif.canvas, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /**
   * Draw the tile.
   *
   * Every motif is drawn at its position and again at any wrapped position
   * whose box crosses an edge, which is what makes the tile meet itself.
   * Mirror flips alternate columns and rows instead of offsetting them.
   */
  function build() {
    const tile = state.tile;
    const canvas = document.createElement('canvas');
    canvas.width = tile;
    canvas.height = tile;
    const ctx = canvas.getContext('2d');

    if (state.background !== 'transparent') {
      ctx.fillStyle = state.background;
      ctx.fillRect(0, 0, tile, tile);
    }

    if (!state.motifs.length) {
      tileCanvas = canvas;
      return paint();
    }

    for (const place of planRepeat(state, tile, state.motifs.length)) {
      const motif = state.motifs[place.motif];
      ctx.save();
      if (place.flipX || place.flipY) {
        ctx.translate(place.x, place.y);
        ctx.scale(place.flipX ? -1 : 1, place.flipY ? -1 : 1);
        ctx.translate(-place.x, -place.y);
      }
      drawMotifAt(ctx, motif, place.x, place.y, place.size, place.rotation);
      ctx.restore();
    }

    tileCanvas = canvas;
    return paint();
  }

  function paint() {
    currentUri = tileCanvas.toDataURL('image/png');
    stage.setTile(currentUri);
    stage.setCaption(
      state.motifs.length
        ? LAYOUTS.find((l) => l.value === state.layout).label + ' · one repeat is ' + stage.size + 'px'
        : 'Load a motif to start'
    );
    mockups.render(currentUri, Math.max(10, Math.round(stage.size / 3)));
    renderSeamCheck();
  }

  /**
   * The seam check draws the tile four times with the join in the middle.
   * A repeat that does not meet shows a line straight down the centre.
   */
  function renderSeamCheck() {
    if (!state.seamCheck || !tileCanvas) {
      seamHost.hidden = true;
      return;
    }
    seamHost.hidden = false;
    const size = 260;
    const canvas = seamCanvas;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;
    // Each quadrant is the opposite corner of the tile, so all four tile
    // edges meet at the centre of this view.
    const s = tileCanvas.width;
    ctx.drawImage(tileCanvas, s / 2, s / 2, s / 2, s / 2, 0, 0, half, half);
    ctx.drawImage(tileCanvas, 0, s / 2, s / 2, s / 2, half, 0, half, half);
    ctx.drawImage(tileCanvas, s / 2, 0, s / 2, s / 2, 0, half, half, half);
    ctx.drawImage(tileCanvas, 0, 0, s / 2, s / 2, half, half, half, half);
  }

  /* ---- Saving ---- */

  async function saveProject() {
    await context.storage.set('project', {
      layout: state.layout,
      offset: state.offset,
      scale: state.scale,
      rotation: state.rotation,
      spacing: state.spacing,
      background: state.background,
      tile: state.tile,
      motifs: state.motifs.map((m) => ({ id: m.id, name: m.name, dataUrl: m.dataUrl }))
    });
  }

  async function restoreProject() {
    const saved = await context.storage.get('project');
    if (!saved) return false;

    Object.assign(state, {
      layout: saved.layout ?? state.layout,
      offset: saved.offset ?? state.offset,
      scale: saved.scale ?? state.scale,
      rotation: saved.rotation ?? state.rotation,
      spacing: saved.spacing ?? state.spacing,
      background: saved.background ?? state.background,
      tile: saved.tile ?? state.tile
    });

    for (const entry of saved.motifs || []) {
      const image = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = entry.dataUrl;
      });
      if (!image) continue;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      state.motifs.push({
        id: entry.id, name: entry.name, canvas,
        width: canvas.width, height: canvas.height, dataUrl: entry.dataUrl
      });
    }
    return true;
  }

  /* ---- Interface ---- */

  const stage = createStage({ initialTile: 180 });
  const mockups = createMockups();

  const fileInput = el('input', { type: 'file', accept: ACCEPT, multiple: true, class: 'visually-hidden' });
  fileInput.addEventListener('change', guard(statusNode, context, async () => {
    await addFiles(fileInput.files);
    fileInput.value = '';
  }));

  const drop = el('div', { class: 'drop', 'data-over': 'false' }, [
    el('button', {
      type: 'button', class: 'btn btn--primary', text: 'Choose motif files',
      onclick: () => fileInput.click()
    }),
    el('p', { class: 'drop__hint', text: 'PNG, JPEG, or SVG, up to 12 MB each. Or drag them here.' }),
    el('p', { class: 'drop__hint', text: 'Your images are read and drawn by this browser. Nothing is uploaded.' }),
    fileInput
  ]);

  for (const type of ['dragenter', 'dragover']) {
    drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.dataset.over = 'true';
    });
  }
  for (const type of ['dragleave', 'drop']) {
    drop.addEventListener(type, (event) => {
      event.preventDefault();
      drop.dataset.over = 'false';
    });
  }
  drop.addEventListener('drop', guard(statusNode, context, async (event) => {
    if (event.dataTransfer && event.dataTransfer.files.length) await addFiles(event.dataTransfer.files);
  }));

  const motifList = el('div', { class: 'motifs' });

  function renderMotifs() {
    motifList.textContent = '';
    state.motifs.forEach((motif, index) => {
      motifList.append(el('button', {
        type: 'button', class: 'motif', title: motif.name,
        'aria-pressed': index === state.selected ? 'true' : 'false',
        'aria-label': 'Motif ' + motif.name,
        onclick: () => {
          state.selected = index;
          renderMotifs();
        }
      }, [el('img', { src: motif.dataUrl, alt: '' })]));
    });

    if (state.motifs.length) {
      motifList.append(el('button', {
        type: 'button', class: 'btn', text: 'Remove last',
        style: { aspectRatio: 'auto' },
        onclick: guard(statusNode, context, async () => {
          state.motifs.pop();
          state.selected = Math.max(0, state.motifs.length - 1);
          renderMotifs();
          await saveProject();
          build();
        })
      }));
    }
  }

  const offsetControl = slider('Drop offset', {
    min: 0, max: 1, step: 0.01, value: state.offset,
    format: (v) => Math.round(v * 100) + '%',
    onInput: (v) => {
      state.offset = v;
      build();
      saveProject();
    }
  });

  const controls = el('div', {}, [
    el('div', { class: 'ctl' }, [
      el('span', { class: 'ctl__label', text: 'Repeat layout' }),
      segmented(LAYOUTS, state.layout, (value) => {
        state.layout = value;
        offsetControl.node.hidden = value !== 'half';
        build();
        saveProject();
      })
    ]),
    offsetControl.node,
    slider('Motif size', {
      min: 0.12, max: 1, step: 0.01, value: state.scale,
      format: (v) => Math.round(v * 100) + '%',
      onInput: (v) => {
        state.scale = v;
        build();
        saveProject();
      }
    }).node,
    slider('Spacing', {
      min: 0, max: 0.7, step: 0.01, value: state.spacing,
      format: (v) => Math.round(v * 100) + '%',
      onInput: (v) => {
        state.spacing = v;
        build();
        saveProject();
      }
    }).node,
    slider('Rotation', {
      min: -180, max: 180, step: 1, value: state.rotation,
      format: (v) => v + '°',
      onInput: (v) => {
        state.rotation = v;
        build();
        saveProject();
      }
    }).node
  ]);

  const bgInput = el('input', { type: 'color', value: state.background });
  bgInput.addEventListener('input', debounce(() => {
    state.background = bgInput.value;
    build();
    saveProject();
  }, 40));

  const transparentToggle = toggle('Transparent background', false, (on) => {
    state.background = on ? 'transparent' : bgInput.value;
    bgInput.disabled = on;
    build();
    saveProject();
  });

  const seamCanvas = el('canvas', { style: { width: '100%', height: 'auto', display: 'block' } });
  const seamHost = el('div', { hidden: true }, [
    el('div', { style: { border: '2px solid var(--ink)' } }, [seamCanvas]),
    el('p', { class: 'hint', text: 'All four edges of the tile meet in the middle of this view. If the repeat is sound, nothing runs through the centre.' })
  ]);

  /* ---- Export ---- */

  const sizeSelect = el('select');
  const sizes = [512, 1024, 2048, 4096, 6000, 8192];

  function fillSizes() {
    sizeSelect.textContent = '';
    for (const option of sizes) {
      if (option > exportLimit) continue;
      sizeSelect.append(el('option', { value: String(option), text: option + ' px' }));
    }
    sizeSelect.value = String(Math.min(2048, exportLimit));
  }
  fillSizes();

  let exportFormat = 'png';
  const limitNote = el('p', { class: 'hint', text: 'Checking the largest export this device can handle.' });

  const exportButton = el('button', {
    type: 'button', class: 'btn btn--primary', text: 'Download repeat',
    onclick: guard(statusNode, context, async () => {
      if (!state.motifs.length) throw new Error('Load at least one motif first.');
      exportButton.disabled = true;
      status(statusNode, 'Preparing the download…', 'busy');
      try {
        const size = Number(sizeSelect.value);
        const out = document.createElement('canvas');
        out.width = size;
        out.height = size;
        const ctx = out.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tileCanvas, 0, 0, size, size);

        const blob = await new Promise((resolve) =>
          out.toBlob(resolve, exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92)
        );
        if (!blob) throw new Error('That export was too large for this browser.');

        let bytes = await blobBytes(blob);
        if (exportFormat === 'png') bytes = setPngDpi(bytes, 300);

        const name = safeName(state.motifs[0].name || 'repeat') + '-' + state.layout;
        const zip = makeZip([
          { name: name + '.' + (exportFormat === 'jpeg' ? 'jpg' : 'png'), data: bytes },
          {
            name: 'LICENSE.txt',
            data: licenseNote(context, {
              pattern: 'Repeat built from your own motifs',
              size: size + ' x ' + size + ' px at 300 DPI'
            })
          }
        ]);

        context.files.downloadBlob(zip, 'tilecraft-' + name + '.zip');
        status(statusNode, 'Downloaded. Your motifs never left this device.');
      } finally {
        exportButton.disabled = false;
      }
    })
  });

  /* ---- Layout ---- */

  const zoomControl = slider('Pattern scale', {
    min: 40, max: 480, step: 2, value: 180,
    format: (v) => v + 'px',
    onInput: (v) => {
      stage.setSize(v);
      if (currentUri) mockups.render(currentUri, Math.max(10, Math.round(v / 3)));
    }
  });

  const left = el('div', {}, [
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Your motifs' }),
      drop,
      motifList
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Repeat' }),
      controls,
      el('div', { class: 'ctl' }, [
        el('span', { class: 'ctl__label', text: 'Background' }),
        el('div', { class: 'panel__row' }, [bgInput, transparentToggle])
      ])
    ])
  ]);

  const right = el('div', {}, [
    el('div', { class: 'panel' }, [
      stage.node,
      el('div', { style: { marginTop: '0.85rem' } }, [
        zoomControl.node,
        el('div', { class: 'panel__row', style: { marginTop: '0.6rem' } }, [
          toggle('Outline one repeat', false, (on) => stage.setOutline(on)),
          toggle('Seam check', false, (on) => {
            state.seamCheck = on;
            renderSeamCheck();
          })
        ]),
        seamHost
      ])
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'On products' }),
      mockups.node
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Export' }),
      el('div', { class: 'ctl' }, [
        el('span', { class: 'ctl__label', text: 'Format' }),
        segmented(
          [{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }],
          'png',
          (value) => {
            exportFormat = value;
          }
        )
      ]),
      el('div', { class: 'ctl' }, [
        el('label', { class: 'ctl__label', text: 'Pixel size', for: 'rb-size' }),
        sizeSelect
      ]),
      limitNote,
      el('div', { class: 'panel__row', style: { marginTop: '0.85rem' } }, [exportButton]),
      statusNode
    ])
  ]);

  sizeSelect.id = 'rb-size';
  offsetControl.node.hidden = state.layout !== 'half';

  container.append(el('div', { class: 'mod mod--split' }, [left, right]));

  const restored = await restoreProject();
  renderMotifs();
  build();
  if (restored && state.motifs.length) {
    status(statusNode, 'Picked up where you left off. Your motifs are stored in this browser only.');
  }

  return () => {};
}

export default { mount };
