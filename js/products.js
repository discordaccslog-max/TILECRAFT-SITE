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
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/geometric-essentials/',
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
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'seam-report', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/textures-and-grain/',
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
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/botanical-linework/',
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
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/mid-century-shapes/',
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
    options: [
      { id: 'extra-colorways', price: 4 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/tile-and-terrazzo/',
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
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    thankYouPath: '/thank-you/essentials-bundle/',
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
    options: [
      { id: 'seed-pack', price: 5 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/pattern-generator-studio/',
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
    options: [
      { id: 'motif-library', price: 5 },
      { id: 'seam-report', price: 3 },
      { id: 'mockup-pack', price: 3 },
      { id: 'palette-files', price: 2 }
    ],
    thankYouPath: '/thank-you/repeat-builder/',
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
    options: [
      { id: 'large-format', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'seam-report', price: 3 },
      { id: 'palette-files', price: 2 }
    ],
    thankYouPath: '/thank-you/production-studio/',
    inks: ['pink', 'teal'],
    featured: true
  },

  {
    name: 'Art Deco Lines',
    slug: 'art-deco-lines',
    code: 'DECA',
    tier: 'collection',
    price: 24,
    short:
      'Sunbursts, fans, stepped forms, and banded rules in the geometry of the 1920s and 30s.',
    full: [
      'Art Deco Lines is a Collection of seamless repeats built on the geometry that defined the period between the wars: fans radiating from a corner, sunbursts on a grid, stepped ziggurats and pyramids, medallions and shields, banded rules, and screens of uprights crossed by heavy bars.',
      'Deco is a style of exact construction rather than loose drawing, and these repeats are made the same way. Every fan has a whole number of rays, every stepped form rises in equal increments, and every band count divides the tile, so the geometry lands on the repeat rather than near it.',
      'The set runs from very fine — hairline rules and thin rays — to very bold, with heavy stepped blocks and solid shields. That range matters in practice: the fine repeats sit behind other artwork, and the bold ones carry a surface on their own.'
    ],
    features: [
      'Seamless deco repeats: sunburst grids, corner fans, ray bands, ziggurats, stepped chevrons, banded rules, fan scallops, medallions, shields, grilles, and diamond lattices',
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
      'Designers working on anything with a period feel: packaging, signage, stationery, interiors',
      'Makers who want strong geometry that still reads as decorative rather than technical',
      'Anyone who needs both fine background repeats and bold statement ones from a single set',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for authentic period artwork rather than new work in the idiom',
      'People who want hand-drawn or painterly surfaces',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/art-deco-lines/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Stripes & Rules',
    slug: 'stripes-and-rules',
    code: 'STRP',
    tier: 'collection',
    price: 20,
    short:
      'Even stripes, pinstripes, ticking, uneven bands, and broken rules, in both directions.',
    full: [
      'Stripes & Rules is the plainest Collection in the shop and the one most often reached for. It covers even stripes in two and three colours, fine pinstripes and shirting hairlines, ticking, uneven band sequences, barcode rules at varying widths, graduated bands, shadow stripes, broken and dashed rules, woven rules that pass over and under, and chalk stripes with a rule down the centre.',
      'A stripe is the least forgiving thing to repeat. If the band count does not divide the tile exactly, the last stripe meets the first at the wrong width and the join shows on everything it is printed on. Every repeat here is laid out on an exact division, and the uneven sequences are built as a fixed run repeated a whole number of times, which is what lets an irregular rhythm still tile.',
      'Both directions are covered, so you are not rotating a repeat and finding the proportions wrong.'
    ],
    features: [
      'Seamless striped repeats: even stripes, pinstripes, ticking, uneven bands, barcode rules, cross rules, graduated bands, shadow stripes, dashed rules, woven rules, and chalk stripes',
      'Horizontal and vertical versions throughout, rather than one direction you have to rotate',
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
      'Anyone who needs a dependable stripe that tiles exactly at any scale',
      'Makers putting patterns on fabric, packaging, paper goods, or awnings',
      'Designers who want a quiet base to sit under illustration or type',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People who want figurative or illustrated motifs',
      'People after a single bespoke stripe rather than a set to choose from',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'large-format', price: 3 }
    ],
    thankYouPath: '/thank-you/stripes-and-rules/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Checks & Weaves',
    slug: 'checks-and-weaves',
    code: 'CHEK',
    tier: 'collection',
    price: 22,
    short:
      'Gingham, windowpane, graph, basket and twill checks, built the way cloth is.',
    full: [
      'Checks & Weaves is a Collection of seamless checks built the way woven cloth actually works: two sets of bands crossing, with the crossings coming out stronger where both colours lie over one another. Drawing a check as a grid of coloured squares gives you something that looks almost right; building it from bands gives you the crossings for free, and they are what make a check read as cloth.',
      'The set covers gingham, windowpane and casement checks, fine graph and quadrille, basket and hopsack weaves, tattersall, shepherd checks, madras with its uneven warp and weft sequences, broken and pointed checks, pin checks, overchecks, and turned twill blocks.',
      'These are the ordinary constructions any weaver would recognise, drawn from first principles. Nothing here reproduces any company signature check or plaid, and the colourways come from the house palette.'
    ],
    features: [
      'Seamless checks: gingham, windowpane, graph, basket weave, tattersall, shepherd check, madras, broken check, pin check, overcheck, and twill blocks',
      'Built as crossing bands, so the crossings come out as they do in woven cloth',
      'Warp and weft carry their own sequences where the structure calls for it, as on a loom',
      'Every repeat tiles edge to edge with no visible seam',
      'Recolor any repeat in the Studio and save your own colorways',
      'Adjust the scale of the repeat before exporting',
      'Export single tiles and larger swatch sheets as PNG, JPEG, or SVG, at the pixel size you choose',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required'
    ],
    forWhom: [
      'Anyone working on textiles, soft furnishings, or anything that should read as cloth',
      'Designers who want checks that hold together when scaled right down',
      'Makers of stationery, packaging, and table linen',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for a particular brand or house check — these are original constructions, not reproductions',
      'People who want painterly or hand-drawn surfaces',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/checks-and-weaves/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Waves & Water',
    slug: 'waves-and-water',
    code: 'WAVE',
    tier: 'collection',
    price: 22,
    short:
      'Wave rows, ripples, scallop water, currents, droplets, and bubbles.',
    full: [
      'Waves & Water is a Collection of seamless repeats on one subject: moving water. It covers rows of waves at every weight from hairline to solid, double currents, overlapping scallop water, concentric ripples from a dropped stone, swells whose height grows and falls, fine tide lines, solid crests, curling eddies, drifting shoals, droplets, and bubble fields.',
      'A curve is harder to repeat than a straight line, because it has to arrive back at the height it started from. Every wave family here uses a whole number of cycles across the tile and every scattered mark is repeated across the edges, so the water runs on without a join at any size.',
      'The range runs from very quiet — fine tide lines that read as texture — through to bold solid crests that carry a surface on their own.'
    ],
    features: [
      'Seamless water repeats: wave rows, double currents, scallop water, ripples, swells, droplets, tide lines, solid crests, eddies, shoals, and bubble fields',
      'Curves built on whole numbers of cycles, so a wave arrives back where it started',
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
      'Designers working on anything coastal, nautical, bathing, or swimming related',
      'Makers of towels, swimwear, tiles, packaging, and stationery',
      'Anyone who needs a calm repeating ground with movement in it',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People who want photographic water rather than drawn water',
      'People looking for marine illustration — shells, fish and boats are not in this set',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/waves-and-water/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Stars & Night',
    slug: 'stars-and-night',
    code: 'STAR',
    tier: 'collection',
    price: 22,
    short:
      'Star grids, scattered star fields, sparkles, crescents, moon phases, and comets.',
    full: [
      'Stars & Night is a Collection of seamless repeats for night skies and everything that borrows from them. It covers ordered star grids, scattered fields at mixed sizes, four-pointed sparkles with long arms, constellations joined by fine lines, crescents and moon phases, radiant starbursts, quiet dot grounds, star lattices, and comets with tapering tails.',
      'The stars are drawn as point geometry — a ring of outer and inner vertices — rather than traced from anything, so they can be set to five, six or eight points and still come out even. The crescents and moon phases are made by taking one disc out of another, which is how they are drawn by hand.',
      'The set deliberately spans both registers: very quiet grounds that work behind type, and bold motifs that carry a surface on their own.'
    ],
    features: [
      'Seamless night repeats: star grids, star fields, sparkles, constellations, crescents, starbursts, moon phases, night dots, star lattices, comets, and fine twinkle grounds',
      'Stars drawn as point geometry, so five, six and eight-point forms all come out even',
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
      'Designers working on children’s goods, nursery textiles, bedding, and sleepwear',
      'Makers of wrapping paper, cards, and stationery for the darker half of the year',
      'Anyone who needs a quiet starry ground that still holds up when scaled down',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for accurate astronomy — the constellations here are decorative, not charted',
      'People who want flags, emblems or team devices, which this set deliberately avoids',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/stars-and-night/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Folk Geometry',
    slug: 'folk-geometry',
    code: 'FKGY',
    tier: 'collection',
    price: 24,
    short:
      'Counted-thread geometry: cross stitch, diamond bands, stepped borders, and block flowers.',
    full: [
      'Folk Geometry is a Collection of seamless repeats built the way counted embroidery is built: on a square count, where every motif lands on whole cells and nothing sits between them. It covers cross-stitch grounds, counted block flowers and star motifs, diamond bands, stepped key borders, counted chevrons, rows of conifers, checked diamonds, sampler bands, meanders, seed rows, and block medallions.',
      'Working on a count is what gives this kind of pattern its particular character: the curves are gone, every shape is made of squares, and the result is readable at sizes where a drawn line would disappear. It also makes the repeats exact, because a motif that is a whole number of cells across on a grid that is a whole number of cells wide cannot land off the edge.',
      'These are generic counted-thread constructions drawn from first principles. Nothing here reproduces a particular community’s traditional textile.'
    ],
    features: [
      'Seamless counted repeats: cross stitch, block flowers, diamond bands, stepped borders, counted chevrons, tree rows, checked diamonds, sampler bands, meanders, seed rows, and block medallions',
      'Built on a square count, so every motif lands on whole cells',
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
      'Designers working on anything with a handmade or heritage feel',
      'Makers of table linen, aprons, bags, and kitchen goods',
      'Anyone who needs motifs that stay readable when printed small',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for the traditional patterns of a particular culture — these are new constructions in a counted idiom',
      'People who want smooth curves rather than squared-off motifs',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/folk-geometry/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Arches & Columns',
    slug: 'arches-and-columns',
    code: 'ARCH',
    tier: 'collection',
    price: 24,
    short:
      'Arcades, colonnades, nested arches, keystones, and stepped piers.',
    full: [
      'Arches & Columns is a Collection of seamless repeats drawn from building: open arcades on columns, solid blind arches, arches nested inside one another, colonnades with capitals and bases, keystones set into a band of voussoirs, rows of half rounds, deep horseshoe arches, arched windows with sills, pillar-and-dot rhythms, interlocking arch lattices, and stepped piers under a lintel.',
      'A round arch is a half circle standing on two uprights, and a row of them repeats exactly when the bay width divides the tile. That is the whole construction, and keeping to it is what lets an architectural rhythm run across a wall or a length of fabric without a join appearing where the tile ends.',
      'The set covers both registers: fine drawn arcades that read as line, and heavy solid massing that reads as form.'
    ],
    features: [
      'Seamless architectural repeats: arcades, solid arches, nested arches, colonnades, keystones, half rounds, horseshoe arches, arched windows, pillar rhythms, arch lattices, and stepped piers',
      'Bays laid out on exact divisions of the tile, so an arcade runs on without a join',
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
      'Designers working on interiors, tiling, wallpaper, and architectural signage',
      'Makers who want a strong structural rhythm rather than a scattered motif',
      'Anyone needing repeats that read well at a large scale across a wall',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for drawings of particular buildings — these are generic forms',
      'People who want soft or organic shapes',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'large-format', price: 3 }
    ],
    thankYouPath: '/thank-you/arches-and-columns/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Scallops & Shells',
    slug: 'scallops-and-shells',
    code: 'SCAP',
    tier: 'collection',
    price: 22,
    short:
      'Scallop rows, clamshells, ribbed fans, shell borders, and spirals.',
    full: [
      'Scallops & Shells is a Collection of seamless repeats on curved, overlapping forms: solid scallop rows that shingle over one another, nested clamshell arcs, ribbed fan shells with the ribs radiating from the hinge, bands with a scalloped lower edge, open rib fans, scattered cockles, swelling scallops that deepen and shallow across a row, facing shell borders, beaded pearl rows, spiral nautilus shells, and quartered scallop lattices.',
      'Scallops interlock, which is what makes them satisfying and also what makes them easy to get wrong: if the rows are not dropped by exactly half a step the shapes stop nesting, and if the scallop is not sized to its row it reads as a fringe hanging below a line rather than as a surface.',
      'Both are handled here by construction. The rows drop by half, and the scallop depth follows the row height rather than being picked independently.'
    ],
    features: [
      'Seamless scallop repeats: scallop rows, clamshells, ribbed shells, scalloped edges, rib fans, cockles, swelling scallops, shell borders, pearl rows, nautilus spirals, and scallop lattices',
      'Rows dropped by exactly half a step, so the scallops nest rather than nearly nest',
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
      'Designers working on anything coastal, or on roofing, tiling, and shingle effects',
      'Makers of children’s goods, bedding, and soft furnishings',
      'Anyone who wants a soft repeating rhythm without drawing each row by hand',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for naturalistic shell illustration',
      'People who want hard-edged geometry',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/scallops-and-shells/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Confetti & Specks',
    slug: 'confetti-and-specks',
    code: 'CNFT',
    tier: 'collection',
    price: 20,
    short:
      'Scattered confetti, specks, dashes, torn paper, grains, sprinkles, and crumbs.',
    full: [
      'Confetti & Specks is a Collection of seamless scatters: turned confetti rectangles in three inks, fine speck grounds, leaning dashes, rough torn-paper shapes, grains all lying one way, mixed circles and squares and triangles, rounded sprinkles, tiny flecks, rings mixed with filled dots, specks that thin and gather across the tile, and irregular crumbs.',
      'A scatter is the one kind of pattern where nothing lands on a grid line, which is exactly what makes it hard to repeat. Every mark here is placed on a jittered grid and any mark crossing an edge is repeated on the opposite side, so the field runs on seamlessly while still looking like it was thrown rather than placed.',
      'Scatters are the most useful filler in surface design: they sit over anything, they break up flat colour, and they rarely compete with whatever else is on the page.'
    ],
    features: [
      'Seamless scattered repeats: confetti, specks, dashes, torn paper, grains, mixed shapes, sprinkles, flecks, ring confetti, drifting specks, and crumbs',
      'Marks placed off the grid and repeated across the edges, so a scatter repeats without looking regular',
      'Every repeat tiles edge to edge with no visible seam',
      'Recolor any repeat in the Studio and save your own colorways',
      'Adjust the scale of the repeat before exporting',
      'Export single tiles and larger swatch sheets as PNG, JPEG, or SVG, at the pixel size you choose',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required'
    ],
    forWhom: [
      'Designers who need a filler that sits behind anything without competing with it',
      'Makers of party goods, wrapping paper, cards, and packaging',
      'Anyone who wants to break up a flat colour without adding a motif',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People who want a regular, ordered repeat',
      'People looking for illustrated motifs rather than abstract marks',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 3 },
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/confetti-and-specks/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Crystal & Facet',
    slug: 'crystal-and-facet',
    code: 'CRYS',
    tier: 'collection',
    price: 26,
    short:
      'Faceted planes, cut gems, prisms, shards, crystal clusters, and geodes.',
    full: [
      'Crystal & Facet is a Collection of seamless repeats made of flat planes meeting at angles: triangulated facet fields, cut gems with crown and pavilion, three-plane prisms, scattered shards and splinters, faceted diamond lattices, standing crystal clusters, low-poly grounds, bright-cut stones, banded quartz, fine ice needles, and geodes cut in section.',
      'Facets only work if the planes meet cleanly. These are built from a shared grid of vertices, so neighbouring triangles use the same corners and there are no hairlines between them — and the vertex grid wraps, so a facet spanning the tile edge meets its own continuation on the other side.',
      'The set covers both the sharp, cold end of the idea — splinters and ice — and the warm decorative end, with cut gems and sectioned geodes.'
    ],
    features: [
      'Seamless faceted repeats: facet fields, cut gems, prisms, shards, diamond facets, crystal clusters, low-poly grounds, bright-cut stones, quartz bands, ice splinters, and geodes',
      'Facets built on a shared wrapping vertex grid, so planes meet without hairlines between them',
      'Every repeat tiles edge to edge with no visible seam',
      'Recolor any repeat in the Studio and save your own colorways',
      'Adjust the scale of the repeat before exporting',
      'Export single tiles and larger swatch sheets as PNG, JPEG, or SVG, at the pixel size you choose',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Works offline in the Studio once the page has loaded',
      'Commercial license included, with no attribution required'
    ],
    forWhom: [
      'Designers working on packaging, jewellery presentation, and anything that should read as cut or polished',
      'Makers who want bold angular geometry with more depth than flat shapes give',
      'Anyone needing a faceted ground that still tiles exactly',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People who want photorealistic gems or rendered three-dimensional stone',
      'People looking for soft or organic forms',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 4 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/crystal-and-facet/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Seam Inspector',
    slug: 'seam-inspector',
    code: 'SEAM',
    tier: 'studio-edition',
    price: 22,
    short:
      'Checks whether any tile actually repeats, shows you the join, and mends it if it does not.',
    full: [
      'Seam Inspector answers one question about a tile: does it actually repeat? Load any image and it measures the tile’s opposite edges against the differences already inside it, and tells you plainly whether it meets or not, with the figures behind the verdict.',
      'A number is not enough on its own, so it also shows you the join. The four corners of the tile are drawn meeting in the middle of the view, which is where a seam appears if there is one. A tile that repeats shows nothing at the cross.',
      'When a tile does not meet, three repairs are offered. An offset rolls the tile half a step both ways, moving the join into the middle where it can be retouched. A mirror reflects the tile into each quarter, which always repeats, at the cost of a visible axis of symmetry. Blending fades each edge into the opposite one, which suits texture and grain and suits hard geometry much less. The mended tile downloads as a PNG with its resolution written into it.',
      'Everything happens in your browser. The image you load is read here and is not uploaded.'
    ],
    features: [
      'Load any PNG, JPEG, or SVG up to 12 MB and have it checked',
      'A plain verdict with the measurements behind it: how far each edge is from meeting, and the limit it is measured against',
      'A corner view that puts all four corners of the tile together, so you can see the join rather than take it on trust',
      'A live repeated preview at a small scale, which is where a seam shows first',
      'Three repairs: offset, mirror, and edge blending with an adjustable band',
      'Export the mended tile as a PNG with its resolution written into the file',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Your images are read by your own browser and are never uploaded',
      'Works offline once the page has loaded',
      'Commercial license included, with no attribution required'
    ],
    forWhom: [
      'Anyone who buys or downloads tiles from elsewhere and needs to know whether they really repeat',
      'Designers finishing their own repeats who want a second opinion before a print run',
      'Makers who have been caught out by a seam appearing on a finished product',
      'Anyone with a near-miss tile that could be rescued rather than redrawn'
    ],
    notForWhom: [
      'People who want a tool that draws patterns — this one only checks and mends them',
      'People expecting a mend that works on any image: a photograph with a strong subject cannot be made to tile without it showing',
      'People who need the pattern files from the Collections to resell — the license does not allow that',
      'People looking for batch checking of a whole folder at once'
    ],
    options: [
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 2 },
      { id: 'seam-report', price: 3 }
    ],
    thankYouPath: '/thank-you/seam-inspector/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Colorway Studio',
    slug: 'colorway-studio',
    code: 'CWAY',
    tier: 'studio-edition',
    price: 28,
    short:
      'Builds palettes, lifts them out of images, and tries them on real patterns before you commit.',
    full: [
      'Colorway Studio is for the part of surface design that happens after the drawing: deciding what colour it should be. A palette here is the same four slots every pattern in the shop uses — background, ink, and two accents — so a palette built here drops straight into any Collection you own.',
      'There are three ways to get to one. Set the four colours by hand; pick a base colour and let the tool build a palette from it by an ordinary colour-wheel relationship — complement, analogous, triad, or tonal, on a light or dark ground; or load an image and have its main colours lifted out and sorted into the four slots by lightness.',
      'Whichever way you get there, the palette is shown on a real pattern from a Collection you own, at a scale you can change, so you are judging it on artwork rather than on four squares. The contrast between ink and ground is measured and reported as you go, because a palette that cannot be read is no use however pleasant it looks.',
      'Palettes are saved on your device and export as swatch sheets with the hex values printed beneath each colour, plus the same data as a plain text file and as JSON for anything that prefers it.'
    ],
    features: [
      'Four-slot palettes that match the slots every Tilecraft pattern uses',
      'Build a palette from one base colour: complement, analogous, triad, or tonal, on a light or dark ground',
      'Lift a palette out of any image, with the main colours sorted into slots by lightness',
      'Live preview on a real pattern from any Collection you own, at a scale you set',
      'Contrast measured and reported as you work, so a palette that would disappear at small sizes is caught early',
      'Save as many palettes as you like, kept on your device and included in the Studio backup',
      'Export swatch sheets as PNG with the hex values printed, plus a plain text list and a JSON file',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Your images are read by your own browser and are never uploaded',
      'Works offline once the page has loaded'
    ],
    forWhom: [
      'Anyone who owns Collections and wants a faster way to decide their colours',
      'Designers matching a pattern to a brand or to an existing product',
      'Makers who want to build a set of colourways that hang together across a range',
      'Anyone who has picked a palette that looked good and printed badly'
    ],
    notForWhom: [
      'People who want colour-managed, calibrated output — screen colour is not print colour, and this tool does not pretend otherwise',
      'People who want a palette tool that works on artwork from outside the Studio',
      'People who need Pantone or other proprietary colour system references',
      'People who want the patterns themselves — this is a tool, not a Collection'
    ],
    options: [
      { id: 'print-specs', price: 2 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 3 }
    ],
    thankYouPath: '/thank-you/colorway-studio/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Mockup Studio',
    slug: 'mockup-studio',
    code: 'MCKP',
    tier: 'studio-edition',
    price: 34,
    short:
      'Puts any pattern on twelve drawn scenes and exports the result at print size.',
    full: [
      'Mockup Studio is for seeing a pattern on something before committing to it. A repeat that looks balanced as a flat tile can be far too busy on a tote bag and far too quiet on a wall, and the only way to know is to look.',
      'It works on any pattern from a Collection you own, and on a tile you bring in yourself, so it is equally useful for your own artwork. Pick a scene, set how large the repeat sits within it, and the pattern is laid into the scene live.',
      'Every scene is drawn artwork rather than a photograph, which matters for two reasons: the pattern goes in at full strength with no lighting or fabric texture flattening it, and there is no photographer’s licence sitting underneath your product shot.',
      'The finished scene exports as a PNG at up to 3000 pixels wide, with its resolution written into the file.'
    ],
    features: [
      'Twelve drawn scenes: fabric, wall, notebook, tote bag, box, phone case, cushion, mug, label, book cover, tiled wall, and gift wrap',
      'Works on any pattern from a Collection you own',
      'Works on a tile of your own: PNG, JPEG, or SVG up to 12 MB',
      'Set how large the repeat sits in the scene, so you can judge it at the size it will be seen',
      'Export at 1200, 2000, or 3000 pixels wide, with the resolution written into the PNG',
      'Every download arrives as a zip with a short license note beside the artwork',
      'Scenes are drawn artwork, not photographs, so there is no third-party image licence underneath your product shot',
      'Your images are read by your own browser and are never uploaded',
      'Works offline once the page has loaded',
      'Commercial license included, with no attribution required'
    ],
    forWhom: [
      'Anyone selling patterned goods who needs product images before the goods exist',
      'Designers presenting a repeat to a client and wanting it seen in context',
      'Makers deciding between repeats, or between scales of the same repeat',
      'Anyone who wants mockups without a separate photo licence to worry about'
    ],
    notForWhom: [
      'People who want photographic mockups with real lighting and fabric drape',
      'People who need a specific branded product shape',
      'People who want to composite onto their own photographs',
      'People who want the patterns themselves — this is a tool, not a Collection'
    ],
    options: [
      { id: 'mockup-pack', price: 4 },
      { id: 'print-specs', price: 3 },
      { id: 'palette-files', price: 2 },
      { id: 'large-format', price: 4 }
    ],
    thankYouPath: '/thank-you/mockup-studio/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Geometry Bundle',
    slug: 'geometry-bundle',
    code: 'GMBD',
    tier: 'collection',
    price: 45,
    short:
      'Four Collections of straight edges and exact angles: geometry, stripes, checks, and facets.',
    full: [
      'The four Collections built on straight lines and regular angles, which between them cover most of what a geometric brief asks for.',
      'It contains Geometric Essentials, Stripes & Rules, Checks & Weaves and Crystal & Facet. Bought one at a time those come to $78; together they are $45, which is $33 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Geometric Essentials — Grids, chevrons, triangles, hexagons, dots, and interlocking shapes in clean, modern compositions.',
      'Stripes & Rules — Even stripes, pinstripes, ticking, uneven bands, and broken rules, in both directions.',
      'Checks & Weaves — Gingham, windowpane, graph, basket and twill checks, built the way cloth is.',
      'Crystal & Facet — Faceted planes, cut gems, prisms, shards, crystal clusters, and geodes.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'geometric-essentials',
      'stripes-and-rules',
      'checks-and-weaves',
      'crystal-and-facet'
    ],
    thankYouPath: '/thank-you/geometry-bundle/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Nature Bundle',
    slug: 'nature-bundle',
    code: 'NTBD',
    tier: 'collection',
    price: 48,
    short:
      'Four Collections drawn from the natural world: plants, water, shells, and scattered marks.',
    full: [
      'Leaves and stems, moving water, overlapping shells, and the scattered specks that tie them together as a range.',
      'It contains Botanical Linework, Waves & Water, Scallops & Shells and Confetti & Specks. Bought one at a time those come to $78; together they are $48, which is $30 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Botanical Linework — Stylized leaves, vines, stems, and blossoms drawn as clean, simple linework.',
      'Waves & Water — Wave rows, ripples, scallop water, currents, droplets, and bubbles.',
      'Scallops & Shells — Scallop rows, clamshells, ribbed fans, shell borders, and spirals.',
      'Confetti & Specks — Scattered confetti, specks, dashes, torn paper, grains, sprinkles, and crumbs.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'botanical-linework',
      'waves-and-water',
      'scallops-and-shells',
      'confetti-and-specks'
    ],
    thankYouPath: '/thank-you/nature-bundle/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Retro Bundle',
    slug: 'retro-bundle',
    code: 'RTBD',
    tier: 'collection',
    price: 52,
    short:
      'Four Collections with a period feel: mid-century, deco, counted folk work, and night skies.',
    full: [
      'Four decades of borrowed idiom in one license: atomic mid-century shapes, deco fans and steps, counted folk motifs, and starry grounds.',
      'It contains Mid-Century Shapes, Art Deco Lines, Folk Geometry and Stars & Night. Bought one at a time those come to $86; together they are $52, which is $34 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Mid-Century Shapes — Playful mid-century-inspired forms: starbursts, boomerangs, organic blobs, and arcs.',
      'Art Deco Lines — Sunbursts, fans, stepped forms, and banded rules in the geometry of the 1920s and 30s.',
      'Folk Geometry — Counted-thread geometry: cross stitch, diamond bands, stepped borders, and block flowers.',
      'Stars & Night — Star grids, scattered star fields, sparkles, crescents, moon phases, and comets.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'mid-century-shapes',
      'art-deco-lines',
      'folk-geometry',
      'stars-and-night'
    ],
    thankYouPath: '/thank-you/retro-bundle/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Surface Bundle',
    slug: 'surface-bundle',
    code: 'SRBD',
    tier: 'collection',
    price: 45,
    short:
      'Four Collections for the layer on top: grain, terrazzo, facets, and specks.',
    full: [
      'The Collections that work as surface rather than as motif — the things you lay over other artwork to stop it looking rendered.',
      'It contains Textures & Grain, Tile & Terrazzo, Crystal & Facet and Confetti & Specks. Bought one at a time those come to $77; together they are $45, which is $32 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Textures & Grain — Paper grain, linen, stipple, noise, and brushed textures for adding depth to designs.',
      'Tile & Terrazzo — Ceramic-tile-inspired repeats, terrazzo, and mosaic patterns.',
      'Crystal & Facet — Faceted planes, cut gems, prisms, shards, crystal clusters, and geodes.',
      'Confetti & Specks — Scattered confetti, specks, dashes, torn paper, grains, sprinkles, and crumbs.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'textures-and-grain',
      'tile-and-terrazzo',
      'crystal-and-facet',
      'confetti-and-specks'
    ],
    thankYouPath: '/thank-you/surface-bundle/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Architecture Bundle',
    slug: 'architecture-bundle',
    code: 'ARBD',
    tier: 'collection',
    price: 50,
    short:
      'Four Collections for built surfaces: arches, tilework, deco, and geometry.',
    full: [
      'Arcades and colonnades, floor and wall tiling, deco detailing, and the plain geometry underneath all of it.',
      'It contains Arches & Columns, Tile & Terrazzo, Art Deco Lines and Geometric Essentials. Bought one at a time those come to $77; together they are $50, which is $27 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Arches & Columns — Arcades, colonnades, nested arches, keystones, and stepped piers.',
      'Tile & Terrazzo — Ceramic-tile-inspired repeats, terrazzo, and mosaic patterns.',
      'Art Deco Lines — Sunbursts, fans, stepped forms, and banded rules in the geometry of the 1920s and 30s.',
      'Geometric Essentials — Grids, chevrons, triangles, hexagons, dots, and interlocking shapes in clean, modern compositions.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'arches-and-columns',
      'tile-and-terrazzo',
      'art-deco-lines',
      'geometric-essentials'
    ],
    thankYouPath: '/thank-you/architecture-bundle/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Textile Bundle',
    slug: 'textile-bundle',
    code: 'TXBD',
    tier: 'collection',
    price: 58,
    short:
      'Five Collections for cloth: checks, stripes, counted folk work, scallops, and woven texture.',
    full: [
      'Everything in the shop that comes from cloth: the weaves, the stripes, the counted embroidery, and the grain that makes a flat print read as fabric.',
      'It contains Checks & Weaves, Stripes & Rules, Folk Geometry, Scallops & Shells and Textures & Grain. Bought one at a time those come to $100; together they are $58, which is $42 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Checks & Weaves — Gingham, windowpane, graph, basket and twill checks, built the way cloth is.',
      'Stripes & Rules — Even stripes, pinstripes, ticking, uneven bands, and broken rules, in both directions.',
      'Folk Geometry — Counted-thread geometry: cross stitch, diamond bands, stepped borders, and block flowers.',
      'Scallops & Shells — Scallop rows, clamshells, ribbed fans, shell borders, and spirals.',
      'Textures & Grain — Paper grain, linen, stipple, noise, and brushed textures for adding depth to designs.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'checks-and-weaves',
      'stripes-and-rules',
      'folk-geometry',
      'scallops-and-shells',
      'textures-and-grain'
    ],
    thankYouPath: '/thank-you/textile-bundle/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Nursery Bundle',
    slug: 'nursery-bundle',
    code: 'NRBD',
    tier: 'collection',
    price: 55,
    short:
      'Five gentle Collections for children’s goods: stars, scallops, confetti, botanicals, and water.',
    full: [
      'The five quietest Collections, chosen because they hold together as a range: a cot quilt, a wall, and a set of cards can all come out of this one license and still look related.',
      'It contains Stars & Night, Scallops & Shells, Confetti & Specks, Botanical Linework and Waves & Water. Bought one at a time those come to $100; together they are $55, which is $45 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Stars & Night — Star grids, scattered star fields, sparkles, crescents, moon phases, and comets.',
      'Scallops & Shells — Scallop rows, clamshells, ribbed fans, shell borders, and spirals.',
      'Confetti & Specks — Scattered confetti, specks, dashes, torn paper, grains, sprinkles, and crumbs.',
      'Botanical Linework — Stylized leaves, vines, stems, and blossoms drawn as clean, simple linework.',
      'Waves & Water — Wave rows, ripples, scallop water, currents, droplets, and bubbles.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'stars-and-night',
      'scallops-and-shells',
      'confetti-and-specks',
      'botanical-linework',
      'waves-and-water'
    ],
    thankYouPath: '/thank-you/nursery-bundle/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Maker’s Bundle',
    slug: 'makers-bundle',
    code: 'MAKR',
    tier: 'collection',
    price: 85,
    short:
      'Four everyday Collections plus Repeat Builder and Seam Inspector, for making your own as well.',
    full: [
      'For somebody who wants a working set of patterns and the means to make more: four Collections that cover most briefs, the tool that turns your own motifs into repeats, and the one that tells you whether they really tile.',
      'It contains Geometric Essentials, Botanical Linework, Stripes & Rules, Confetti & Specks, Repeat Builder and Seam Inspector. Bought one at a time those come to $131; together they are $85, which is $46 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Geometric Essentials — Grids, chevrons, triangles, hexagons, dots, and interlocking shapes in clean, modern compositions.',
      'Botanical Linework — Stylized leaves, vines, stems, and blossoms drawn as clean, simple linework.',
      'Stripes & Rules — Even stripes, pinstripes, ticking, uneven bands, and broken rules, in both directions.',
      'Confetti & Specks — Scattered confetti, specks, dashes, torn paper, grains, sprinkles, and crumbs.',
      'Repeat Builder — Turn your own motifs into seamless repeats — full drop, half drop, brick, and mirror — processed entirely in your browser.',
      'Seam Inspector — Checks whether any tile actually repeats, shows you the join, and mends it if it does not.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'People who want a working set of tools rather than one of them',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'geometric-essentials',
      'botanical-linework',
      'stripes-and-rules',
      'confetti-and-specks',
      'repeat-builder',
      'seam-inspector'
    ],
    thankYouPath: '/thank-you/makers-bundle/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Print Shop Bundle',
    slug: 'print-shop-bundle',
    code: 'PRSH',
    tier: 'collection',
    price: 95,
    short:
      'All four production tools: large exports, mockups, seam checking, and palettes.',
    full: [
      'The four tools that come after the drawing is done: deciding the colours, seeing it on something, proving it tiles, and getting it out at print size.',
      'It contains Production Studio, Mockup Studio, Seam Inspector and Colorway Studio. Bought one at a time those come to $159; together they are $95, which is $64 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Production Studio — Professional export tools: large print exports, vector SVG exports, batch colorways, and preset sizes for common print-on-demand and fabric printing.',
      'Mockup Studio — Puts any pattern on twelve drawn scenes and exports the result at print size.',
      'Seam Inspector — Checks whether any tile actually repeats, shows you the join, and mends it if it does not.',
      'Colorway Studio — Builds palettes, lifts them out of images, and tries them on real patterns before you commit.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'People who want a working set of tools rather than one of them',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want ready-made patterns — this bundle is tools, not Collections'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'production-studio',
      'mockup-studio',
      'seam-inspector',
      'colorway-studio'
    ],
    thankYouPath: '/thank-you/print-shop-bundle/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Every Collection',
    slug: 'every-collection',
    code: 'EVCN',
    tier: 'collection',
    price: 110,
    short:
      'All fifteen Collections in one license: every pattern in the shop, in every colorway.',
    full: [
      'Every Collection Tilecraft makes, in one license. Nothing is held back for a later tier, and new patterns added to any of these Collections arrive with it.',
      'It contains Geometric Essentials, Textures & Grain, Botanical Linework, Mid-Century Shapes, Tile & Terrazzo, Art Deco Lines, Stripes & Rules, Checks & Weaves, Waves & Water, Stars & Night, Folk Geometry, Arches & Columns, Scallops & Shells, Confetti & Specks and Crystal & Facet. Bought one at a time those come to $297; together they are $110, which is $187 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Geometric Essentials — Grids, chevrons, triangles, hexagons, dots, and interlocking shapes in clean, modern compositions.',
      'Textures & Grain — Paper grain, linen, stipple, noise, and brushed textures for adding depth to designs.',
      'Botanical Linework — Stylized leaves, vines, stems, and blossoms drawn as clean, simple linework.',
      'Mid-Century Shapes — Playful mid-century-inspired forms: starbursts, boomerangs, organic blobs, and arcs.',
      'Tile & Terrazzo — Ceramic-tile-inspired repeats, terrazzo, and mosaic patterns.',
      'Art Deco Lines — Sunbursts, fans, stepped forms, and banded rules in the geometry of the 1920s and 30s.',
      'Stripes & Rules — Even stripes, pinstripes, ticking, uneven bands, and broken rules, in both directions.',
      'Checks & Weaves — Gingham, windowpane, graph, basket and twill checks, built the way cloth is.',
      'Waves & Water — Wave rows, ripples, scallop water, currents, droplets, and bubbles.',
      'Stars & Night — Star grids, scattered star fields, sparkles, crescents, moon phases, and comets.',
      'Folk Geometry — Counted-thread geometry: cross stitch, diamond bands, stepped borders, and block flowers.',
      'Arches & Columns — Arcades, colonnades, nested arches, keystones, and stepped piers.',
      'Scallops & Shells — Scallop rows, clamshells, ribbed fans, shell borders, and spirals.',
      'Confetti & Specks — Scattered confetti, specks, dashes, torn paper, grains, sprinkles, and crumbs.',
      'Crystal & Facet — Faceted planes, cut gems, prisms, shards, crystal clusters, and geodes.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want the Studio Editions, which are tools and are not part of this bundle'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'geometric-essentials',
      'textures-and-grain',
      'botanical-linework',
      'mid-century-shapes',
      'tile-and-terrazzo',
      'art-deco-lines',
      'stripes-and-rules',
      'checks-and-weaves',
      'waves-and-water',
      'stars-and-night',
      'folk-geometry',
      'arches-and-columns',
      'scallops-and-shells',
      'confetti-and-specks',
      'crystal-and-facet'
    ],
    thankYouPath: '/thank-you/every-collection/',
    inks: ['teal', 'pink']
  },

  {
    name: 'Studio Editions Bundle',
    slug: 'studio-editions-bundle',
    code: 'STED',
    tier: 'collection',
    price: 120,
    short:
      'All six tools: generate, build repeats, check seams, choose colours, mock up, and produce.',
    full: [
      'Every tool in the shop, which together make a complete workflow: generate a pattern or build one from your own motifs, prove it tiles, settle its colours, see it on something, and export it at the size a printer wants.',
      'It contains Pattern Generator Studio, Repeat Builder, Production Studio, Colorway Studio, Mockup Studio and Seam Inspector. Bought one at a time those come to $239; together they are $120, which is $119 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Pattern Generator Studio — Create new seamless patterns from adjustable settings for shape, density, scale, rotation, and palette.',
      'Repeat Builder — Turn your own motifs into seamless repeats — full drop, half drop, brick, and mirror — processed entirely in your browser.',
      'Production Studio — Professional export tools: large print exports, vector SVG exports, batch colorways, and preset sizes for common print-on-demand and fabric printing.',
      'Colorway Studio — Builds palettes, lifts them out of images, and tries them on real patterns before you commit.',
      'Mockup Studio — Puts any pattern on twelve drawn scenes and exports the result at print size.',
      'Seam Inspector — Checks whether any tile actually repeats, shows you the join, and mends it if it does not.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'People who want a working set of tools rather than one of them',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use',
      'People who want ready-made patterns — this bundle is tools, not Collections'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'pattern-generator-studio',
      'repeat-builder',
      'production-studio',
      'colorway-studio',
      'mockup-studio',
      'seam-inspector'
    ],
    thankYouPath: '/thank-you/studio-editions-bundle/',
    inks: ['pink', 'teal']
  },

  {
    name: 'Complete Library',
    slug: 'complete-library',
    code: 'CMPT',
    tier: 'collection',
    price: 145,
    short:
      'Everything Tilecraft Digital makes: all fifteen Collections and all six tools, in one license.',
    full: [
      'Everything in the shop under one license code. Every Collection, every tool, and anything added to them later.',
      'It contains Geometric Essentials, Textures & Grain, Botanical Linework, Mid-Century Shapes, Tile & Terrazzo, Art Deco Lines, Stripes & Rules, Checks & Weaves, Waves & Water, Stars & Night, Folk Geometry, Arches & Columns, Scallops & Shells, Confetti & Specks, Crystal & Facet, Pattern Generator Studio, Repeat Builder, Production Studio, Colorway Studio, Mockup Studio and Seam Inspector. Bought one at a time those come to $536; together they are $145, which is $391 less.',
      'A bundle is one license code that unlocks everything in it. Activating it opens every product listed above in the Studio at once, on as many of your own devices as you use, and each one behaves exactly as it would if you had bought it on its own. Extras bought with a bundle apply to everything it unlocks.'
    ],
    features: [
      'Geometric Essentials — Grids, chevrons, triangles, hexagons, dots, and interlocking shapes in clean, modern compositions.',
      'Textures & Grain — Paper grain, linen, stipple, noise, and brushed textures for adding depth to designs.',
      'Botanical Linework — Stylized leaves, vines, stems, and blossoms drawn as clean, simple linework.',
      'Mid-Century Shapes — Playful mid-century-inspired forms: starbursts, boomerangs, organic blobs, and arcs.',
      'Tile & Terrazzo — Ceramic-tile-inspired repeats, terrazzo, and mosaic patterns.',
      'Art Deco Lines — Sunbursts, fans, stepped forms, and banded rules in the geometry of the 1920s and 30s.',
      'Stripes & Rules — Even stripes, pinstripes, ticking, uneven bands, and broken rules, in both directions.',
      'Checks & Weaves — Gingham, windowpane, graph, basket and twill checks, built the way cloth is.',
      'Waves & Water — Wave rows, ripples, scallop water, currents, droplets, and bubbles.',
      'Stars & Night — Star grids, scattered star fields, sparkles, crescents, moon phases, and comets.',
      'Folk Geometry — Counted-thread geometry: cross stitch, diamond bands, stepped borders, and block flowers.',
      'Arches & Columns — Arcades, colonnades, nested arches, keystones, and stepped piers.',
      'Scallops & Shells — Scallop rows, clamshells, ribbed fans, shell borders, and spirals.',
      'Confetti & Specks — Scattered confetti, specks, dashes, torn paper, grains, sprinkles, and crumbs.',
      'Crystal & Facet — Faceted planes, cut gems, prisms, shards, crystal clusters, and geodes.',
      'Pattern Generator Studio — Create new seamless patterns from adjustable settings for shape, density, scale, rotation, and palette.',
      'Repeat Builder — Turn your own motifs into seamless repeats — full drop, half drop, brick, and mirror — processed entirely in your browser.',
      'Production Studio — Professional export tools: large print exports, vector SVG exports, batch colorways, and preset sizes for common print-on-demand and fabric printing.',
      'Colorway Studio — Builds palettes, lifts them out of images, and tries them on real patterns before you commit.',
      'Mockup Studio — Puts any pattern on twelve drawn scenes and exports the result at print size.',
      'Seam Inspector — Checks whether any tile actually repeats, shows you the join, and mends it if it does not.',
      'One license code that unlocks all of it',
      'Extras bought with the bundle apply to every product in it',
      'Everything works offline in the Studio once a page has loaded',
      'Commercial license included, with no attribution required',
      'Activates on as many of your own devices as you use'
    ],
    forWhom: [
      'Anyone who would otherwise buy three or more of these Collections separately',
      'People who want a working set of tools rather than one of them',
      'Designers who want a range that hangs together rather than patterns from everywhere',
      'Makers putting patterns across a set of products that should look related',
      'Print-on-demand sellers who need repeats they are licensed to sell on'
    ],
    notForWhom: [
      'People who only want one of the products in it — buying that one on its own costs less',
      'People who need the pattern files to resell as a pattern pack or digital papers — the license does not allow that',
      'People looking for logo or trademark artwork — the license excludes that use'
    ],
    options: [
      { id: 'extra-colorways', price: 5 },
      { id: 'print-specs', price: 4 },
      { id: 'palette-files', price: 3 },
      { id: 'mockup-pack', price: 4 }
    ],
    grants: [
      'geometric-essentials',
      'textures-and-grain',
      'botanical-linework',
      'mid-century-shapes',
      'tile-and-terrazzo',
      'art-deco-lines',
      'stripes-and-rules',
      'checks-and-weaves',
      'waves-and-water',
      'stars-and-night',
      'folk-geometry',
      'arches-and-columns',
      'scallops-and-shells',
      'confetti-and-specks',
      'crystal-and-facet',
      'pattern-generator-studio',
      'repeat-builder',
      'production-studio',
      'colorway-studio',
      'mockup-studio',
      'seam-inspector'
    ],
    thankYouPath: '/thank-you/complete-library/',
    inks: ['teal', 'pink']
  }
];

/*
 * Purchase options
 *
 * Extras a buyer can add to a product at checkout. Every one of them is a
 * real thing the Studio hands over afterwards, not a line on a receipt:
 * the chosen ids travel with the order, are written into the license
 * record on the confirmation page, are printed on the certificate, and are
 * what the Studio reads to decide which extras to switch on.
 *
 * Each extra is described once here. A product lists the ids it offers and
 * what it charges for each, because the same extra is worth more beside a
 * large Collection than beside a small one.
 *
 *   id        Stable identifier. Stored in the license record, so changing
 *             one would strand anybody who already bought it.
 *   name      Shown beside the checkbox.
 *   blurb     One line saying what arrives.
 *   delivers  What the Studio switches on, kept here so the product page,
 *             the certificate and the Studio all describe it the same way.
 */
export const OPTIONS = {
  'extra-colorways': {
    id: 'extra-colorways',
    name: 'Extra colorway set',
    blurb: 'Four more curated colorways for every pattern, on top of the four included.',
    delivers: 'A second set of colorways in the Collection workspace.'
  },
  'print-specs': {
    id: 'print-specs',
    name: 'Print spec sheets',
    blurb: 'A one-page PDF per pattern: the repeat size at each resolution, and what a yard covers.',
    delivers: 'A spec sheet button beside every export.'
  },
  'palette-files': {
    id: 'palette-files',
    name: 'Palette files',
    blurb: 'Every colorway as a swatch sheet and as a palette file other software can read.',
    delivers: 'Palette export in the workspace.'
  },
  'mockup-pack': {
    id: 'mockup-pack',
    name: 'Extra mockup scenes',
    blurb: 'Six more scenes to try a pattern on: cushion, mug, label, book cover, tiled wall, and gift wrap.',
    delivers: 'The extra scenes in the mockup strip.'
  },
  'seam-report': {
    id: 'seam-report',
    name: 'Seam report',
    blurb: 'A PDF showing each tile meeting itself, with the edge measurements behind it.',
    delivers: 'A seam report button in the workspace.'
  },
  'motif-library': {
    id: 'motif-library',
    name: 'Starter motif library',
    blurb: 'Forty drawn motifs to build repeats from, so there is something to work with on day one.',
    delivers: 'The motif library in Repeat Builder.'
  },
  'seed-pack': {
    id: 'seed-pack',
    name: 'Curated seed pack',
    blurb: 'Sixty settings-and-seed combinations worth keeping, each one a finished starting point.',
    delivers: 'The seed pack in Pattern Generator Studio.'
  },
  'large-format': {
    id: 'large-format',
    name: 'Large-format presets',
    blurb: 'Preset output sizes for wide fabric, wallpaper drops, and panel prints.',
    delivers: 'The extra presets in the export panel.'
  }
};

/** The options a product offers: the shared description plus its own price. */
export function optionsFor(product) {
  if (!product || !Array.isArray(product.options)) return [];
  return product.options
    .map((entry) => {
      const base = OPTIONS[entry.id];
      return base ? { ...base, price: Number(entry.price) } : null;
    })
    .filter(Boolean);
}

/** One of a product's options by id, or null. */
export function optionFor(product, id) {
  return optionsFor(product).find((o) => o.id === id) || null;
}

/**
 * The options a selection actually refers to, in the product's own order.
 *
 * Ids the product does not offer are dropped rather than guessed at, so a
 * stale or edited link cannot invent an entitlement or a price.
 */
export function chosenOptions(product, ids) {
  const list = Array.isArray(ids) ? ids : String(ids || '').split(',');
  const wanted = new Set(list.map((id) => String(id).trim()).filter(Boolean));
  return optionsFor(product).filter((o) => wanted.has(o.id));
}

/** What a purchase comes to, with the chosen extras. */
export function priceWithOptions(product, ids) {
  if (!product) return 0;
  return chosenOptions(product, ids).reduce(
    (total, option) => total + option.price,
    Number(product.price) || 0
  );
}

/** A selection as it travels in a URL: the product's order, comma separated. */
export function encodeOptions(product, ids) {
  return chosenOptions(product, ids).map((o) => o.id).join(',');
}

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

/** Price formatted for display, e.g. "$10". */
export function formatPrice(price) {
  const n = Number(price);
  return '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}

export default PRODUCTS;
