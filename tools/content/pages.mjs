/*
 * Tilecraft Digital — the non-policy pages.
 *
 * Home, About, FAQ, Contact, License, Accessibility, and 404, plus the two
 * shells that the catalog fills in at runtime: product pages and purchase
 * confirmation pages.
 */

import { SITE, hasSupportEmail, supportEmail } from '../../js/site-config.js';
import { PRODUCTS, TIERS, productsByTier, formatPrice } from '../../js/products.js';
import { ALLOWED, NOT_ALLOWED, SUMMARY_TABLE, GRANT, AI_DISCLOSURE } from '../../js/license-terms.js';
import { h, pageHead, prose } from '../layout.mjs';

const UPDATED = SITE.lastUpdated;

const li = (items) => items.map((item) => `        <li>${item}</li>`).join('\n');

/* ------------------------------------------------------------------ *
 * Home
 * ------------------------------------------------------------------ */

const home = {
  path: '/',
  title: 'Tilecraft Digital — original seamless patterns and textures',
  description:
    'Original seamless patterns and textures for surface designers, makers, and print-on-demand sellers. Preview, recolor, and export them in a browser Studio. Commercial license included.',
  ogTitle: 'Tilecraft Digital — seamless patterns, in a browser Studio',
  scripts: ['/js/home.js'],
  raw: `
  <section class="hero" data-hero aria-labelledby="hero-title">
    <div class="hero__inks" aria-hidden="true">
      <div class="hero__ink hero__ink--a"><canvas data-ink-layer></canvas></div>
      <div class="hero__ink hero__ink--b" data-hero-nudge><canvas data-ink-layer></canvas></div>
    </div>

    <div class="hero__inner">
      <p class="eyebrow">Seamless patterns &amp; textures</p>
      <h1 class="hero__title" id="hero-title">
        <span class="overprint" data-text="Patterns that tile exactly.">Patterns that tile exactly.</span>
      </h1>
      <p class="hero__lede">
        Original seamless patterns and textures for surface designers, makers, and
        print-on-demand sellers. Preview them, recolor them, and export them in a
        Studio that runs in your browser. Every purchase includes a commercial license.
      </p>
      <div class="hero__actions">
        <a class="button" href="#collections">See the Collections</a>
        <a class="button button--ghost" href="#studio-editions">See the Studio Editions</a>
      </div>
      <p class="hero__hint" data-hero-hint>
        Two inks, overprinting. Move the cursor to pull them out of register, or
        <button type="button" class="link-button" data-reink>re-ink the plates</button>.
      </p>
    </div>
  </section>

  <section class="wrap" id="how-it-works" aria-labelledby="how-title" style="padding-block: clamp(3rem, 8vh, 5rem)">
    <p class="eyebrow">How buying works</p>
    <h2 id="how-title">Three steps, and the third one is the work.</h2>
    <ol class="steps" style="margin-top: 2rem">
      <li>
        <h3>Agree and pay</h3>
        <p>Confirm you agree to the Terms, License, and Refund Policy, then pay through our payment provider. Applicable taxes are shown at checkout.</p>
      </li>
      <li>
        <h3>Get your license certificate instantly</h3>
        <p>The confirmation page issues your license, activates it in that browser, and offers a one-page PDF certificate with a QR code for your other devices.</p>
      </li>
      <li>
        <h3>Create in the Studio</h3>
        <p>Your product is unlocked. Recolor, adjust, and export — all in your browser, with nothing uploaded and nothing to install.</p>
      </li>
    </ol>
  </section>

  <div class="split" id="collections">
    <div class="split__canvas">
      <canvas data-sticky-canvas aria-hidden="true" style="transition: opacity 180ms ease"></canvas>
      <p class="canvas-note" data-canvas-label>Decorative composition — not a pattern preview</p>
    </div>

    <div class="split__content" data-collections>
      <section aria-labelledby="collections-title">
        <p class="eyebrow">Tier one</p>
        <h2 id="collections-title"><span class="overprint" data-text="Collections">Collections</span></h2>
        <p class="lede" data-tier-blurb="collection">${h(TIERS.collection.blurb)}</p>
        <p>Each Collection is a set of seamless repeats built around one idea. Open one in the
          Studio, set your own colors, change the scale, and export the tile or a larger sheet.
          Buy one on its own, or take all five in the Essentials Bundle on a single license.</p>
      </section>
    </div>
  </div>

  <section class="printshop" id="studio-editions" aria-labelledby="editions-title">
    <div class="wrap">
      <div class="printshop__head">
        <p class="eyebrow">Tier two</p>
        <h2 id="editions-title">Studio Editions</h2>
        <p class="printshop__lede" data-tier-blurb="studio-edition">${h(TIERS['studio-edition'].blurb)}</p>
      </div>
      <ul class="printshop__panels" data-studio-editions></ul>
    </div>
  </section>

  <section class="wrap" aria-labelledby="license-strip-title" style="padding-block: clamp(3rem, 8vh, 5rem)">
    <p class="eyebrow">What you get with every purchase</p>
    <h2 id="license-strip-title">A commercial license, with no attribution required.</h2>
    <div class="terms-split">
      <div class="terms-card terms-card--yes">
        <h3>You may</h3>
        <ul>
${li(ALLOWED.slice(0, 5).map(h))}
        </ul>
      </div>
      <div class="terms-card terms-card--no">
        <h3>You may not</h3>
        <ul>
${li(NOT_ALLOWED.map(h))}
        </ul>
      </div>
    </div>
    <p style="margin-top:1.5rem"><a class="button button--ghost" href="/license/">Read the full license</a></p>

    <div class="disclosure">
      <h2>${h(AI_DISCLOSURE.heading)}</h2>
${AI_DISCLOSURE.paragraphs.map((p) => `      <p>${h(p)}</p>`).join('\n')}
    </div>
  </section>`
};

/* ------------------------------------------------------------------ *
 * License
 * ------------------------------------------------------------------ */

const license = {
  path: '/license/',
  title: 'License',
  description:
    'The commercial license included with every Tilecraft Digital purchase, in plain language: what you may do with the patterns, what you may not, and how long it lasts.',
  eyebrow: 'License',
  lede: 'Every purchase includes a commercial license. Here is exactly what it covers.',
  updated: UPDATED,
  body: `
      <h2>The grant</h2>
      <p>${h(GRANT)}</p>
      <p>Physical and digital products both count: fabric, apparel, wallpaper, packaging, stationery, print-on-demand items, websites, and digital designs. No attribution is required, and there is no limit on how many items you make or sell.</p>

      <h2>At a glance</h2>
      <div class="table-wrap">
        <table class="data-table">
          <caption>The commercial license, summarized</caption>
          <thead>
            <tr><th scope="col">Question</th><th scope="col">Answer</th></tr>
          </thead>
          <tbody>
${SUMMARY_TABLE.map(
  (row) => `            <tr><th scope="row">${h(row.question)}</th><td>${h(row.answer)}</td></tr>`
).join('\n')}
          </tbody>
        </table>
      </div>

      <h2>What you may do</h2>
      <ul>
${li(ALLOWED.map(h))}
      </ul>

      <h2>What you may not do</h2>
      <ul>
${li(NOT_ALLOWED.map(h))}
      </ul>

      <h2>A note on reselling the files</h2>
      <p>The line to keep in mind is between <em>using</em> a pattern and <em>supplying</em> it. Printing a pattern onto something you sell is use, and that is what this license is for. Handing the pattern itself to someone else — as a file, a digital paper, a pattern pack, a template, a design asset, or a layered file with the pattern in it as a reusable element — is supply, and that is not allowed, whether you modified it first or not.</p>
      <p>Client work sits on the use side. You can design something for a client using these patterns and deliver the finished design, including a print-ready file of that design. What you cannot do is hand the client the pattern as a separate asset for them to reuse.</p>

      <h2>Logos, trademarks, NFTs, and AI training</h2>
      <p>Four uses are excluded outright, and they are excluded for specific reasons.</p>
      <p><strong>Logos and trademarks</strong> are excluded because a trademark is a claim of exclusivity, and these patterns are licensed non-exclusively to everybody who buys them. Registering one as part of a mark would put you in conflict with every other licensee.</p>
      <p><strong>NFTs and other crypto-tokens</strong> are excluded. The patterns may not be minted, tokenized, or sold as or within any crypto-token.</p>
      <p><strong>Training AI models</strong> is excluded. The patterns may not be used as training data, fine-tuning data, or reference material for any machine learning model.</p>
      <p><strong>Sharing your license code or activation link</strong> is excluded. A license covers one individual or one business. The code is how it is held, and passing it on is passing on the license.</p>

      <h2>How long it lasts</h2>
      <p>The license is perpetual for patterns you have already downloaded. Once a file is on your machine, under this license, it stays licensed — nothing expires, nothing has to be renewed, and nothing is switched off if this site changes.</p>
      <p>The license ends when a purchase is refunded. If you take a refund, the license for that purchase ends, including for patterns you had already downloaded, and you should stop using them in anything you sell. See the <a href="/refunds/">Refund Policy</a>.</p>

      <h2>Who the license covers</h2>
      <p>One license covers one individual or one business. If you are a sole trader, that is you and your business together. If you are a company, it covers the company, and the people in it can use the patterns for the company's work.</p>
      <p>It does not stretch across separate businesses, and it is not a reseller or distributor license. If you need something broader, get in touch through the <a href="/contact/">Contact page</a> and say what you need.</p>

      <h2>Patterns you make yourself</h2>
      <p>Patterns you generate with Pattern Generator Studio, and repeats you build from your own motifs with Repeat Builder, are covered by the same commercial license on the same terms. Your own artwork stays yours; using Repeat Builder on it gives us no claim over it whatsoever.</p>

      <div class="disclosure">
        <h2>${h(AI_DISCLOSURE.heading)}</h2>
${AI_DISCLOSURE.paragraphs.map((p) => `        <p>${h(p)}</p>`).join('\n')}
      </div>

      <h2>Questions</h2>
      <p>If your use is not obviously covered by one of the lists above, ask before you build on it. Get in touch through the <a href="/contact/">Contact page</a>, describe what you want to do, and you will get a straight answer. The <a href="/faq/">FAQ</a> covers the questions that come up most often.</p>`
};

/* ------------------------------------------------------------------ *
 * About
 * ------------------------------------------------------------------ */

const about = {
  path: '/about/',
  title: 'About',
  description:
    'What Tilecraft Digital makes, and why: original seamless patterns and textures, generated in code, delivered through a browser Studio that keeps your work on your own device.',
  eyebrow: 'About',
  lede: 'What this is, and why it is built the way it is.',
  body: `
      <h2>What Tilecraft Digital makes</h2>
      <p>Tilecraft Digital makes original seamless patterns and textures, and the tools to work with them. They are sold as Collections — fixed sets of repeats around one idea — and as Studio Editions, which are tools for making and exporting patterns rather than sets of them.</p>
      <p>Everything is delivered through the Studio, a workspace that runs in a web browser. You open a product there, change its colors and scale, and export what you need.</p>

      <h2>Why patterns at all</h2>
      <p>A seamless repeat is a small piece of geometry that has to be exactly right. The edges have to meet, the corners have to resolve, and the eye has to not find the grid. Getting that wrong is easy and getting it right is tedious, which is why so many patterns sold as seamless are not quite seamless, and why so many that are seamless look like a tiled wall.</p>
      <p>Everything here is built so that the repeat is correct by construction. The tiles are generated in code, so the edges are not stitched together after the fact — they are the same edge. That is a dull-sounding property that matters enormously the moment you scale a pattern up across a length of fabric.</p>

      <h2>Why it runs in your browser</h2>
      <p>The Studio could have been built as a service with your work on a server. It is not, and that was a deliberate choice.</p>
      <p>Your work stays on your device. Patterns you save, colorways you build, and images you bring in are stored in your own browser and never sent anywhere. There is no account, no login, and no upload. A tool that needs your artwork does not need to take a copy of it, and the less there is on a server, the less there is to lose, leak, or hold over you.</p>
      <p>The same choice is why the Studio works offline once it has loaded, and why your license is a code you hold rather than a row in our database. The honest cost of all this is that we cannot recover anything for you if your browser data is cleared — so the Studio can export a backup of everything at once, and you should take one.</p>

      <h2>How the patterns are made</h2>
      <p>${h(AI_DISCLOSURE.paragraphs[0])}</p>
      <p>${h(AI_DISCLOSURE.paragraphs[1])}</p>
      <p>${h(AI_DISCLOSURE.paragraphs[2])}</p>

      <h2>How this site is built</h2>
      <p>It is static HTML, CSS, and JavaScript. There are no cookies, no analytics, no advertising trackers, and no third-party scripts of any kind. Every font and every library is served from this site rather than from somewhere else, so loading a page here does not tell anybody else that you were reading it.</p>
      <p>The compositions you see across the site are drawn in code, in the browser, as decoration. They are illustrations, not previews of the patterns you would receive, and the site says so wherever one appears.</p>

      <h2>What you can expect</h2>
      <p>Plain descriptions of what each product includes and does, a price that does not move around, a commercial license written in language you can actually read, and a refund within 14 days if you want one, no reason required.</p>
      <p>You will not find countdown timers, fake discounts, invented review counts, or claims about what these patterns will do for your business. We do not know what they will do for your business.</p>

      <h2>Getting in touch</h2>
      <p>Questions about the products, the license, or an order go through the <a href="/contact/">Contact page</a>.</p>`
};

/* ------------------------------------------------------------------ *
 * FAQ
 * ------------------------------------------------------------------ */

const faqItems = [
  {
    q: 'How do licenses work here?',
    a: `<p>When you buy, a license code is generated for you on the confirmation page and activated in that browser straight away. There is nothing to type in and no account to create.</p>
      <p>The code looks like <span class="mono">${h(SITE.licensePrefix)}-XXXX-XXXXXX-XX</span>. It carries the product it belongs to and a checksum of its own contents, which is how the Studio can tell a real code from a mistyped one without asking a server. It never uses characters that are easy to confuse by hand: no 0 or O, and no 1, I, or L.</p>`
  },
  {
    q: 'What is the License Certificate?',
    a: `<p>A one-page PDF generated in your browser at the moment of purchase. It records Tilecraft Digital, your name or business name if you entered one, the product, the license code, the issue date, your order reference, a plain summary of what the license allows and does not allow, a link to the full License page, and your activation link printed both as text and as a QR code.</p>
      <p>It is yours to keep, print, and file. It is also the fastest way to activate your license on a second device.</p>`
  },
  {
    q: 'How do I activate on another device?',
    a: `<p>Two ways, and both are on your certificate.</p>
      <ul>
        <li>Open the activation link on the other device. It activates there and the code disappears from the address bar.</li>
        <li>Scan the QR code with that device's camera, which opens the same link.</li>
      </ul>
      <p>You can also paste the code into the Studio directly: open the Studio, then Settings, then <em>Activate another license</em>.</p>
      <p>There is no device limit enforced by us, because activation happens entirely in your browser and never contacts a server. The license covers one individual or one business, so use it on as many of your own devices as you like, and do not pass it to anyone else.</p>`
  },
  {
    q: 'What if I lose my certificate?',
    a: `<p>If you still have the license active on any device, open the Studio there, go to Settings, and download the certificate again. It is regenerated on the spot.</p>
      <p>If you have no device with it active, get in touch through the <a href="/contact/">Contact page</a> with your order number and we will issue a replacement.</p>`
  },
  {
    q: 'What happens if I clear my browser data?',
    a: `<p>Your licenses and saved work are stored in your browser and nowhere else, so clearing site data removes them. Nothing is held on a server, which means we have no copy to restore.</p>
      <p>Two things protect you. Your certificate carries the code, so you can always activate again. And the Studio can export a backup file holding every license and everything you have saved, which you can import later on the same device or a different one. Settings, then <em>Export a backup</em>. It takes a few seconds and it is worth doing.</p>`
  },
  {
    q: 'Does it work offline?',
    a: `<p>Yes. Once the Studio has loaded, it keeps working without a connection — your products, your saved work, and your exports are all on your device already. Your browser can also install it like an app from its own menu.</p>
      <p>You need a connection the first time, and again when you want to pick up an update.</p>`
  },
  {
    q: 'Which devices and browsers are supported?',
    a: `<p>A modern web browser on a computer, tablet, or phone. Current versions of the mainstream browsers are what it is built and tested for.</p>
      <p>Large exports are limited by memory rather than by the browser, so a phone will not export at the sizes a desktop machine will. Everything else works the same everywhere. There is nothing to install and no operating system requirement.</p>`
  },
  {
    q: 'Can I use these commercially, including print-on-demand?',
    a: `<p>Yes. Every purchase includes a commercial license covering physical and digital products you sell, including print-on-demand items, with no attribution required and no limit on how many you make or sell.</p>
      <p>What you cannot do is resell or distribute the pattern files themselves, use them in a logo or trademark, use them in NFTs, or use them to train AI models. The <a href="/license/">License page</a> sets all of it out in full.</p>`
  },
  {
    q: 'What file formats do I get?',
    a: `<p>From the Collections, Pattern Generator Studio, and Repeat Builder: raster image exports, as single tiles and as larger sheets, with transparent-background options where that makes sense.</p>
      <p>Production Studio adds true vector SVG export for the repeats that are built from shapes, large raster exports at high pixel density, batch colorway export, and preset output sizes for common print-on-demand and fabric printing requirements.</p>
      <p>These are standard formats. They open in ordinary graphics software and you can do whatever you need with them afterwards.</p>`
  },
  {
    q: 'Do images I use in the Studio leave my device?',
    a: `<p>No. Images you bring into the Studio — into Repeat Builder, for instance — are read and processed by your own browser, on your own machine. Nothing is uploaded, to us or to anyone else.</p>
      <p>That is not a policy we are promising to keep. There is no upload code in the Studio, so there is nowhere for your images to go.</p>`
  },
  {
    q: 'How are the patterns made?',
    a: `<p>${h(AI_DISCLOSURE.paragraphs[0])}</p>
      <p>${h(AI_DISCLOSURE.paragraphs[1])}</p>
      <p>${h(AI_DISCLOSURE.paragraphs[2])}</p>`
  },
  {
    q: 'What is the difference between Collections and Studio Editions?',
    a: `<p><strong>Collections</strong> are sets of finished seamless repeats. You open one, set your colors, change the scale, and export. They are the fastest route from buying something to having a pattern you can use.</p>
      <p><strong>Studio Editions</strong> are tools. Pattern Generator Studio makes new patterns from settings you adjust. Repeat Builder turns your own motifs into seamless repeats. Production Studio is the export side: vector SVG, large print sizes, batch colorways, and preset output sizes.</p>
      <p>They are not competing with each other. A Collection gives you patterns; Production Studio gets any of them out at production size and in production formats. Plenty of people will want one Collection and nothing else, and that is a perfectly good place to stop.</p>`
  },
  {
    q: 'Can I get a refund?',
    a: `<p>Yes. A full refund on any purchase if you ask within 14 days, with no reason required. Write through the <a href="/contact/">Contact page</a> with your order number.</p>
      <p>Refunds go back to the original payment method within 5 business days of the request, and the payment provider's own processing may add a few days after that. The license ends when a purchase is refunded. The full terms are in the <a href="/refunds/">Refund Policy</a>.</p>`
  },
  {
    q: 'Is there a subscription?',
    a: `<p>No. Every product is a single one-time purchase. There is no subscription, no recurring charge, and no trial that turns into a paid plan. You will never be charged again without buying something again.</p>`
  },
  {
    q: 'Do you use cookies or analytics?',
    a: `<p>No cookies, no analytics, no advertising trackers, and no third-party scripts. The site stores your licenses and settings in your browser's own local storage, which is on your device and never transmitted. The <a href="/privacy/">Privacy Policy</a> covers it in full.</p>`
  }
];

const faq = {
  path: '/faq/',
  title: 'FAQ',
  description:
    'How licenses and certificates work, activating on another device, backups, offline use, supported browsers, commercial use and print-on-demand, file formats, how the patterns are made, and refunds.',
  eyebrow: 'Questions',
  lede: 'Licenses, certificates, devices, formats, and refunds.',
  body: `
      <nav aria-label="On this page" style="margin-bottom:2rem">
        <h2 style="margin-top:0;border:0;padding:0">On this page</h2>
        <ul>
${faqItems
  .map((item, i) => `          <li><a href="#q${i + 1}">${h(item.q)}</a></li>`)
  .join('\n')}
        </ul>
      </nav>

${faqItems
  .map(
    (item, i) => `      <h2 id="q${i + 1}">${h(item.q)}</h2>
      ${item.a.trim()}`
  )
  .join('\n\n')}

      <h2>Something else?</h2>
      <p>If your question is not here, ask it through the <a href="/contact/">Contact page</a>.</p>`
};

/* ------------------------------------------------------------------ *
 * Contact
 * ------------------------------------------------------------------ */

// The address is rendered when one is configured. With none set, the page
// still reads as an open business and simply points at the rest of the site;
// js/site.js fills this block in at runtime if the configuration changes.
const contactChannel = hasSupportEmail()
  ? `      <p class="lede" style="max-width:none">Email <a href="mailto:${h(supportEmail())}">${h(
      supportEmail()
    )}</a>.</p>`
  : `      <p>Write to the support address shown on your receipt or on your License Certificate,
        and include your order number. Everything you need to know before buying is on the
        <a href="/faq/">FAQ</a>, the <a href="/license/">License</a> page, and each product page.</p>`;

const contact = {
  path: '/contact/',
  title: 'Contact',
  description:
    'How to reach Tilecraft Digital about an order, a refund, the license, or a problem. Replies within two business days.',
  eyebrow: 'Contact',
  lede: 'Questions about an order, a refund, the license, or a problem with the Studio.',
  body: `
      <h2>How to reach us</h2>
      <div data-contact-block>
${contactChannel}
      </div>
      <p>There is no contact form on this site, and there is no live chat. One channel, read by a person.</p>

      <h2>How long a reply takes</h2>
      <p>Within two business days. Most messages are answered sooner. If more than two business days have passed and nothing has arrived, send the message again — occasionally one goes astray, and a second attempt is not a nuisance.</p>

      <h2>What to include</h2>
      <p>Two things make almost every question faster to answer:</p>
      <ul>
        <li><strong>Your order number.</strong> It is on the receipt from the payment provider, and on your License Certificate if your order reference reached the confirmation page.</li>
        <li><strong>The email address you used at checkout.</strong> It is how an order is found when the order number has gone missing.</li>
      </ul>
      <p>Then say what you need. For a refund, say so — you do not need to give a reason. For a problem in the Studio, say which product, which browser, and what happened. For a license question, describe what you want to do with the patterns and you will get a straight answer.</p>

      <h2>What we can and cannot do</h2>
      <p>We can issue a replacement certificate, process a refund, answer a license question, and look into a problem with the Studio.</p>
      <p>We cannot recover your saved work. Everything you save lives in your browser and is never sent to us, so there is no copy anywhere for us to send back. The Studio's backup export exists precisely because of this, and it is the only thing that protects that work.</p>

      <h2>Privacy and your rights</h2>
      <p>Requests under the GDPR or the CCPA, and complaints, also come through here. See the <a href="/privacy/">Privacy Policy</a> and <a href="/consumer-rights/">Consumer rights</a>.</p>`
};

/* ------------------------------------------------------------------ *
 * Accessibility
 * ------------------------------------------------------------------ */

const accessibility = {
  path: '/accessibility/',
  title: 'Accessibility',
  description:
    'What has been done to make the Tilecraft Digital site and Studio usable with a keyboard, a screen reader, reduced motion, and at larger text sizes — and how to report a problem.',
  eyebrow: 'Accessibility',
  lede: 'What has been done, what is known, and how to tell us about a problem.',
  updated: UPDATED,
  body: `
      <h2>The aim</h2>
      <p>This site and the Studio are built to meet WCAG 2.1 Level AA. That is the target the design and the code were written against, and it is checked as part of building each page.</p>

      <h2>What that means in practice</h2>
      <ul>
        <li><strong>Keyboard.</strong> Everything on the site and in the Studio can be operated with a keyboard alone. Focus is always visible, and a skip link at the top of every page jumps past the header.</li>
        <li><strong>Contrast.</strong> All running text meets AA contrast against its background, in both light and dark modes. The two fluorescent inks are used for graphics and large display type only, never for body text, because they do not clear AA at small sizes.</li>
        <li><strong>Motion.</strong> If your system is set to reduce motion, every animation and transition on the site stops. The Studio also has its own motion setting, so you can reduce motion here without changing your system setting.</li>
        <li><strong>Text size.</strong> Text scales with your browser's font size and the layout holds together when it does. The Studio additionally offers a larger interface setting.</li>
        <li><strong>Structure.</strong> Pages use semantic HTML with headings in order, landmarks, and labeled form controls, so a screen reader can move through them properly.</li>
        <li><strong>Narrow screens.</strong> The layout works down to 360 pixels wide without horizontal scrolling.</li>
        <li><strong>Decoration.</strong> The abstract compositions across the site are decorative and are hidden from screen readers rather than being announced as meaningless images.</li>
      </ul>

      <h2>Known limits</h2>
      <p>Two things are worth stating honestly.</p>
      <p>The Studio needs JavaScript. It cannot work without it, because running everything in your browser is what keeps your work off a server. Every other page on the site reads perfectly well with scripting switched off.</p>
      <p>Pattern work is visual. The Studio's interface — its controls, its labels, its settings — is built to be operated without sight, but judging a pattern is not something an interface can do for you.</p>

      <h2>Telling us about a problem</h2>
      <p>If something here is difficult or impossible for you to use, tell us through the <a href="/contact/">Contact page</a>. Say what you were trying to do, what got in the way, and what you were using — browser, assistive technology, and device, if you know them.</p>
      <p>Accessibility problems are treated as faults, not as feature requests, and they are fixed.</p>`
};

/* ------------------------------------------------------------------ *
 * 404
 * ------------------------------------------------------------------ */

const notFound = {
  path: '/404.html',
  title: 'Page not found',
  description: 'That page does not exist. Here is where everything is.',
  noindex: true,
  raw: `
  <section class="wrap notfound">
    <p class="eyebrow">404</p>
    <p class="notfound__code" aria-hidden="true">404</p>
    <h1><span class="overprint" data-text="That page is not here.">That page is not here.</span></h1>
    <p class="lede" style="margin-top:1.5rem">The address may be mistyped, or the page may have moved. Everything on the site is one of these:</p>
    <div class="terms-split" style="margin-top:2rem">
      <div class="terms-card">
        <h2 style="font-size:var(--step-1)">Products</h2>
        <ul style="list-style:none;padding:0;margin-top:0.9rem">
          <li style="padding-left:0"><a href="/#collections">Collections</a></li>
          <li style="padding-left:0"><a href="/#studio-editions">Studio Editions</a></li>
          <li style="padding-left:0"><a href="/studio/">Studio</a></li>
          <li style="padding-left:0"><a href="/about/">About</a></li>
        </ul>
      </div>
      <div class="terms-card">
        <h2 style="font-size:var(--step-1)">Buying and legal</h2>
        <ul style="list-style:none;padding:0;margin-top:0.9rem">
          <li style="padding-left:0"><a href="/license/">License</a></li>
          <li style="padding-left:0"><a href="/faq/">FAQ</a></li>
          <li style="padding-left:0"><a href="/refunds/">Refunds</a></li>
          <li style="padding-left:0"><a href="/delivery/">Delivery</a></li>
          <li style="padding-left:0"><a href="/terms/">Terms</a></li>
          <li style="padding-left:0"><a href="/privacy/">Privacy</a></li>
          <li style="padding-left:0"><a href="/contact/">Contact</a></li>
        </ul>
      </div>
    </div>
    <p style="margin-top:2rem"><a class="button" href="/">Back to the home page</a></p>
  </section>`
};

/* ------------------------------------------------------------------ *
 * Product page shells
 *
 * The shell carries the slug and the page metadata. Everything a visitor
 * reads is rendered at runtime from js/products.js, so the catalog can be
 * changed by editing that file alone. Re-running the build refreshes the
 * titles and descriptions in these shells to match.
 * ------------------------------------------------------------------ */

export function productPage(product) {
  const tier = TIERS[product.tier];
  return {
    path: `/products/${product.slug}/`,
    title: `${product.name} — ${formatPrice(product.price)}`,
    description: `${product.short} ${tier.name} from Tilecraft Digital. ${formatPrice(
      product.price
    )}, commercial license included, 14-day refund policy.`,
    scripts: ['/js/product-page.js'],
    raw: `
  <div data-product="${h(product.slug)}">

    <div class="page-head">
      <div class="wrap page-head__inner">
        <p class="eyebrow" data-product-tier>${h(tier.name)}</p>
        <h1 data-product-title><span class="overprint" data-text="${h(product.name)}">${h(
          product.name
        )}</span></h1>
        <p class="lede" data-product-short>${h(product.short)}</p>
      </div>
    </div>

    <div class="wrap product-layout">
      <div>
        <div class="product-art">
          <canvas data-product-art aria-hidden="true"></canvas>
        </div>
        <p class="canvas-note" style="position:static;border:0;background:none;padding-left:0">Decorative composition — not a pattern preview</p>

        <div class="prose" style="padding-block:1.5rem 0" data-product-body></div>
      </div>

      <aside class="buybox" aria-label="Price and purchase" data-buybox>
        <p class="buybox__price">${h(formatPrice(product.price))}</p>
        <p class="buybox__tier">${h(tier.name)} &middot; One-time purchase</p>
        <ul class="buybox__facts">
          <li>Instant access</li>
          <li>Commercial license included</li>
          <li>14-day refund policy</li>
          <li>Applicable taxes are shown at checkout.</li>
        </ul>
      </aside>
    </div>

  </div>`
  };
}

/* ------------------------------------------------------------------ *
 * Confirmation page shells
 *
 * Not linked anywhere on the site, carrying a noindex tag, and left out of
 * the sitemap. A buyer reaches one from the payment provider.
 * ------------------------------------------------------------------ */

export function thankYouPage(product) {
  return {
    path: product.thankYouPath,
    title: `License issued — ${product.name}`,
    description: `Your ${product.name} license has been issued and activated in this browser.`,
    noindex: true,
    scripts: ['/js/thank-you.js'],
    raw: `
  <div data-thank-you="${h(product.slug)}">

    <div class="page-head">
      <div class="wrap page-head__inner">
        <p class="eyebrow">Order complete</p>
        <h1><span class="overprint" data-text="License issued">License issued</span></h1>
        <p class="lede">Thank you. <span data-product-name>${h(
          product.name
        )}</span> is yours, and it is already activated in this browser.</p>
      </div>
    </div>

    <div class="wrap wrap--narrow" style="padding-block: clamp(2rem,6vh,3rem) clamp(3rem,9vh,5rem)">

      <div class="tray">
        <p class="tray__slot">Tilecraft Digital &middot; License Certificate &middot; printing</p>

        <div class="sheet" data-sheet>
          <p class="sheet__stamp" data-stamp aria-hidden="true">Activated</p>

          <h2 style="font-size:var(--step-2)">Your license</h2>
          <dl class="receipt" data-receipt></dl>

          <p class="status status--ok" role="status">This license is active in this browser. Nothing else needs to be done here.</p>

          <div class="action-row">
            <a class="button" href="/studio/">Open Studio</a>
            <button type="button" class="button button--ghost" data-download-certificate>Download License Certificate</button>
            <button type="button" class="button button--ghost" data-copy-activation>Copy activation link</button>
            <button type="button" class="button button--ghost" data-print>Print this page</button>
          </div>
          <p class="status" data-copy-status role="status"></p>

          <form class="field" data-licensee-form novalidate>
            <label for="licensee">Name on your certificate <span style="font-weight:400;color:var(--ink-muted)">(optional)</span></label>
            <p class="field__help">Your name or business name, if you would like it printed on the certificate. It is stored in this browser only and is never sent anywhere.</p>
            <div class="input-row">
              <input type="text" id="licensee" name="licensee" data-licensee-input autocomplete="organization" maxlength="80" placeholder="Your name or business name">
              <button type="submit" class="button button--small">Save</button>
            </div>
            <p class="status" data-licensee-status role="status"></p>
          </form>
        </div>
      </div>

      <div class="note" data-storage-warning hidden>
        <h3 style="font-size:var(--step-1)">This browser is not keeping site data</h3>
        <p>Your license was issued, but this browser will not store it — a private window, or site data blocked, will do that. Download your certificate now: it carries your code and the link that activates it anywhere else.</p>
      </div>

      <div class="note">
        <h3 style="font-size:var(--step-1)">Using this on another device</h3>
        <p>Your certificate carries an activation link and a QR code. Open the link, or scan the code with another device's camera, and the license activates there too. Your activation link is:</p>
        <p><a class="mono" data-activation-link href="/studio/">/studio/</a></p>
        <p>The code sits after the <span class="mono">#</span>, which browsers never send to a web server. Keep it to yourself: a license covers one individual or one business.</p>
      </div>

      <div class="note note--pink">
        <h3 style="font-size:var(--step-1)">Keep a backup</h3>
        <p>Your license and everything you save live in this browser and nowhere else. No copy exists on a server, so nothing can be restored by us. In the Studio, open Settings and export a backup — it takes a few seconds and covers everything at once.</p>
      </div>

      <h2 style="margin-top:3rem">What next</h2>
      <ul>
        <li><a href="/studio/">Open the Studio</a> and start working.</li>
        <li><a href="/license/">Read the license</a> in full.</li>
        <li><a href="/faq/">Read the FAQ</a> for certificates, devices, backups, and formats.</li>
        <li>Changed your mind? A full refund within 14 days, no reason required — see the <a href="/refunds/">Refund Policy</a>.</li>
      </ul>

    </div>
  </div>`
  };
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export const CONTENT_PAGES = [home, license, about, faq, contact, accessibility, notFound];

export { pageHead, prose, PRODUCTS, productsByTier };
export default CONTENT_PAGES;
