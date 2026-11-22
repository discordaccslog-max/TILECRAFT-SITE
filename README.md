# Tilecraft Digital

The storefront, license certificate system, and Studio framework for
[tilecraft-site.vercel.app](https://www.tilecraftdigital.art).

Static HTML, CSS, and vanilla JavaScript. No build step is needed to serve it,
no framework, and no runtime dependencies. Every font and every library is
served from this repository, so loading a page makes no request to any other
server.

Product content — the patterns, the pattern generator, the repeat builder, and
the export tools — is **not** in this repository. Each product's content
arrives later as a Studio module. See [MODULES.md](MODULES.md).

---

## What is here

| Area | Where |
| --- | --- |
| The catalog, and the only file to edit to change it | [`js/products.js`](js/products.js) |
| Site-wide settings, including the support address | [`js/site-config.js`](js/site-config.js) |
| The cart, and the one place a checkout plugs in | [`js/cart.js`](js/cart.js) |
| License codes, checksums, activation, device storage | [`js/license.js`](js/license.js) |
| The license terms, shared by the site and the certificate | [`js/license-terms.js`](js/license-terms.js) |
| The License Certificate PDF | [`js/certificate.js`](js/certificate.js) |
| A PDF writer | [`js/pdf.js`](js/pdf.js) |
| A QR Code encoder | [`js/qrcode.js`](js/qrcode.js) |
| Saved work, in IndexedDB | [`js/storage.js`](js/storage.js) |
| Backup export and import | [`js/backup.js`](js/backup.js) |
| The riso compositions drawn across the site | [`js/riso.js`](js/riso.js) |
| The Studio | [`studio/`](studio/) |
| The module contract | [MODULES.md](MODULES.md) |
| Page generation | [`tools/`](tools/) |
| Tests | [`tests/`](tests/) |

---

## Working on it

```bash
npm run serve     # serve the repository at http://localhost:8123
npm run build     # regenerate every HTML page, the sitemap, and robots.txt
npm test          # run the test suite
npm run check     # build, then test
```

Node 20 or newer. Nothing is installed; the scripts use only what Node ships
with.

### The build

`npm run build` writes every HTML page from the content in `tools/content/`
and the catalog in `js/products.js`. The generated HTML is committed, and it
is what Vercel serves — nothing is built at request time.

Prose pages carry their full text, so they read with scripting switched off.
Product pages and confirmation pages carry only their metadata and a slug;
their visible content is rendered in the browser from `js/products.js`. That
is what makes that file the single place to change the catalog.

**Run `npm run build` after editing `js/products.js` or `js/site-config.js`.**
The pages pick up catalog changes at runtime on their own, but the titles,
meta descriptions, and sitemap are written at build time.

---

## Two things to change before launch

### 1. The support address

`js/site-config.js` has an empty `supportEmail`. While it is empty, every
place that would show it — the Contact page, the footer, and the Studio's
"Report a problem" link — leaves that line out, and nothing looks unfinished.

```js
supportEmail: '<the support mailbox>'   // set it, then: npm run build
```

Policies and FAQ answers never quote an address. They all send people to the
Contact page, so setting this one field is the whole job.

### 2. Checkout links

Every product in `js/products.js` has an empty `checkoutUrl`:

```js
checkoutUrl: ''
```

While it is empty, no buy button is rendered for that product, and neither is
the agreement checkbox — a checkbox gating nothing would be a dead control.
Add a payment link and both appear automatically:

```js
checkoutUrl: 'https://…'        // then: npm run build
```

Point the payment provider's success URL at the product's `thankYouPath`, for
example `/thank-you/geometric-essentials/`. Any order reference the provider
appends is picked up automatically; the confirmation page looks for
`session_id`, `order_id`, `order`, `transaction_id`, `txn_id`, and `token`.

Add checkout links only once that product's Studio module exists, so that no
customer buys something that opens to a "not installed yet" notice.

---

## How licenses work

There is no server and no database. Everything happens in the buyer's browser.

A license code looks like this:

```
TILE-GMTR-K7N4PXBM-WC
^^^^ ^^^^ ^^^^^^^^ ^^
|    |    |        checksum
|    |    random, 8 characters
|    product code
fixed prefix
```

The three variable sections use a 31-character alphabet with no `0`, `O`, `1`,
`I`, or `L`, so a code can be read off a printed certificate without guessing.

Because 31 is prime, the characters are read as values in GF(31) and the two
checksum characters are the parity symbols of a [14,12] Reed-Solomon code over
that field. That gives a minimum distance of 3, so **every** single wrong
character and **every** pair of wrong characters — including every
transposition — is rejected. The test suite checks this exhaustively.

A code derived from an order reference is deterministic, so reloading a
confirmation page, or returning to it later, always produces the same code
rather than issuing a new one.

### Activation links

```
https://www.tilecraftdigital.art/studio/#activate=TILE-GMTR-K7N4PXBM-WC
```

The code is in the fragment, which browsers never send to a web server. The
Studio reads it, activates the license on that device, and removes it from the
address bar. This is what the QR code on the certificate encodes.

### The bundle

The Essentials Bundle's catalog entry lists five `grants`. One code unlocks
all five Collections, and the Studio stores one license, not five.

---

## The Studio

`/studio/` is the frame that product modules plug into. It owns the sidebar,
licenses, certificates, settings, backups, the walkthrough, and the offline
install, and no pattern content at all.

- Products the buyer has activated open in the workspace. The rest show a lock
  and link to their page.
- Settings lists every license on the device, and can re-download a
  certificate, copy an activation link, or remove a license.
- A backup export writes every license and everything saved to one JSON file;
  the import adds to what is already there rather than replacing it.
- It installs as a progressive web app and works offline once loaded.

Modules go in `studio/modules/<slug>/` and are listed in
`studio/modules/manifest.json`. They are loaded only when their product is
opened. The full contract, with a complete worked example, is in
[MODULES.md](MODULES.md).

When a module is added, list any new shell file in the precache array in
[`studio/sw.js`](studio/sw.js).

---


## Taking payment

The shop works end to end: a cart, a checkout, licenses issued, certificates
produced. The one thing not wired in is a payment provider, so an order
currently completes **without charging for it**.

Everything on either side of the charge is real. To add one, give
`PAYMENT.collect` in [`js/cart.js`](js/cart.js) a function that takes the
order, charges for it, and resolves with `{ reference }` once the money has
actually been taken:

```js
import { PAYMENT } from './js/cart.js';

PAYMENT.collect = async (order) => {
  // order.lines, order.total, order.currency — all priced from the catalog
  const { id } = await yourProvider.charge(order);
  return { reference: id };
};
```

No license is issued until that promise resolves, and rejecting it stops the
order. The reference it resolves with becomes the order reference printed on
every certificate. Nothing else needs changing.

Worth knowing:

- **The cart stores no prices.** Only a slug, the chosen extra ids, and a
  quantity. Every figure is recomputed from [`js/products.js`](js/products.js)
  when asked for, so a cart left in a browser for a month cannot carry a
  stale price and a hand-edited one cannot invent a cheaper total.
- **License codes are derived from the order reference**, so the same order
  always produces the same codes. Placing an order twice cannot issue two
  sets.
- **The per-product confirmation pages still work.** A provider that
  redirects per item can send buyers to a product's `thankYouPath` with
  `?session_id=` and `?options=a,b` instead of using `/order/`.

## Tests

```bash
npm test
```

| File | Covers |
| --- | --- |
| `tests/license.test.mjs` | code generation, the checksum, reading codes back, order-linked consistency, activation, bundle activation, activation links |
| `tests/qrcode.test.mjs` | QR encoding, round-tripped through a reader written for the tests |
| `tests/certificate.test.mjs` | the certificate PDF: structure, the cross-reference table, content, and its QR code |
| `tests/backup.test.mjs` | export, wipe, import, and refusing tampered backups |
| `tests/site.test.mjs` | the built site: internal links, placeholder text, metadata, the sitemap, the copy rules |

`tests/helpers/environment.mjs` gives the browser modules the `localStorage`,
`document`, and IndexedDB they expect. `tests/helpers/qr-decode.mjs` is a QR
reader used to prove the encoder's output can actually be read.

---

## Design

A risograph print studio: warm uncoated paper, deep navy-black ink for text,
and two fluorescent inks, pink and teal, that multiply where they overlap to
make a third color. Dark mode uses deep ink-colored paper with glowing inks.

The fluorescent inks are only ever used for graphics and large display type.
Running text stays in the navy-black ink, or the off-white ink on dark paper,
so contrast clears WCAG AA in both modes.

Type, all from Google Fonts and self-hosted in `fonts/`:

| Role | Face |
| --- | --- |
| Display | Bricolage Grotesque |
| Body | Hanken Grotesk |
| Mono | Space Mono |

The compositions across the site are drawn in code by `js/riso.js` from a
seed, so the same section always produces the same artwork. They are
decorative illustrations, and the site says so wherever one appears — they are
not previews of the patterns a buyer receives.

The social card at `/og.png` is captured from `tools/og.html`; that file says
how to regenerate it.

---

## Deployment

The site is hosted on Vercel at **https://www.tilecraftdigital.art**.

`vercel.json` holds the whole configuration:

| Setting | Value | Why |
| --- | --- | --- |
| `buildCommand` | `npm run build` | regenerates every page, the sitemap, and the service worker stamp |
| `outputDirectory` | `.` | the built site *is* the repository root |
| `trailingSlash` | `true` | every internal link and canonical URL ends in a slash |
| `framework` | `null` | plain static output, no framework |

`404.html` at the root is served for unknown paths, with a 404 status.
`sitemap.xml` lists public pages only — confirmation pages are noindex, left
out of the sitemap, disallowed in `robots.txt`, and linked from nowhere.

```bash
vercel deploy --prod
```

### If the site ever moves again

Change `domain` and `origin` in `js/site-config.js`, then run `npm run build`.

That one edit covers canonical URLs, Open Graph tags, the sitemap, and
`robots.txt` — and, the part worth being careful about, the activation links
printed and QR-encoded on every License Certificate. A certificate is a
document a buyer keeps, so links already issued on one will point at the old
address. Keep the old address answering, or reissue certificates, if any have
gone out.

The test suite reads the same two fields, so nothing has to be updated twice.

---

## Privacy

The site sets no cookies and runs no analytics, trackers, or third-party
scripts. Licenses, the optional licensee name, saved work, and any image used
in the Studio are stored and processed only in the buyer's browser and are
never sent anywhere.

That is a property of the code, not a promise about it: there is no upload
path in the Studio, and no server to upload to. It is also why the backup
feature exists — nothing here can be recovered by the business, because the
business never has it.
