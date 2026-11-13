/*
 * Tilecraft Digital — the license terms, in one place.
 *
 * The License page, the summary on every product page, and the text printed
 * on the License Certificate all read from here, so they can never drift
 * apart from one another.
 */

/** The one-sentence grant. */
export const GRANT =
  'Every purchase grants a non-exclusive commercial license to the buyer — ' +
  'an individual or a single business — to use the patterns, including ' +
  'recolored and generated versions, in their own designs and in physical ' +
  'and digital products they sell.';

/** What the license allows. */
export const ALLOWED = [
  'Use the patterns in your own designs, commercially or personally.',
  'Use them in physical products you sell: fabric, apparel, wallpaper, packaging, stationery, and print-on-demand items.',
  'Use them in digital products you sell: websites, templates you build, and digital designs.',
  'Recolor the patterns and use the recolored versions.',
  'Use patterns you generate or build yourself with the Studio Editions.',
  'Modify, crop, scale, layer, and combine the patterns with your own work.',
  'Use them in work you produce for a client.',
  'Keep using patterns you have already downloaded, for as long as you like.'
];

/** What the license does not allow. */
export const NOT_ALLOWED = [
  'Resell, share, or distribute the pattern files themselves, original or modified — including as digital papers, pattern packs, templates, or design files.',
  'Use the patterns in a logo or a trademark.',
  'Use the patterns in NFTs or any other crypto-token.',
  'Use the patterns to train AI models.',
  'Share, publish, sell, or transfer your license code or activation link.'
];

/** Plain answers to the questions buyers ask about the license. */
export const SUMMARY_TABLE = [
  { question: 'Who is licensed?', answer: 'You, as an individual, or one business.' },
  { question: 'Commercial use?', answer: 'Yes, including products you sell.' },
  { question: 'Attribution?', answer: 'Not required.' },
  { question: 'Item limit?', answer: 'None. Make and sell as many as you like.' },
  { question: 'Client work?', answer: 'Yes, for work you produce for a client.' },
  { question: 'Resell the pattern files?', answer: 'No, not original and not modified.' },
  { question: 'Logos or trademarks?', answer: 'No.' },
  { question: 'NFTs or crypto-tokens?', answer: 'No.' },
  { question: 'Train AI models?', answer: 'No.' },
  { question: 'Share your license code?', answer: 'No.' },
  { question: 'How long does it last?', answer: 'Perpetual for patterns you have already downloaded.' },
  { question: 'What ends it?', answer: 'A refund. The license ends when a purchase is refunded.' }
];

/** The short version printed on the certificate. */
export const CERTIFICATE_ALLOWS =
  'Use these patterns, including recolored and generated versions, in your own ' +
  'designs and in physical and digital products you sell. No attribution ' +
  'required. No limit on the number of items you make or sell. Client work is ' +
  'included. Licensed to one individual or one business.';

export const CERTIFICATE_DOES_NOT_ALLOW =
  'Do not resell, share, or distribute the pattern files themselves, original ' +
  'or modified, including as digital papers, pattern packs, templates, or ' +
  'design files. Do not use the patterns in logos or trademarks, in NFTs or ' +
  'other crypto-tokens, or to train AI models. Do not share this license code ' +
  'or its activation link.';

export const CERTIFICATE_DURATION =
  'This license is perpetual for patterns already downloaded, and ends if the ' +
  'purchase is refunded.';

/** How the patterns are made. Shown on product pages, the License page, and the FAQ. */
export const AI_DISCLOSURE = {
  heading: 'How the patterns are made',
  paragraphs: [
    'The patterns are created with AI assistance and generated in code. They are not made with AI image generators, and they are not made by using or tracing anyone else’s artwork.',
    'In practice that means the shapes, spacing, and repeat geometry are written as code, and AI was used as assistance while writing and refining that code. The output is drawn by the code, mathematically, which is also why every repeat tiles exactly.',
    'Every pattern is then checked by the build that produces it. Each one is rendered and its opposite edges are compared pixel by pixel, so a repeat that did not actually tile could not ship; anything that failed was redrawn rather than shipped. The tiled result was also reviewed by eye at several scales.',
    'Some marketplaces have their own rules about disclosing AI-assisted designs. Those rules are theirs, they differ from one to the next, and they change. Follow the rules of wherever you sell.'
  ]
};

export default {
  GRANT,
  ALLOWED,
  NOT_ALLOWED,
  SUMMARY_TABLE,
  CERTIFICATE_ALLOWS,
  CERTIFICATE_DOES_NOT_ALLOW,
  CERTIFICATE_DURATION,
  AI_DISCLOSURE
};
