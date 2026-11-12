# Studio modules

The Studio is a frame. It owns the sidebar, licenses, certificates, settings,
backups, the walkthrough, and the offline install. It owns no pattern content
at all.

Each product's content is a **module**: a folder under `studio/modules/<slug>/`
with a JavaScript entry point that exports a `mount` function. The Studio loads
a module only when its product is opened, and only when that product is
licensed on the device.

This document is the contract. A module that follows it will work without any
change to the Studio.

---

## Contents

1. [Where a module lives](#1-where-a-module-lives)
2. [The manifest](#2-the-manifest)
3. [The entry point](#3-the-entry-point)
4. [The context object](#4-the-context-object)
5. [Cleaning up](#5-cleaning-up)
6. [Styling a module](#6-styling-a-module)
7. [Rules a module must follow](#7-rules-a-module-must-follow)
8. [A complete example module](#8-a-complete-example-module)
9. [Checklist before installing a module](#9-checklist-before-installing-a-module)

---

## 1. Where a module lives

```
studio/
  modules/
    manifest.json              <- the list the Studio reads
    geometric-essentials/
      index.js                 <- the entry point
      module.css               <- optional, loaded by the module itself
      ...anything else it needs
```

The folder name should match the product's `slug` in `js/products.js`. That is
a convention rather than a requirement — the manifest is what actually binds a
slug to a path — but matching them keeps the repository readable.

A module may contain any number of files. They are plain static files served
from the same origin, so a module can `import` its own submodules, fetch its
own JSON, and reference its own images.

---

## 2. The manifest

`studio/modules/manifest.json` lists the modules that are installed. The Studio
fetches it once per session and uses it to decide, for each licensed product,
whether a workspace exists.

```json
{
  "version": 1,
  "updated": "2026-11-12",
  "modules": [
    {
      "slug": "geometric-essentials",
      "entry": "modules/geometric-essentials/index.js",
      "name": "Geometric Essentials",
      "version": "1.0.0"
    }
  ]
}
```

| Field     | Required | Meaning |
| --------- | -------- | ------- |
| `slug`    | yes      | Must match a product `slug` in `js/products.js`. |
| `entry`   | yes      | Path to the entry point, **relative to `/studio/`**. |
| `name`    | no       | For your own reference. The Studio uses the catalog name. |
| `version` | no       | For your own reference. |

A product with no entry in `modules` is still licensed and still appears in the
sidebar; opening it shows a short, neutral notice saying the workspace is not
installed yet. That state is not something customers will meet, because
checkout links are only added once the modules exist.

Entries for slugs that are not in the catalog are ignored.

---

## 3. The entry point

The entry point is an ES module. It must export a function called `mount`,
either as a named export or on its default export.

```js
export function mount(container, context) {
  // build the workspace inside `container`
}
```

| Argument    | Type          | Meaning |
| ----------- | ------------- | ------- |
| `container` | `HTMLElement` | An empty element to build inside. It is yours. |
| `context`   | `object`      | Everything the Studio provides. See below. |

`mount` may be `async`. The Studio awaits it.

The Studio has already drawn the product's name and license as a heading above
`container`, so a module does not need to repeat them.

### What `mount` may return

| Return value                   | Meaning |
| ------------------------------ | ------- |
| nothing                        | No cleanup needed. |
| a function                     | Called when the module is closed. |
| an object with `destroy()`     | `destroy()` is called when the module is closed. |

If `mount` throws, the Studio catches it, shows a short recovery notice with a
reload button, and releases the context. The license and the saved work are
untouched.

---

## 4. The context object

```js
context = {
  studioVersion,   // string, e.g. "1.0.0"
  product,         // the catalog entry for this product
  license,         // the license record that unlocked it
  storage,         // saved work, scoped to this product
  files,           // saving files and copying text
  theme,           // the current look
  settings,        // the Studio's settings
  ui               // talking to the person using the Studio
}
```

### `context.product`

A copy of the product's entry from `js/products.js`:

```js
{
  name: 'Geometric Essentials',
  slug: 'geometric-essentials',
  code: 'GMTR',
  tier: 'collection',
  price: 10,
  short: '…',
  full: ['…'],
  features: ['…'],
  inks: ['pink', 'teal'],
  // …and the rest of the catalog fields
}
```

It is a copy. Changing it changes nothing.

### `context.license`

The license record that unlocked this product:

```js
{
  code: 'TILE-GMTR-K7N4PX-QM',
  slug: 'geometric-essentials',
  productCode: 'GMTR',
  productName: 'Geometric Essentials',
  tier: 'collection',
  grants: ['geometric-essentials'],
  issuedAt: '2026-11-12T15:04:00.000Z',
  orderRef: 'cs_test_…' | null,
  licensee: 'Juniper Lane Studio' | null
}
```

Also a copy. For a Collection unlocked by the Essentials Bundle, this is the
**bundle's** record, so `license.slug` is `essentials-bundle` and `grants`
lists all five Collections. Use `context.product.slug` when you mean "which
product am I", and `context.license` only for displaying or stamping license
details.

A module never has to check whether the product is licensed. The Studio does
not mount a module unless it is.

### `context.storage`

Saved work, in IndexedDB, scoped to this product. Another module cannot read or
overwrite it. Every method returns a promise.

```js
await context.storage.set('presets', [{ name: 'Warm gray', hue: 32 }]);
const presets = await context.storage.get('presets');   // undefined if unset
const keys    = await context.storage.keys();           // ['presets']
const all     = await context.storage.entries();        // [['presets', [...]]]
await context.storage.remove('presets');
await context.storage.clear();                          // this product only
```

Values may be anything the structured clone algorithm handles: objects, arrays,
`Date`, `Blob`, `ArrayBuffer`, `ImageBitmap`, typed arrays. Keys are strings.

Everything stored here is included in the Studio's backup export and restored
by its import, with no work from the module.

**Choose stable keys.** A key is part of the saved file that a buyer may
restore a year later. Renaming one orphans their work.

### `context.files`

```js
context.files.downloadBlob(blob, 'pattern.png');
context.files.downloadBytes(uint8Array, 'pattern.bin', 'application/octet-stream');
context.files.downloadText(svgString, 'pattern.svg', 'image/svg+xml');
context.files.downloadJson(preset, 'preset.json');
await context.files.downloadCanvas(canvas, 'tile.png');   // resolves true/false
const copied = await context.files.copyText(code);        // resolves true/false
```

A download is a real file save in the buyer's browser. Nothing is uploaded.

### `context.theme`

```js
context.theme.isDark;        // boolean, read it fresh each time
context.theme.palette();     // { pink, teal, paper, ink, blend, dark }

const off = context.theme.onChange(({ isDark, palette }) => {
  redraw();
});
```

`onChange` returns a function that removes the listener. You do not have to
call it — the Studio removes every listener it handed out when the module
closes — but it is there if you want it.

`palette()` reads the live values from the stylesheet, so a module's canvas
drawing matches the rest of the Studio in both themes.

### `context.settings`

```js
context.settings.get();      // { theme, scale, reducedMotion, … }
const off = context.settings.onChange((settings) => { … });
```

### `context.ui`

```js
context.ui.toast('Exported 12 colorways.');
context.ui.toast('That file is not an image.', 'error');
context.ui.setStatus('4 presets saved');       // the line beside the heading
context.ui.prefersReducedMotion();             // boolean
```

`setStatus` replaces the small line next to the product name at the top of the
workspace. Passing an empty string clears it.

---

## 5. Cleaning up

A module must stop doing things when it is closed. The Studio calls your
cleanup function, then removes every listener it gave you and empties the
container.

What the Studio cannot clean up for you:

- `requestAnimationFrame` loops
- `setInterval` and `setTimeout`
- `ResizeObserver`, `IntersectionObserver`, `MutationObserver`
- listeners you added to `window`, `document`, or `navigator`
- Web Workers
- object URLs from `URL.createObjectURL`

```js
export function mount(container, context) {
  const controller = new AbortController();
  window.addEventListener('keydown', onKey, { signal: controller.signal });

  let frame = requestAnimationFrame(tick);

  return () => {
    controller.abort();
    cancelAnimationFrame(frame);
  };
}
```

An `AbortController` passed as `signal` to every `addEventListener` is the
tidiest way to do this: one `abort()` removes them all.

---

## 6. Styling a module

The Studio's stylesheet is already loaded, and so is the site's. A module
inherits the fonts, the color tokens, and both themes.

Use the tokens rather than fixed colors, so the module follows the theme:

| Token            | Use |
| ---------------- | --- |
| `--paper`        | the workspace background |
| `--paper-raised` | panels and cards |
| `--paper-sunk`   | wells, insets, tracks |
| `--paper-edge`   | hairline borders |
| `--ink`          | text and strong borders |
| `--ink-muted`    | secondary text |
| `--ink-faint`    | disabled text |
| `--pink`, `--teal` | accents and graphics **only** |
| `--pink-text`, `--teal-text` | small colored text that must stay readable |
| `--font-display`, `--font-body`, `--font-mono` | type |

The workspace is deliberately quiet so that patterns stand out. Keep the inks
as accents.

For a module's own styles, load a stylesheet from inside `mount` and prefix
every selector so it cannot leak:

```js
if (!document.querySelector('link[data-module="geometric-essentials"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./module.css', import.meta.url).href;
  link.dataset.module = 'geometric-essentials';
  document.head.append(link);
}
```

Leave it in place when the module closes; it costs nothing and avoids a flash
if the module is reopened.

---

## 7. Rules a module must follow

**Nothing leaves the device.** No module may upload anything, fetch from
another origin, load a script or font from a CDN, or send any telemetry. The
Privacy Policy states plainly that images and saved work never leave the
browser, and the whole product rests on that being true. Bundle what you need
into the module's own folder.

**No cookies, no analytics, no tracking.** Same reason.

**Stay inside `container`.** Do not restyle the Studio, move its furniture, or
write to `document.body`. The exceptions are a stylesheet `<link>` in `<head>`,
as above, and a dialog or file input that has to be a child of `<body>` —
remove those on cleanup.

**Stay inside your own storage.** Use `context.storage`. Do not touch
IndexedDB, `localStorage`, or any key belonging to the Studio or another
module.

**Be keyboard operable.** Every control reachable by `Tab`, visible focus,
labeled inputs, headings in order. A canvas that can be manipulated with a
pointer needs a keyboard route to the same result.

**Honor reduced motion.** Check `context.ui.prefersReducedMotion()` and
`@media (prefers-reduced-motion: reduce)`.

**Animate transform and opacity only.** Hover effects go inside
`@media (hover: hover)`.

**Work down to 360px wide.** No horizontal scrolling at that width.

**Work offline.** A module is cached by the service worker the first time it
is opened and must keep working with no connection afterwards.

---

## 8. A complete example module

A working module, kept here as documentation. It is **not** installed on the
site, and it is not listed in `manifest.json`. Copy it as a starting point.

### `studio/modules/example/index.js`

```js
/*
 * Example Studio module.
 *
 * Draws a tile on a canvas, lets its two colors be changed, saves the
 * choice, and exports a PNG. It is the smallest thing that touches every
 * part of the module contract.
 */

export function mount(container, context) {
  const { product, storage, files, theme, ui } = context;

  /* ---- State ---- */

  let state = { inkA: theme.palette().pink, inkB: theme.palette().teal, size: 480 };

  /* ---- Markup ---- */

  container.innerHTML = `
    <div class="example">
      <canvas class="example__canvas" width="480" height="480"
              role="img" aria-label="A preview of the current tile"></canvas>

      <form class="example__controls">
        <p>
          <label for="ex-a">First ink</label>
          <input type="color" id="ex-a" name="inkA">
        </p>
        <p>
          <label for="ex-b">Second ink</label>
          <input type="color" id="ex-b" name="inkB">
        </p>
        <p>
          <button type="button" data-save>Save these colors</button>
          <button type="button" data-export>Export PNG</button>
        </p>
      </form>
    </div>
  `;

  const canvas = container.querySelector('canvas');
  const inkA = container.querySelector('#ex-a');
  const inkB = container.querySelector('#ex-b');

  /* ---- Drawing ---- */

  function draw() {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const step = size / 8;

    ctx.fillStyle = state.inkA;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = state.inkB;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) continue;
        ctx.beginPath();
        ctx.arc(x * step + step / 2, y * step + step / 2, step * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function syncInputs() {
    inkA.value = state.inkA;
    inkB.value = state.inkB;
  }

  /* ---- Events, all on one AbortController ---- */

  const controller = new AbortController();
  const on = (element, type, handler) =>
    element.addEventListener(type, handler, { signal: controller.signal });

  on(inkA, 'input', () => {
    state.inkA = inkA.value;
    draw();
  });

  on(inkB, 'input', () => {
    state.inkB = inkB.value;
    draw();
  });

  on(container.querySelector('[data-save]'), 'click', async () => {
    await storage.set('colors', { inkA: state.inkA, inkB: state.inkB });
    ui.toast('Colors saved.');
    ui.setStatus('Colors saved');
  });

  on(container.querySelector('[data-export]'), 'click', async () => {
    const ok = await files.downloadCanvas(canvas, product.slug + '-tile.png');
    if (!ok) ui.toast('That export did not complete.', 'error');
  });

  // Follow the Studio's theme when the saved colors are the theme defaults.
  const offTheme = theme.onChange(({ palette }) => {
    if (!state.saved) {
      state = { ...state, inkA: palette().pink, inkB: palette().teal };
      syncInputs();
      draw();
    }
  });

  /* ---- Load saved work, then draw ---- */

  (async () => {
    const saved = await storage.get('colors');
    if (saved) {
      state = { ...state, ...saved, saved: true };
      ui.setStatus('Saved colors loaded');
    }
    syncInputs();
    draw();
  })();

  /* ---- Cleanup ---- */

  return () => {
    controller.abort();
    offTheme();
    ui.setStatus('');
  };
}
```

### `studio/modules/example/module.css`

```css
.example {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 48rem) {
  .example {
    grid-template-columns: minmax(0, 1fr) 16rem;
  }
}

.example__canvas {
  width: 100%;
  height: auto;
  border: 2px solid var(--ink);
  background: var(--paper-raised);
}

.example__controls label {
  display: block;
  font-weight: 600;
  font-size: var(--step--1);
  margin-bottom: 0.3rem;
}

.example__controls p + p {
  margin-top: 1rem;
}

.example__controls button {
  font: inherit;
  font-weight: 700;
  padding: 0.5rem 0.9rem;
  border: 2px solid var(--ink);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

@media (hover: hover) {
  .example__controls button:hover {
    background: var(--ink);
    color: var(--paper);
  }
}
```

### Installing it

Add it to `studio/modules/manifest.json`:

```json
{
  "version": 1,
  "modules": [
    { "slug": "example", "entry": "modules/example/index.js" }
  ]
}
```

`"example"` is not a real product, so nothing would appear. For a real module,
use the product's slug from `js/products.js`.

---

## 9. Checklist before installing a module

- [ ] The `slug` matches a product in `js/products.js`.
- [ ] The `entry` path is relative to `/studio/` and the file is there.
- [ ] `mount` is exported, and returns a cleanup function if it needs one.
- [ ] Opening the product, leaving it, and reopening it leaves nothing running.
- [ ] Every timer, loop, and observer is cleaned up.
- [ ] Nothing is fetched from another origin, and nothing is uploaded.
- [ ] Saved work goes through `context.storage` and nowhere else.
- [ ] Storage keys are final — a buyer's backup will contain them.
- [ ] Export, then import, a backup and confirm the saved work comes back.
- [ ] Every control works with a keyboard, and focus is always visible.
- [ ] Text meets AA contrast in both light and dark themes.
- [ ] The layout holds at 360px wide with no horizontal scrolling.
- [ ] Motion stops under `prefers-reduced-motion: reduce`.
- [ ] It works with the network switched off after one load.
- [ ] Any new shell file is added to the precache list in `studio/sw.js`.
