/*
 * Tilecraft Digital — product catalog
 *
 * This file is the single source of truth for the catalog. Every page that
 * shows products reads from here: the home page, the product pages, the
 * Studio sidebar, the confirmation pages and the license system.
 *
 * To change the catalog, edit this file alone.
 *
 * Fields
 *   name           Display name.
 *   slug           URL segment. Used for /products/<slug>/ and /thank-you/<slug>/.
 *   code           Four-character product code embedded in license codes.
 *                  Must use only characters from the license alphabet
 *                  (see js/license.js): 23456789ABCDEFGHJKMNPQRSTUVWXYZ.
 *                  Must be unique across the catalog.
 *   tier           'collection' or 'studio-edition'.
 *   price          Price in US dollars, as a number.
 *   short          One-line description, used in listings.
 *   full           Paragraphs for the product page. Array of strings.
 *   features       Everything the product includes and does. Array of strings.
 *   forWhom        Who it suits. Array of strings.
 *   notForWhom     Who it does not suit. Array of strings.
 *   thankYouPath   Confirmation page path. Not linked anywhere on the site.
 *   checkoutUrl    Empty until a payment link exists. While it is empty, no
 *                  buy button is rendered anywhere. Add a URL and the button
 *                  (and its agreement checkbox) appear automatically.
 *   grants         Slugs this product unlocks in the Studio. Defaults to the
 *                  product's own slug; the bundle lists the five Collections.
 *   inks           Decorative ink pair used by the riso canvas compositions
 *                  for this product's section. Not a preview of the patterns.
 */

export const TIERS = {
  'collection': {
    id: 'collection',
    name: 'Collections',
    anchor: 'collections',
    blurb:
      'Ready-made seamless pattern sets. Open a Collection in the Studio, ' +
      'recolor it, and export the repeats you need.'
  },
  'studio-edition': {
    id: 'studio-edition',
    name: 'Studio Editions',
    anchor: 'studio-editions',
    blurb:
      'Tools rather than sets. Studio Editions make patterns, turn your own ' +
      'motifs into repeats, and export production-ready files.'
  }
};

export const PRODUCTS = [
  {
    name: 'Geometric Essentials',
    slug: 'geometric-essentials',
    code: 'GMTR',
    tier: 'collection',
    price: 10,
    short:
      'Grids, chevrons, triangles, hexagons, dots, and interlocking shapes in clean, modern compositions.',
    full: [
      'Geometric Essentials is a Collection of seamless geometric repeats built on straight edges, regular angles, and even spacing. It covers the shapes that most surface work comes back to: square and offset grids, chevrons and zigzags, triangles, hexagons and other tessellations, dot and circle fields, and interlocking shapes that lock together without a visible seam.',
      'Every repeat in the Collection opens in the Studio, where you can set your own colors, change the scale of the repeat, and export the tile or a larger sheet. Color changes apply to the whole pattern at once, so a single repeat can become as many colorways as you need.',
      'The compositions are deliberately restrained. They are made to sit underneath other artwork, to fill a background, or to carry a design on their own at a larger scale, without fighting whatever else is on the page.'
    ],
    features: [
      'Seamless geometric repeats: square grids, offset grids, chevrons, zigzags, triangles, hexagons, dot and circle fields, and interlocking tessellations',
      'Every repeat tiles edge to edge with no visible seam',
      'Recolor any repeat in the Studio and save your own colorways',
      'Adjust the scale of the repeat before exporting',
      'Export single tiles and larger swatch sheets as PNG, JPEG, or SVG, at the pixel size you choose',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Surface designers who want a dependable geometric base to build on',
      'Makers putting patterns on fabric, paper, or finished goods',
      'Print-on-demand sellers who need repeats they are licensed to sell on',
      'Anyone who wants clean geometry without drawing each tile by hand'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People who want hand-illustrated or painterly artwork',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who need vector SVG output, which is part of Production Studio rather than the Collections'
    ],
    thankYouPath: '/thank-you/geometric-essentials/',
    checkoutUrl: '',
    inks: ['pink', 'teal']
  },
  {
    name: 'Textures & Grain',
    slug: 'textures-and-grain',
    code: 'TXGR',
    tier: 'collection',
    price: 12,
    short:
      'Paper grain, linen, stipple, noise, and brushed textures for adding depth to designs.',
    full: [
      'Textures & Grain is a Collection of seamless texture repeats for the layer that sits on top of everything else. It includes paper grain and uncoated stock textures, woven linen and canvas weaves, stipple and speckle fields, fine and coarse noise, and brushed and dragged marks.',
      'Textures are the pieces that make flat artwork look printed rather than rendered. Because every tile in the Collection is seamless, you can lay one over an area of any size and it will not band or show a join. In the Studio you can set the texture color, change how strong the texture reads, and change its scale before exporting.',
      'The same repeats work as a top layer over other patterns and as standalone backgrounds in their own right.'
    ],
    features: [
      'Seamless texture repeats: paper grain, uncoated stock, linen and canvas weave, stipple, speckle, fine and coarse noise, and brushed marks',
      'Every texture tiles edge to edge with no visible seam or banding',
      'Set the texture color and strength in the Studio',
      'Adjust the scale of the repeat before exporting',
      'Export on an opaque background or as a transparent overlay, where the grain becomes the alpha channel',
      'Export single tiles and larger sheets as PNG or JPEG at the pixel size you choose',
      'Textures are raster tiles rather than vector, so there is no SVG version of them',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Designers who want to add printed texture to flat artwork',
      'Anyone layering grain over patterns, type, or illustration',
      'Makers who want woven and paper surfaces as backgrounds',
      'People who need overlays that tile cleanly at any size'
    ],
    notForWhom: [
      'People who want to resell or redistribute the texture files themselves',
      'People looking for photographic surface scans',
      'People who need vector SVG output, which is part of Production Studio',
      'People who want figurative or illustrated motifs rather than surface texture'
    ],
    thankYouPath: '/thank-you/textures-and-grain/',
    checkoutUrl: '',
    inks: ['teal', 'pink']
  },
  {
    name: 'Botanical Linework',
    slug: 'botanical-linework',
    code: 'BTNC',
    tier: 'collection',
    price: 14,
    short:
      'Stylized leaves, vines, stems, and blossoms drawn as clean, simple linework.',
    full: [
      'Botanical Linework is a Collection of seamless plant repeats reduced to line. It covers leaves and leaf pairs, trailing vines, bare stems and sprigs, simple blossoms and buds, and scattered botanical fields where the motifs sit apart rather than touching.',
      'Everything is stylized rather than botanical illustration: even stroke weights, simplified shapes, and clear negative space between motifs. That keeps the repeats readable when they are scaled down onto small goods and keeps them calm when they are scaled up across a wall or a length of fabric.',
      'In the Studio you can set the line color and the background color independently, change the stroke weight, and change the scale and density of the repeat before exporting.'
    ],
    features: [
      'Seamless botanical repeats: leaves, leaf pairs, trailing vines, stems, sprigs, blossoms, buds, and scattered fields',
      'Even, consistent line weights that stay readable when scaled down',
      'Set line color and background color independently in the Studio',
      'Adjust stroke weight, scale, and density before exporting',
      'Every repeat tiles edge to edge with no visible seam',
      'Export single tiles and larger swatch sheets as PNG, JPEG, or SVG, at the pixel size you choose',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Surface designers who want simple botanical repeats with room to breathe',
      'Makers putting line botanicals on stationery, packaging, or textiles',
      'Print-on-demand sellers who want a calm, line-led pattern family',
      'Anyone who needs botanicals that read clearly at small sizes'
    ],
    notForWhom: [
      'People who want detailed or scientific botanical illustration',
      'People who want painterly or watercolor florals',
      'People who need the pattern files to resell or redistribute',
      'People who need vector SVG output, which is part of Production Studio'
    ],
    thankYouPath: '/thank-you/botanical-linework/',
    checkoutUrl: '',
    inks: ['teal', 'pink']
  },
  {
    name: 'Mid-Century Shapes',
    slug: 'mid-century-shapes',
    code: 'MDCY',
    tier: 'collection',
    price: 16,
    short:
      'Playful mid-century-inspired forms: starbursts, boomerangs, organic blobs, and arcs.',
    full: [
      'Mid-Century Shapes is a Collection of seamless repeats built from the loose, playful forms associated with mid-century surface design: starbursts and asterisks, boomerang and kidney shapes, soft organic blobs, arcs and half-circles, and thin linear accents that connect them.',
      'The compositions mix scales on purpose. A large shape anchors the tile, smaller forms fill the gaps, and the spacing is uneven enough that the repeat does not read as a grid. The result carries a design on its own rather than sitting quietly in the background.',
      'In the Studio you can set a color for each shape group, swap the background, and change the scale and rotation of the repeat before exporting.'
    ],
    features: [
      'Seamless mid-century repeats: starbursts, asterisks, boomerangs, kidney shapes, organic blobs, arcs, half-circles, and linear accents',
      'Mixed-scale compositions that avoid an obvious grid',
      'Separate color control for each shape group in the Studio',
      'Adjust scale and rotation before exporting',
      'Every repeat tiles edge to edge with no visible seam',
      'Export single tiles and larger swatch sheets as PNG, JPEG, or SVG, at the pixel size you choose',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Designers who want a pattern that leads a design rather than backs it',
      'Makers working on homeware, textiles, or packaging with a retro leaning',
      'Print-on-demand sellers who want bold, characterful repeats',
      'Anyone who wants mid-century forms without building each shape themselves'
    ],
    notForWhom: [
      'People who want quiet, neutral background patterns — the Collections above suit that better',
      'People who need the pattern files to resell or redistribute',
      'People who want period-accurate reproductions of specific historical artwork',
      'People who need vector SVG output, which is part of Production Studio'
    ],
    thankYouPath: '/thank-you/mid-century-shapes/',
    checkoutUrl: '',
    inks: ['pink', 'teal']
  },
  {
    name: 'Tile & Terrazzo',
    slug: 'tile-and-terrazzo',
    code: 'TRZZ',
    tier: 'collection',
    price: 19,
    short: 'Ceramic-tile-inspired repeats, terrazzo, and mosaic patterns.',
    full: [
      'Tile & Terrazzo is a Collection of seamless repeats drawn from tiled surfaces. It includes square and hexagonal ceramic layouts, quarter-turn and four-tile rotational blocks where the motif turns as it repeats, encaustic-style geometric tiles, terrazzo chip scatters at several chip sizes, and small-piece mosaic fields.',
      'Tile patterns are a particular kind of repeat: the single tile has to work on its own, and it also has to work when four of them meet at a corner. Every repeat in this Collection is built and checked both ways, so corners resolve cleanly instead of producing accidental shapes where tiles meet.',
      'In the Studio you can set the grout or background color, set the colors of the chips or tile elements, change chip density on the terrazzo repeats, and change the scale of the repeat before exporting.'
    ],
    features: [
      'Seamless tile repeats: square and hexagonal ceramic layouts, quarter-turn and four-tile rotational blocks, and encaustic-style geometric tiles',
      'Terrazzo chip scatters at several chip sizes, plus small-piece mosaic fields',
      'Corners resolve cleanly where four tiles meet, not just along the edges',
      'Set grout or background color separately from the tile elements',
      'Adjust chip density on terrazzo repeats, and scale on every repeat',
      'Export single tiles and larger swatch sheets as PNG, JPEG, or SVG, at the pixel size you choose',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Surface designers who want tiled and terrazzo repeats with correct corners',
      'Makers working on wallpaper, homeware, packaging, or stationery',
      'Print-on-demand sellers who want the largest of the Collections',
      'Anyone who needs rotational tile blocks without building the geometry themselves'
    ],
    notForWhom: [
      'People who want photographic images of real tiles',
      'People who need the pattern files to resell or redistribute',
      'People producing technical specifications for physical tile manufacture',
      'People who need vector SVG output, which is part of Production Studio'
    ],
    thankYouPath: '/thank-you/tile-and-terrazzo/',
    checkoutUrl: '',
    inks: ['teal', 'pink']
  },
  {
    name: 'Essentials Bundle',
    slug: 'essentials-bundle',
    code: 'BNDE',
    tier: 'collection',
    price: 49,
    short: 'All five Collections, activated by a single license.',
    full: [
      'The Essentials Bundle is all five Collections — Geometric Essentials, Textures & Grain, Botanical Linework, Mid-Century Shapes, and Tile & Terrazzo — on one license code.',
      'One code activates all five in the Studio. There is nothing to enter per Collection and nothing to keep track of separately: one certificate, one activation link, one QR code. Activate it on a second device and all five appear there too.',
      'Everything each Collection does on its own, it does inside the Bundle. The recoloring, scale and density controls, and exports are the same. The Bundle is the same products with one license instead of five.'
    ],
    features: [
      'All five Collections: Geometric Essentials, Textures & Grain, Botanical Linework, Mid-Century Shapes, and Tile & Terrazzo',
      'A single license code activates all five in the Studio',
      'One certificate, one activation link, and one QR code to keep',
      'Every control and export option from each Collection, unchanged — PNG, JPEG, and SVG',
      'Costs less than the five Collections bought separately',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'People who want the full range of Collections rather than one family',
      'Makers who work across several kinds of product and need variety',
      'Anyone who would rather keep one license code than five',
      'People who expect to come back for a second or third Collection anyway'
    ],
    notForWhom: [
      'People who only need one kind of pattern — a single Collection costs less',
      'People who want the pattern-making tools, which are the Studio Editions',
      'People who need the pattern files to resell or redistribute',
      'People who need vector SVG output, which is part of Production Studio'
    ],
    thankYouPath: '/thank-you/essentials-bundle/',
    checkoutUrl: '',
    grants: [
      'geometric-essentials',
      'textures-and-grain',
      'botanical-linework',
      'mid-century-shapes',
      'tile-and-terrazzo'
    ],
    inks: ['pink', 'teal']
  },
  {
    name: 'Pattern Generator Studio',
    slug: 'pattern-generator-studio',
    code: 'PGEN',
    tier: 'studio-edition',
    price: 35,
    short:
      'Create new seamless patterns from adjustable settings for shape, density, scale, rotation, and palette.',
    full: [
      'Pattern Generator Studio makes new seamless patterns instead of giving you a fixed set of them. You choose the shape family, then adjust density, scale, rotation, spacing, and palette, and the pattern is rebuilt as you move each control. Every result tiles seamlessly, because the generator builds the repeat that way rather than cropping a larger drawing.',
      'That is the practical difference from a Collection. A Collection gives you repeats to recolor and scale. The Generator gives you a space of repeats to explore, so the pattern you end up with is one you arrived at rather than one you picked from a list. When a result is worth keeping, save it as a preset; presets store every setting, so you can come back and nudge one value later.',
      'The generator runs in your browser. Nothing is uploaded, nothing is queued, and there is no waiting for a server. Patterns you generate are yours to use under the same commercial license as everything else here.'
    ],
    features: [
      'Generates new seamless patterns rather than supplying a fixed set',
      'Shape families to choose from, each with their own controls',
      'Live controls for density, scale, rotation, spacing, and jitter',
      'Palette controls, including per-shape-group color',
      'Every generated result tiles edge to edge with no visible seam',
      'Save any result as a preset that stores all of its settings',
      'Reopen a preset later and change a single value',
      'Randomize within the settings you have fixed, to explore variations',
      'Export generated patterns as PNG, JPEG, or SVG — they are vector, so SVG is a real vector file',
      'Runs entirely in your browser, with nothing uploaded',
      'Works offline in the Studio once the page has loaded',
      'Commercial license covering the patterns you generate, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Designers who want to make their own repeats rather than recolor existing ones',
      'People who need many related variations of one idea',
      'Makers who want a pattern nobody else is starting from',
      'Anyone who finds adjusting controls faster than drawing tiles'
    ],
    notForWhom: [
      'People who want finished patterns straight away — the Collections suit that better',
      'People who want to turn their own existing motifs into repeats, which is Repeat Builder',
      'People who need vector SVG or batch exports, which are part of Production Studio',
      'People who want to resell or redistribute pattern files as packs or templates'
    ],
    thankYouPath: '/thank-you/pattern-generator-studio/',
    checkoutUrl: '',
    inks: ['pink', 'teal']
  },
  {
    name: 'Repeat Builder',
    slug: 'repeat-builder',
    code: 'RPBD',
    tier: 'studio-edition',
    price: 45,
    short:
      'Turn your own motifs into seamless repeats — full drop, half drop, brick, and mirror — processed entirely in your browser.',
    full: [
      'Repeat Builder takes artwork you already have and turns it into a seamless repeat. You bring in your own motifs, place them on the tile, and choose the repeat type: full drop, half drop, brick, or mirror. The tile is stitched so that edges meet exactly, and the preview shows the pattern tiled out so you can see what the repeat actually does before you commit to it.',
      'That is what separates it from the Collections and from the Generator. The Collections are our patterns. The Generator makes patterns from settings. Repeat Builder works on your artwork, which means the output is yours in a way neither of the others is.',
      'Your images never leave your device. The tile is assembled by your browser, on your machine, and no file is uploaded anywhere. Nothing you bring into Repeat Builder is sent to us or to anyone else, and because of that, we could not retrieve it even if you asked.'
    ],
    features: [
      'Turns your own motifs into seamless repeats',
      'Accepts PNG, JPEG, and SVG motifs, up to 12 MB each',
      'Full drop, half drop, brick, and mirror repeat types',
      'Adjustable drop offset and brick offset',
      'Place, move, scale, and rotate each motif on the tile',
      'Tiled preview that shows the repeat as it will actually appear',
      'Edge-matching so the tile joins exactly with no visible seam',
      'Remove flat backgrounds from imported motifs',
      'Save a layout and come back to it later',
      'Export finished repeats as PNG or JPEG at the pixel size you choose, with the license note included',
      'Your images are processed entirely in your browser and never uploaded',
      'Works offline in the Studio once the page has loaded',
      'Commercial license covering the repeats you build, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'People who already have motifs and need them to repeat properly',
      'Illustrators turning their own drawings into surface patterns',
      'Makers who want repeats built from their own artwork',
      'Anyone who needs their files to stay on their own machine'
    ],
    notForWhom: [
      'People with no artwork of their own to start from — the Collections or the Generator suit that better',
      'People who want patterns made for them from settings, which is Pattern Generator Studio',
      'People who need vector SVG or batch exports, which are part of Production Studio',
      'People who want to resell or redistribute pattern files as packs or templates'
    ],
    thankYouPath: '/thank-you/repeat-builder/',
    checkoutUrl: '',
    inks: ['teal', 'pink']
  },
  {
    name: 'Production Studio',
    slug: 'production-studio',
    code: 'PRDN',
    tier: 'studio-edition',
    price: 75,
    short:
      'Professional export tools: large print exports, vector SVG exports, batch colorways, and preset sizes for common print-on-demand and fabric printing.',
    full: [
      'Production Studio is the export side of the Studio. Everything else here makes patterns; this is what gets them out at the size, format, and quantity production needs. It adds large raster exports at high pixel density, true vector SVG export for the repeats that are built from shapes, batch colorway export that writes every saved colorway of a pattern in one pass, and a set of preset output sizes for common print-on-demand and fabric printing requirements.',
      'The difference from the Collections and the other Studio Editions is concrete, not a matter of degree. A Collection exports a tile and a sheet. Production Studio exports the same pattern as scalable vector artwork, at print dimensions a tile export cannot reach, in every colorway at once, with a file-naming scheme you set so the output arrives sorted rather than needing to be renamed. For anyone exporting the same pattern repeatedly in different forms, that is the whole job.',
      'It works on everything you have activated: the Collections, patterns from Pattern Generator Studio, and repeats from Repeat Builder. Exports run in your browser, so large files are written locally and nothing is uploaded.'
    ],
    features: [
      'Large raster exports tested to 16,384 x 16,384 pixels — about 54 inches square at 300 DPI',
      'The Studio measures what your own device can produce and never offers a size it cannot write',
      'True vector SVG export for shape-based repeats, scalable without any loss of quality',
      'Batch colorway export: every saved colorway of a pattern written in a single pass',
      'Preset output sizes for common print-on-demand and fabric printing requirements',
      'Custom output dimensions, with the repeat scale set independently of the canvas size',
      'A file-naming scheme you define, applied across a batch',
      'Transparent-background and flattened output options',
      'Tiling sheets that lay the repeat out across a larger output size',
      'Resolution written into every PNG, so a print tool opens the file at its real physical size instead of assuming 72 DPI',
      'Batch exports arrive as one zip, named by your scheme, with the license note included',
      'Works on everything you have activated: Collections, generated patterns, and your own built repeats',
      'Exports are written in your browser, with nothing uploaded',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'People who export the same pattern at several sizes and in several colorways',
      'Anyone who needs vector SVG rather than raster output',
      'Makers preparing files for fabric printing or print-on-demand production',
      'People who would rather set up one batch than run twenty exports'
    ],
    notForWhom: [
      'People who only need a tile at screen size — every Collection already exports that',
      'People with no patterns yet; this exports patterns, it does not create them',
      'People who want to make patterns from settings, which is Pattern Generator Studio',
      'People who want to resell or redistribute pattern files as packs or templates'
    ],
    thankYouPath: '/thank-you/production-studio/',
    checkoutUrl: '',
    inks: ['pink', 'teal'],
    featured: true
  }
];

/** Products in a tier, in catalog order. */
export function productsByTier(tier) {
  return PRODUCTS.filter((p) => p.tier === tier);
}

/** A product by slug, or null. */
export function productBySlug(slug) {
  return PRODUCTS.find((p) => p.slug === slug) || null;
}

/** A product by its four-character product code, or null. */
export function productByCode(code) {
  if (typeof code !== 'string') return null;
  const upper = code.toUpperCase();
  return PRODUCTS.find((p) => p.code === upper) || null;
}

/** The slugs a product unlocks in the Studio. */
export function grantsFor(product) {
  if (!product) return [];
  return Array.isArray(product.grants) && product.grants.length
    ? product.grants.slice()
    : [product.slug];
}

/** True when a product has a usable checkout link. */
export function hasCheckout(product) {
  return !!(product && typeof product.checkoutUrl === 'string' && product.checkoutUrl.trim());
}

/** True when any product in the catalog has a checkout link. */
export function anyCheckout() {
  return PRODUCTS.some(hasCheckout);
}

/** Price formatted for display, e.g. "$10". */
export function formatPrice(price) {
  const n = Number(price);
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

export default PRODUCTS;
