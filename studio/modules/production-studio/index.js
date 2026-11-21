/*
 * Production Studio
 *
 * The export side of the Studio: large prints with their resolution
 * written into the file, vector SVG, batch colorways as a single zip, and
 * preset output sizes for common print work.
 *
 * It works on everything the buyer has activated, so the pattern list is
 * assembled from whichever collections their license unlocks.
 *
 * The export limit shown here is measured on the device rather than
 * assumed: a canvas past the browser's limit does not throw, it quietly
 * returns blank pixels, so sizes above the measured maximum are never
 * offered and an export cannot fail without saying so.
 */

import { el, loadStyles, slider, segmented, toggle, status, guard, debounce } from '../_shared/ui.mjs';
import { loadCollection, asPattern, tileDataUri, colorsOf } from '../_shared/render.mjs';
import { createStage } from '../_shared/viewer.mjs';
import { exportPattern, exportBatch, maxExportSize, describeLimit } from '../_shared/export.mjs';

/*
 * Preset output sizes, named for the job rather than for any platform.
 * Dimensions are in inches at the chosen resolution.
 */
const PRESETS = [
  { id: 'fabric-square', label: 'Fabric repeat, square', inches: [12, 12] },
  { id: 'fabric-large', label: 'Fabric repeat, large square', inches: [21, 21] },
  { id: 'fabric-yard', label: 'Fabric panel, rectangular', inches: [42, 36] },
  { id: 'wallpaper-drop', label: 'Wallpaper repeat drop', inches: [24, 36] },
  { id: 'wrap-sheet', label: 'Wrapping sheet', inches: [20, 28] },
  { id: 'print-square', label: 'Square product print area', inches: [12, 12] },
  { id: 'print-portrait', label: 'Portrait product print area', inches: [11, 14] },
  { id: 'print-wide', label: 'Wide product print area', inches: [16, 9] },
  { id: 'custom', label: 'Custom size', inches: null }
];

/*
 * The large-format presets, which come with the extra bought at checkout.
 * They are sizes a domestic printer will not reach, which is the point:
 * wide cloth, full wallpaper drops, and panel prints.
 */
const LARGE_PRESETS = [
  { id: 'cloth-wide', label: 'Wide cloth, full width', inches: [58, 36] },
  { id: 'cloth-bolt', label: 'Cloth bolt section', inches: [54, 72] },
  { id: 'wallpaper-full', label: 'Wallpaper drop, full height', inches: [27, 108] },
  { id: 'panel-door', label: 'Door panel', inches: [32, 80] },
  { id: 'panel-banner', label: 'Banner panel', inches: [36, 96] },
  { id: 'mural-section', label: 'Mural section', inches: [48, 48] }
];

const COLLECTIONS = [
  'geometric-essentials', 'textures-and-grain', 'botanical-linework',
  'mid-century-shapes', 'tile-and-terrazzo', 'art-deco-lines',
  'stripes-and-rules', 'checks-and-weaves', 'waves-and-water',
  'stars-and-night', 'folk-geometry', 'arches-and-columns',
  'scallops-and-shells', 'confetti-and-specks', 'crystal-and-facet'
];

export async function mount(container, context) {
  loadStyles();

  const statusNode = el('p', { class: 'module-status', role: 'status' });
  container.append(el('p', { class: 'hint', text: 'Loading your patterns…' }));

  /* ---- What this buyer can work on ---- */

  const unlocked = new Set(context.license && context.license.grants ? context.license.grants : []);
  // Production Studio is bought on its own, so its own license grants only
  // itself. The patterns it can reach are whatever else is on the device.
  const available = [];
  for (const slug of COLLECTIONS) {
    try {
      const { specs } = await loadCollection(slug);
      available.push({ slug, specs });
    } catch {
      // A collection that will not load is simply left out rather than
      // taking the whole module down with it.
    }
  }
  void unlocked;

  container.textContent = '';

  const patterns = available.flatMap(({ slug, specs }) =>
    specs.map((spec) => asPattern(spec, '/patterns/' + slug + '/'))
  );

  if (!patterns.length) {
    container.append(el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Nothing to export yet' }),
      el('p', { text: 'Production Studio works on patterns from the Collections and the other Studio Editions. Once one of those is activated on this device, its patterns appear here.' })
    ]));
    return () => {};
  }

  /* ---- State ---- */

  let selected = patterns[0];
  let colors = colorsOf(selected.spec, 0);
  let colorwayName = selected.spec.colorways[0].name;
  let preset = PRESETS[0];
  let dpi = 300;
  let format = 'png';
  let repeatInches = 6;
  let transparent = false;
  let limit = 8192;
  let customWidth = 4000;
  let customHeight = 4000;
  let naming = '{pattern}-{colorway}';
  let currentUri = '';

  const stage = createStage({ initialTile: 160 });

  /* ---- Measured limit ---- */

  const limitNote = el('p', { class: 'hint', text: 'Measuring the largest export this device can handle…' });

  maxExportSize().then((value) => {
    limit = value;
    limitNote.textContent =
      'This device was measured at ' + describeLimit(value) + '. ' +
      'At ' + dpi + ' DPI that is ' + (value / dpi).toFixed(1) + ' inches square. ' +
      'Anything larger is refused rather than written blank.';
    updateSummary();
  });

  /* ---- Size maths ---- */

  function targetSize() {
    if (preset.id === 'custom') return { width: customWidth, height: customHeight };
    return {
      width: Math.round(preset.inches[0] * dpi),
      height: Math.round(preset.inches[1] * dpi)
    };
  }

  function tilePixels() {
    return Math.max(16, Math.round(repeatInches * dpi));
  }

  const summary = el('p', { class: 'hint' });
  const warning = el('p', { class: 'module-status' });

  function updateSummary() {
    const { width, height } = targetSize();
    const megapixels = (width * height) / 1e6;
    summary.textContent =
      width.toLocaleString('en-US') + ' x ' + height.toLocaleString('en-US') + ' px · ' +
      (width / dpi).toFixed(1) + ' x ' + (height / dpi).toFixed(1) + ' in at ' + dpi + ' DPI · ' +
      megapixels.toFixed(1) + ' megapixels · repeat every ' + repeatInches + ' in';

    const tooLarge = width > limit || height > limit;
    warning.textContent = tooLarge
      ? 'That is larger than this device can produce (' + describeLimit(limit) + '). Reduce the size or the resolution.'
      : '';
    warning.className = 'module-status' + (tooLarge ? ' is-error' : '');
    downloadButton.disabled = tooLarge;
    batchButton.disabled = tooLarge;
  }

  /* ---- Pattern picker ---- */

  const search = el('input', {
    type: 'search', class: 'browser__search',
    placeholder: 'Search ' + patterns.length + ' patterns',
    'aria-label': 'Search patterns'
  });

  const grid = el('div', { class: 'grid', role: 'listbox', 'aria-label': 'Patterns' });

  function renderGrid() {
    const term = search.value.trim().toLowerCase();
    const visible = patterns.filter(
      (p) => !term || p.name.toLowerCase().includes(term) || p.tags.some((t) => t.includes(term))
    );
    grid.textContent = '';
    if (!visible.length) {
      grid.append(el('p', { class: 'grid__empty', text: 'Nothing matches that.' }));
      return;
    }
    for (const pattern of visible.slice(0, 200)) {
      const button = el('button', {
        type: 'button', class: 'swatch', role: 'option', title: pattern.name,
        'aria-label': pattern.name,
        'aria-pressed': pattern.id === selected.id ? 'true' : 'false',
        onclick: () => choose(pattern)
      }, [el('span', { class: 'swatch__name', text: pattern.name })]);
      grid.append(button);
      tileDataUri(pattern, colorsOf(pattern.spec, 0), pattern.isVector ? 0 : 128)
        .then((uri) => {
          button.style.backgroundImage = 'url("' + uri + '")';
        })
        .catch(() => {});
    }
  }

  search.addEventListener('input', debounce(renderGrid, 140));

  async function choose(pattern) {
    selected = pattern;
    colors = colorsOf(pattern.spec, 0);
    colorwayName = pattern.spec.colorways[0].name;
    title.textContent = pattern.name;
    kind.textContent = pattern.isVector
      ? 'Vector pattern — exports as SVG as well as raster'
      : 'Texture tile — raster only, no SVG version';
    svgOption.disabled = !pattern.isVector;
    if (!pattern.isVector && format === 'svg') {
      format = 'png';
      formatHost.textContent = '';
      formatHost.append(buildFormat());
    }
    renderGrid();
    renderBatch();
    currentUri = await tileDataUri(pattern, colors, pattern.isVector ? 0 : 512);
    stage.setTile(currentUri);
    stage.setCaption(pattern.name + ' · ' + colorwayName);
    await context.storage.set('lastPattern', pattern.id);
  }

  /* ---- Batch colorways ---- */

  let batchSelection = new Set();
  const batchGrid = el('div', { class: 'batch' });

  function allColorways() {
    return selected.spec.colorways.map((c) => ({ ...c }));
  }

  function renderBatch() {
    batchSelection = new Set(allColorways().map((c) => c.name));
    batchGrid.textContent = '';
    for (const way of allColorways()) {
      const cell = el('div', { class: 'batch__cell' }, [el('span', { text: way.name })]);
      batchGrid.append(cell);
      tileDataUri(selected, way.colors, selected.isVector ? 0 : 256)
        .then((uri) => {
          cell.style.backgroundImage = 'url("' + uri + '")';
        })
        .catch(() => {});
    }
    batchCount.textContent = batchSelection.size + ' colorways will be written into one zip.';
  }

  const batchCount = el('p', { class: 'hint' });

  /* ---- Controls ---- */

  /*
   * The large-format sizes are offered only to a license that carries
   * them, and the custom option stays last so it is always at the bottom
   * of the list whichever presets are above it.
   */
  const hasLargeFormat = !!(context.options && context.options.has('large-format'));
  const offered = hasLargeFormat
    ? [...PRESETS.filter((o) => o.id !== 'custom'), ...LARGE_PRESETS, PRESETS.find((o) => o.id === 'custom')]
    : PRESETS;

  const presetSelect = el('select');
  for (const option of offered) {
    presetSelect.append(el('option', {
      value: option.id,
      text: option.inches ? option.label + ' (' + option.inches[0] + ' x ' + option.inches[1] + ' in)' : option.label
    }));
  }
  presetSelect.addEventListener('change', () => {
    preset = offered.find((o) => o.id === presetSelect.value);
    customRow.hidden = preset.id !== 'custom';
    updateSummary();
  });

  const widthInput = el('input', { type: 'number', min: '64', max: '20000', value: String(customWidth), 'aria-label': 'Custom width in pixels' });
  const heightInput = el('input', { type: 'number', min: '64', max: '20000', value: String(customHeight), 'aria-label': 'Custom height in pixels' });
  for (const [input, set] of [[widthInput, (v) => { customWidth = v; }], [heightInput, (v) => { customHeight = v; }]]) {
    input.addEventListener('input', () => {
      const value = Math.max(64, Math.min(20000, Number(input.value) || 64));
      set(value);
      updateSummary();
    });
  }
  const customRow = el('div', { class: 'panel__row' }, [widthInput, el('span', { text: '×' }), heightInput]);
  customRow.hidden = true;

  const dpiSelect = el('select');
  for (const value of [150, 200, 300, 400, 600]) {
    dpiSelect.append(el('option', { value: String(value), text: value + ' DPI' }));
  }
  dpiSelect.value = '300';
  dpiSelect.addEventListener('change', () => {
    dpi = Number(dpiSelect.value);
    updateSummary();
  });

  const svgOption = { disabled: false };
  const formatHost = el('span');

  function buildFormat() {
    return segmented(
      [
        { value: 'png', label: 'PNG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'svg', label: 'SVG' }
      ],
      format,
      (value) => {
        if (value === 'svg' && !selected.isVector) {
          status(statusNode, 'Textures are raster tiles, so they have no SVG version.', 'error');
          formatHost.textContent = '';
          formatHost.append(buildFormat());
          return;
        }
        format = value;
      }
    );
  }
  formatHost.append(buildFormat());

  const repeatControl = slider('Repeat size', {
    min: 1, max: 24, step: 0.5, value: repeatInches,
    format: (v) => v + ' in',
    onInput: (v) => {
      repeatInches = v;
      updateSummary();
    }
  });

  const namingInput = el('input', { type: 'text', value: naming, 'aria-label': 'File naming pattern' });
  namingInput.addEventListener('input', () => {
    naming = namingInput.value || '{pattern}-{colorway}';
  });

  const downloadButton = el('button', { type: 'button', class: 'btn btn--primary', text: 'Export this colorway' });
  const batchButton = el('button', { type: 'button', class: 'btn', text: 'Export all colorways' });

  downloadButton.addEventListener('click', guard(statusNode, context, async () => {
    const { width, height } = targetSize();
    downloadButton.disabled = true;
    status(statusNode, 'Rendering ' + width + ' x ' + height + '…', 'busy');
    try {
      const result = await exportPattern({
        pattern: selected, colors, colorwayName, context,
        width, height, tilePixels: tilePixels(), format,
        transparent: transparent && format !== 'jpeg', dpi
      });
      context.files.downloadBlob(result.blob, result.filename);
      status(statusNode, 'Downloaded ' + result.filename + '.');
    } finally {
      downloadButton.disabled = false;
      updateSummary();
    }
  }));

  batchButton.addEventListener('click', guard(statusNode, context, async () => {
    const { width, height } = targetSize();
    const ways = allColorways().filter((c) => batchSelection.has(c.name));
    if (!ways.length) throw new Error('There are no colorways selected.');

    batchButton.disabled = true;
    try {
      const result = await exportBatch({
        pattern: selected, colorways: ways, context,
        width, height, tilePixels: tilePixels(), format,
        transparent: transparent && format !== 'jpeg', dpi, naming,
        onProgress: (index, total, name) => {
          status(statusNode, 'Rendering ' + index + ' of ' + total + ' — ' + name + '…', 'busy');
        }
      });
      context.files.downloadBlob(result.blob, result.filename);
      status(statusNode, 'Downloaded ' + ways.length + ' colorways in one zip.');
    } finally {
      batchButton.disabled = false;
      updateSummary();
    }
  }));

  /* ---- Layout ---- */

  const title = el('h2', { style: { fontSize: 'var(--step-1)' }, text: selected.name });
  const kind = el('p', { class: 'hint hint--inline', text: '' });

  const left = el('div', {}, [
    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Pattern' }),
      el('div', { class: 'browser__tools' }, [search]),
      grid
    ])
  ]);

  const right = el('div', {}, [
    el('div', { class: 'panel' }, [
      el('div', { style: { marginBottom: '0.75rem' } }, [title, kind]),
      stage.node
    ]),

    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Output' }),
      el('div', { class: 'ctl' }, [
        el('label', { class: 'ctl__label', text: 'Preset size', for: 'ps-preset' }),
        presetSelect
      ]),
      customRow,
      el('div', { class: 'ctl' }, [
        el('label', { class: 'ctl__label', text: 'Resolution', for: 'ps-dpi' }),
        dpiSelect,
        el('p', { class: 'ctl__hint', text: 'Written into PNG exports, so a print tool opens the file at the right physical size instead of assuming 72 DPI.' })
      ]),
      repeatControl.node,
      el('div', { class: 'ctl' }, [
        el('span', { class: 'ctl__label', text: 'Format' }),
        formatHost
      ]),
      el('div', { class: 'panel__row', style: { marginTop: '0.75rem' } }, [
        toggle('Transparent background', false, (v) => {
          transparent = v;
        })
      ]),
      summary,
      limitNote,
      warning,
      el('div', { class: 'panel__row', style: { marginTop: '0.85rem' } }, [downloadButton])
    ]),

    el('div', { class: 'panel' }, [
      el('h3', { class: 'panel__title', text: 'Batch colorways' }),
      batchGrid,
      batchCount,
      el('div', { class: 'ctl' }, [
        el('label', { class: 'ctl__label', text: 'File naming', for: 'ps-naming' }),
        namingInput,
        el('p', { class: 'ctl__hint', text: 'Use {pattern}, {colorway}, {index}, and {size}. Files arrive named and sorted, so a batch does not need renaming afterwards.' })
      ]),
      el('div', { class: 'panel__row', style: { marginTop: '0.75rem' } }, [batchButton]),
      statusNode
    ])
  ]);

  presetSelect.id = 'ps-preset';
  dpiSelect.id = 'ps-dpi';
  namingInput.id = 'ps-naming';

  container.append(el('div', { class: 'mod mod--split' }, [left, right]));

  const lastId = await context.storage.get('lastPattern');
  const restore = patterns.find((p) => p.id === lastId);
  await choose(restore || patterns[0]);
  renderGrid();
  updateSummary();

  return () => {};
}

export default { mount };
