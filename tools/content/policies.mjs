/*
 * Tilecraft Digital — policy pages
 *
 * Written in plain language, dated, and consistent with how the site
 * actually works. Nothing here promises anything the site or the business
 * cannot do. No contact address, phone number, postal address, or governing
 * jurisdiction appears anywhere: everything routes through the Contact page.
 */

import { SITE } from '../../js/site-config.js';

const UPDATED = SITE.lastUpdated;

/* ------------------------------------------------------------------ *
 * Refund Policy
 * ------------------------------------------------------------------ */

const refunds = {
  path: '/refunds/',
  title: 'Refund Policy',
  description:
    'A full refund on any Tilecraft Digital purchase if you ask within 14 days, no reason required. How to request one, and how long it takes.',
  eyebrow: 'Policy',
  lede: 'A full refund on any purchase if you ask within 14 days. No reason required.',
  updated: UPDATED,
  body: `
      <h2>The short version</h2>
      <p>If you want your money back within 14 days of buying, you get it. You do not have to explain why, and you do not have to justify it. Ask through the Contact page with your order number and the refund is processed.</p>

      <h2>What is covered</h2>
      <p>Every product sold here: every Collection, the Essentials Bundle, and every Studio Edition. There is no category of purchase that is excluded, and no difference between a $10 Collection and a $75 Studio Edition.</p>
      <p>Having already downloaded or exported patterns does not disqualify you. We do not track what you downloaded, because downloads happen in your own browser and never touch a server, so there would be nothing to check even if we wanted to.</p>

      <h2>The 14 days</h2>
      <p>The 14 days run from the date of purchase. A request sent on the fourteenth day counts. If you are close to the deadline, send the request rather than waiting until you have written a longer explanation — the request is what matters, and the date it arrives is the date we go by.</p>

      <h2>How to request a refund</h2>
      <ol>
        <li>Go to the <a href="/contact/">Contact page</a> and get in touch through the method listed there.</li>
        <li>Include your order number, and the email address you used at checkout.</li>
        <li>Say that you would like a refund. You do not need to give a reason.</li>
      </ol>
      <p>The order number is on the receipt from the payment provider, and on your License Certificate if your order reference was passed to the confirmation page. If you cannot find it, tell us the email address you paid with and roughly when you bought, and we will look for it.</p>

      <h2>How long it takes</h2>
      <p>Refunds are sent to the original payment method within 5 business days of the request. After that it is in the payment provider's hands, and their processing time may add a few more days before the money appears on your statement. That part is outside our control, and it varies between banks and card issuers.</p>
      <p>We will confirm when the refund has been sent. If more than ten business days have passed since that confirmation and nothing has arrived, get in touch again through the <a href="/contact/">Contact page</a> and we will chase it with the provider.</p>

      <h2>What happens to your license</h2>
      <p>The license ends when a purchase is refunded. From that point you no longer hold a commercial license to the patterns from that purchase, including patterns you had already downloaded, recolored, or generated, and you should stop using them in anything you sell.</p>
      <p>Because activation happens entirely in your browser, nothing is switched off remotely. We cannot reach into your device, and we do not try to. Removing the license from the Studio, and stopping use of the patterns, is yours to do. Asking for a refund is a statement that you are doing it.</p>

      <h2>Requests after 14 days</h2>
      <p>After 14 days a refund is no longer automatic, but you are still welcome to write. If something is wrong — the product does not work as the product page describes it, or something broke — tell us through the <a href="/contact/">Contact page</a> and we will put it right or refund you. This policy does not limit any rights you have under the consumer law where you live. See <a href="/consumer-rights/">Consumer rights</a>.</p>

      <h2>Chargebacks</h2>
      <p>If something has gone wrong, writing to us is faster than opening a dispute with your bank, and we would rather simply refund you. A chargeback takes weeks and costs both of us. We will always answer a refund request within the response time stated on the <a href="/contact/">Contact page</a>.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes, the new version is posted here with a new date at the top. The policy that applies to your purchase is the one that was published on the day you bought.</p>`
};

/* ------------------------------------------------------------------ *
 * Delivery Policy
 * ------------------------------------------------------------------ */

const delivery = {
  path: '/delivery/',
  title: 'Delivery Policy',
  description:
    'Everything Tilecraft Digital sells is digital and delivered instantly in your browser. How your license is issued, how to activate it on another device, and what happens if you lose your certificate.',
  eyebrow: 'Policy',
  lede: 'Everything here is digital. Your license is issued the moment you pay, in your own browser.',
  updated: UPDATED,
  body: `
      <h2>There is nothing to ship</h2>
      <p>All products are digital. Nothing is posted, nothing is couriered, and no physical item is produced or sent. There is no shipping cost because there is no shipment.</p>

      <h2>How delivery works, step by step</h2>
      <ol>
        <li><strong>You agree and pay.</strong> On the product page you confirm that you agree to the <a href="/terms/">Terms of Service</a>, the <a href="/license/">License</a>, and the <a href="/refunds/">Refund Policy</a>, then go through to the payment provider.</li>
        <li><strong>You are shown a confirmation page immediately.</strong> The payment provider sends you straight back to a confirmation page on this site. There is no waiting and no queue.</li>
        <li><strong>Your license is issued there and then.</strong> The confirmation page generates your license code, shows it to you, and activates it in that browser automatically. You do not have to type a code in anywhere.</li>
        <li><strong>You can download your License Certificate.</strong> The confirmation page offers a one-page PDF certificate carrying your license code, the product, the date, your order reference, a summary of what the license allows, and an activation link printed as both text and a QR code.</li>
        <li><strong>You open the Studio.</strong> The product is already unlocked in the <a href="/studio/">Studio</a> on that device.</li>
        <li><strong>Other devices use the activation link.</strong> Open the link on your certificate on another device, or scan the QR code with its camera, and the license activates there too.</li>
      </ol>

      <h2>How long delivery takes</h2>
      <p>It is immediate. The confirmation page issues the license as it loads, in your browser, without contacting a server. There is no email to wait for and no download to start.</p>

      <h2>What you actually receive</h2>
      <p>If you added any extras at checkout, they are part of the same license. They are switched on in the Studio when it is activated, they are listed on your certificate, and an extra bought with a bundle applies to every product that bundle unlocks. There is nothing separate to download and nothing to enter.</p>
      <p>You receive a license that unlocks the product inside the Studio, plus a License Certificate recording it. The patterns and tools themselves run in the Studio in your browser; what you export from the Studio — PNG and JPEG images, and SVG vector files from the patterns that are built from shapes — is yours to keep and use under the <a href="/license/">License</a>. Each export arrives as a zip holding the artwork and a short note recording the license it was made under.</p>

      <h2>If your email receipt does not arrive</h2>
      <p>The payment provider sends the payment receipt, not us. If it has not arrived, check the spam folder of the address you used at checkout. Your license does not depend on that email: it was issued on the confirmation page, and it is held in your browser.</p>

      <h2>If you lose your certificate</h2>
      <p>Your licenses are listed in the Studio's settings on any device where you have activated them, and you can download the certificate again from there at any time.</p>
      <p>If you have lost the certificate and have no device with the license still activated, get in touch through the <a href="/contact/">Contact page</a> with your order number and we will issue a replacement. This is one of the two reasons to keep your order number — the other is refunds.</p>

      <h2>Keeping your own backup</h2>
      <p>Licenses and saved work live in your browser and nowhere else. Clearing your browsing data, using a private window, or replacing a device can remove them. The Studio can export a backup file holding every license and everything you have saved, and import it again later. Taking one occasionally is worth the minute it costs.</p>

      <h2>How long you have access</h2>
      <p>Online access to the Studio continues for as long as Tilecraft Digital operates. Patterns you have already downloaded or exported are yours under a perpetual license and do not stop working if anything changes, because they are files on your own machine.</p>

      <h2>Failed or interrupted purchases</h2>
      <p>If payment did not complete, no license is issued and you are not charged. If you were charged but never reached a confirmation page, get in touch through the <a href="/contact/">Contact page</a> with your order number and we will either issue the license or refund you, whichever you prefer.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes, the new version is posted here with a new date at the top.</p>`
};

/* ------------------------------------------------------------------ *
 * Privacy Policy
 * ------------------------------------------------------------------ */

const privacy = {
  path: '/privacy/',
  title: 'Privacy Policy',
  description:
    'No cookies, no analytics, no advertising trackers. Your licenses, saved work, and any images you use stay in your own browser. What the payment provider handles, and your rights under GDPR and CCPA.',
  eyebrow: 'Policy',
  lede: 'No cookies. No analytics. No advertising trackers. Your work stays in your browser.',
  updated: UPDATED,
  body: `
      <h2>The short version</h2>
      <ul>
        <li>This site sets no cookies and runs no analytics or advertising trackers.</li>
        <li>Your licenses, your optional licensee name, your saved work, and any image you bring into the Studio are stored and processed only in your own browser, and are never sent anywhere.</li>
        <li>Activation codes travel in the part of a link that browsers never send to a web server, so we never see them.</li>
        <li>Payments are handled by third-party payment providers under their own privacy policies. We never see your full card details.</li>
        <li>We receive basic order information from the payment provider and use it only for support, refunds, and tax and accounting obligations.</li>
        <li>Nothing is ever sold, rented, or shared for advertising.</li>
      </ul>

      <h2>Cookies and tracking</h2>
      <p>This site sets no cookies of any kind. There are no analytics, no pixels, no advertising trackers, no session recording, no fingerprinting, and no third-party scripts. There is no cookie banner because there is nothing to consent to.</p>
      <p>The site does use your browser's own local storage and IndexedDB to remember your licenses, your display settings, and your saved work. That is storage on your device, under your control, which you can clear at any time from your browser's settings. It is not a cookie, it is never transmitted, and it is not readable by anyone but you.</p>

      <h2>What stays on your device</h2>
      <p>These things are stored in your browser and are never sent to us or to anyone else:</p>
      <ul>
        <li>Your license codes and the records of which products are activated.</li>
        <li>The licensee name, if you choose to enter one for your certificate. It is optional, it never leaves your device, and it exists only so that your certificate can carry your name.</li>
        <li>Everything you save in the Studio: presets, layouts, colorways, and other work.</li>
        <li>Any image you bring into the Studio. Images are read and processed by your own browser on your own machine. Nothing is uploaded.</li>
        <li>Your display settings: theme, interface size, and motion preference.</li>
      </ul>
      <p>We have no copy of any of it. That is the point of building it this way, and it is also the catch: if your browser data is cleared, or your device is lost, we cannot recover it for you, because we never had it. The Studio can export a backup file of everything at once, and we would encourage you to use it.</p>

      <h2>Activation links</h2>
      <p>An activation link looks like <span class="mono">https://${SITE.domain}/studio/#activate=YOUR-CODE</span>. Everything after the <span class="mono">#</span> is a fragment, and browsers do not send fragments to the web server. Your license code is read by the page in your browser and is never transmitted. This is deliberate: it means scanning the QR code on your certificate, or clicking the link in it, tells us nothing.</p>

      <h2>Payments</h2>
      <p>Payments are handled by third-party payment providers. When you pay, you are on their system, under their privacy policy, and their terms. We never see your full card number, and we never store card details.</p>
      <p>After a purchase, the payment provider gives us order information. That is typically your name, your email address, the products you bought, and your country — the country because tax is charged by where you are.</p>

      <h2>What we do with order information</h2>
      <p>Three things only:</p>
      <ul>
        <li><strong>Support.</strong> Answering you when you write, and matching your message to your order.</li>
        <li><strong>Refunds.</strong> Finding and processing a refund when you ask for one.</li>
        <li><strong>Tax and accounting.</strong> Meeting the record-keeping obligations that apply to a business that sells things.</li>
      </ul>
      <p>We do not use it for marketing. There is no mailing list. We will not email you about new products, and nothing on this site signs you up for anything.</p>

      <h2>Our legal basis, if you are in the EU or UK</h2>
      <ul>
        <li><strong>Performance of a contract</strong> for processing your order and providing support about it.</li>
        <li><strong>Legal obligation</strong> for keeping tax and accounting records.</li>
        <li><strong>Legitimate interests</strong> for keeping basic records of correspondence so that a conversation about an order makes sense when you write again.</li>
      </ul>
      <p>We do not rely on consent for anything, because we do not do anything that would need it.</p>

      <h2>Who else sees anything</h2>
      <p>The payment provider, because they process the payment. The company that hosts this site, which receives the ordinary web request logs any web server receives — the page requested, the time, the browser's user agent, and the IP address the request came from. We do not add anything to those logs, do not use them to build a profile, and do not combine them with order information.</p>
      <p>Nothing is ever sold. Nothing is ever shared for advertising. Nothing is handed to a data broker. We do not run an affiliate program, and no third party is given access to your order information for their own purposes.</p>

      <h2>How long anything is kept</h2>
      <p>Order information is kept for as long as tax and accounting law requires records of a sale to be kept, and then deleted. Correspondence about an order is kept while it is useful for supporting you and is deleted when it is not. Data on your own device stays there until you remove it; we have no part in that and no way to reach it.</p>

      <h2>Your rights under the GDPR</h2>
      <p>If you are in the EU or the UK, you have the right to ask for a copy of the personal data we hold about you, to have it corrected if it is wrong, to have it erased, to restrict or object to how it is processed, and to receive it in a portable form. You also have the right to complain to your national data protection authority.</p>
      <p>Exercise any of these through the <a href="/contact/">Contact page</a>. We will reply within the response time stated there and act on the request within one month. There is one limit worth stating plainly: we cannot erase records we are legally required to keep for tax purposes until that period has run out, and we cannot produce data we never held, which includes everything that lives only in your browser.</p>

      <h2>Your rights under the CCPA and CPRA</h2>
      <p>If you are a California resident, you have the right to know what personal information we have collected about you, where it came from, why we collected it, and who we shared it with; the right to have it deleted; the right to correct it; and the right not to be discriminated against for exercising any of these rights.</p>
      <p>We do not sell personal information and we do not share it for cross-context behavioral advertising, as those terms are defined under California law. We have not done so in the preceding twelve months. There is therefore no opt-out to offer, because there is nothing to opt out of.</p>
      <p>Exercise any of these rights through the <a href="/contact/">Contact page</a>.</p>

      <h2>Children</h2>
      <p>This site is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child has given us personal information, tell us through the <a href="/contact/">Contact page</a> and it will be deleted.</p>

      <h2>Security</h2>
      <p>The site is served over an encrypted connection. We hold very little: no card details, no passwords, and no accounts, because there are no accounts. The data that would be most sensitive — your work — is never in our hands at all.</p>

      <h2>International transfers</h2>
      <p>Our payment provider and our host may process data in countries other than your own, including the United States. Where that involves personal data of people in the EU or the UK, those transfers rely on the safeguards those providers have in place, such as standard contractual clauses.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes, the new version is posted on this page with a new date at the top. For a change that materially affects how we handle personal data, a short note saying what changed will sit at the top of this page for at least 30 days. Since there is no mailing list, this page is how changes are communicated, and it is worth checking it if you are about to buy.</p>`
};

/* ------------------------------------------------------------------ *
 * Terms of Service
 * ------------------------------------------------------------------ */

const terms = {
  path: '/terms/',
  title: 'Terms of Service',
  description:
    'The terms that apply when you buy from Tilecraft Digital: what the products are, what the license covers, your responsibilities, and how pricing, delivery, and refunds work.',
  eyebrow: 'Legal',
  lede: 'The terms that apply when you buy from Tilecraft Digital. In plain language, and short.',
  updated: UPDATED,
  body: `
      <h2>1. Accepting these terms</h2>
      <p>By using this site or buying anything from it, you accept these terms. If you do not accept them, do not buy anything and do not use the Studio.</p>
      <p>These terms work together with the <a href="/license/">License</a>, the <a href="/refunds/">Refund Policy</a>, the <a href="/delivery/">Delivery Policy</a>, the <a href="/privacy/">Privacy Policy</a>, and the <a href="/disclaimer/">Disclaimer</a>. All of them are part of the agreement between us.</p>

      <h2>2. Agreeing before checkout</h2>
      <p>Before you can go through to checkout you must confirm that you agree to the Terms of Service, the License, and the Refund Policy. That confirmation is part of the purchase, and a purchase cannot be made without it. All three are linked from the checkbox, and all three are readable in full before any payment step.</p>

      <h2>3. What the products are</h2>
      <p>Tilecraft Digital sells browser-based seamless pattern collections and pattern tools, activated with a license code. They run in the Studio on this site, in your own web browser. There is nothing to install, no account to create, and no server-side processing of your work.</p>
      <p>Each product page describes what that product includes and does. That description is what you are buying. If a product does not do what its page says it does, that is a fault and you should tell us through the <a href="/contact/">Contact page</a>.</p>

      <h2>4. Use of the patterns</h2>
      <p>What you may and may not do with the patterns is set out on the <a href="/license/">License</a> page, in full and in plain language. That page governs the use of everything you make here, including patterns you recolor, generate, or build from your own motifs.</p>

      <h2>5. License codes and activation links</h2>
      <p>Your license code and its activation link are yours. They may not be shared, published, sold, transferred, or given to anyone else, and they may not be posted anywhere publicly. A license covers one individual or one business, and the code is how that license is held.</p>
      <p>Activation is handled entirely by your browser, which means there is no remote switch and no device limit enforced by us. That is a matter of trust, and sharing a code is a breach of these terms.</p>

      <h2>6. Backing up your own data</h2>
      <p>Your licenses and your saved work are stored in your browser and nowhere else. No copy exists on any server, which means no copy can be restored by us under any circumstances. Backing up your own data is your responsibility, and the Studio provides an export and import feature for exactly that. Clearing browser data, using a private window, or replacing a device can remove everything that is not backed up.</p>

      <h2>7. Disclosure rules where you sell</h2>
      <p>The patterns are created with AI assistance and generated in code, as described on every product page and on the <a href="/license/">License</a> page. Some marketplaces have their own rules about disclosing AI-assisted designs. Those rules belong to those platforms, they differ, and they change. Following them wherever you sell is your responsibility, not ours.</p>

      <h2>8. Pricing, taxes, and payment</h2>
      <p>All prices are in US dollars. Applicable taxes are shown at checkout, calculated by the payment provider based on where you are.</p>
      <p>Payment is handled by third-party payment providers. We do not process card details ourselves and never see them. Their terms apply to the payment itself, alongside these terms. Prices may change at any time; the price that applies to your purchase is the one shown when you buy.</p>

      <h2>9. Delivery</h2>
      <p>All products are digital and delivered immediately through your browser. The full process is set out in the <a href="/delivery/">Delivery Policy</a>.</p>

      <h2>10. Refunds</h2>
      <p>A full refund is available on any purchase if you ask within 14 days, with no reason required. The full terms are in the <a href="/refunds/">Refund Policy</a>. The license ends when a purchase is refunded.</p>

      <h2>11. Licensed, not sold</h2>
      <p>All software and all patterns on this site are licensed to you, not sold to you. Tilecraft Digital keeps ownership of the Studio, the pattern code, the patterns themselves, this site, and everything in them. What you buy is the license described on the <a href="/license/">License</a> page, and nothing beyond it.</p>
      <p>Work you make using these products — your designs, your products, your artwork — is yours. That is what the commercial license is for.</p>

      <h2>12. Acceptable use</h2>
      <p>Do not attempt to break, probe, or interfere with this site or the Studio; do not try to circumvent license activation; and do not redistribute, repackage, or resell any part of the Studio or the patterns. Beyond that, use them for whatever you like, within the License.</p>

      <h2>13. Availability</h2>
      <p>We intend to keep this site and the Studio available, but we do not guarantee that they will be available without interruption. Once the Studio has loaded it works offline, and patterns you have already exported are files on your own machine and are not affected by anything that happens to this site.</p>

      <h2>14. Warranties</h2>
      <p>To the fullest extent permitted by law, the products are provided as they are, without warranties of any kind, whether express or implied, including any implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
      <p>Nothing in this section removes or limits any rights you have under the consumer law where you live. If you are a consumer in the EU or the UK, you keep your statutory rights in full — see <a href="/consumer-rights/">Consumer rights</a>.</p>

      <h2>15. Liability</h2>
      <p>To the fullest extent permitted by law, our total liability to you for anything arising out of or connected to a purchase is limited to the amount you paid for that purchase.</p>
      <p>We are not liable for indirect or consequential losses, for lost profits, or for loss of data, including data stored in your own browser that was not backed up.</p>
      <p>Nothing in this section limits liability that cannot be limited by law, including liability for fraud, for death or personal injury caused by negligence, or any liability to consumers that applicable law does not allow to be excluded.</p>

      <h2>16. Changes to these terms</h2>
      <p>These terms may change. The current version is always on this page, with the date it was last updated at the top. The version that applies to a purchase is the one published on the day you bought. Continuing to use the site after a change means you accept the current version.</p>

      <h2>17. If part of these terms cannot be enforced</h2>
      <p>If any part of these terms turns out to be unenforceable, the rest of them still apply.</p>

      <h2>18. Getting in touch</h2>
      <p>For anything to do with these terms, a purchase, a refund, or a problem, get in touch through the <a href="/contact/">Contact page</a>.</p>`
};

/* ------------------------------------------------------------------ *
 * Disclaimer
 * ------------------------------------------------------------------ */

const disclaimer = {
  path: '/disclaimer/',
  title: 'Disclaimer',
  description:
    'Colors vary between screens, printers, and materials, so test print before a large run. Product types are named only to describe what the patterns can be used for. Tilecraft Digital is independent.',
  eyebrow: 'Legal',
  lede: 'Three things worth being clear about before you buy.',
  updated: UPDATED,
  body: `
      <h2>Color will not match exactly</h2>
      <p>What you see on your screen is not what will come off a printer, and what comes off one printer is not what will come off another. Screens emit light and printers lay down ink; they are different things, and they do not agree.</p>
      <p>On top of that, the material changes the result. The same file printed on cotton, on coated paper, on uncoated paper, on vinyl, and on a ceramic surface will produce five different results, and none of them will be the color on your monitor.</p>
      <p>So: test print before a large production run. Order a sample, look at it under the light the finished thing will live in, and adjust from there. This is ordinary practice for anyone producing printed goods, and skipping it is how expensive mistakes happen.</p>
      <p>We make no claim about color accuracy, and we do not supply or guarantee any color profile.</p>

      <h2>Product types are named as examples, not as promises</h2>
      <p>Across this site you will see product types named — fabric, apparel, wallpaper, packaging, stationery, print-on-demand items, websites, digital designs, and others. They are named to describe the kinds of things the patterns can be used for, so you can tell whether a product suits your work.</p>
      <p>Naming a product type is not a statement that a pattern has been tested on it, is optimized for it, will reproduce well on it, or meets any standard or requirement that applies to it. Whether a pattern suits a particular process, material, or printer is for you to establish, which is another reason to test print.</p>

      <h2>Tilecraft Digital is independent</h2>
      <p>Tilecraft Digital is an independent business. It is not affiliated with, endorsed by, sponsored by, or connected to any platform, marketplace, print service, manufacturer, or software maker.</p>
      <p>Nothing on this site should be read as an endorsement by anyone else, or as a statement that any third party has approved, reviewed, or certified these products.</p>

      <h2>General</h2>
      <p>The information on this site is provided for general purposes and is written to be accurate as of the date at the top of this page. It is not professional advice. If you are making decisions with legal, tax, or commercial consequences, take advice from someone qualified to give it.</p>

      <h2>Getting in touch</h2>
      <p>If anything on this site is unclear or looks wrong, tell us through the <a href="/contact/">Contact page</a>.</p>`
};

/* ------------------------------------------------------------------ *
 * Consumer rights
 *
 * Added beyond the required policy set. Selling digital products to
 * consumers in the US, the EU, and the UK brings disclosure duties that
 * the other policies touch but do not gather in one place, and payment
 * processors expect to find them. Everything here matches how the site
 * actually works.
 * ------------------------------------------------------------------ */

const consumerRights = {
  path: '/consumer-rights/',
  title: 'Consumer rights',
  description:
    'Your statutory rights when buying digital products from Tilecraft Digital in the United States, the EU, and the UK, including the right of withdrawal and how to complain.',
  eyebrow: 'Legal',
  lede: 'Your statutory rights, and how our policies sit alongside them.',
  updated: UPDATED,
  body: `
      <h2>Why this page exists</h2>
      <p>Buying digital products brings you rights that do not depend on anything we write. This page gathers them in one place, says plainly how our own policies relate to them, and sets out how to complain. Nothing here takes anything away from you; where our policy and your statutory rights differ, whichever is better for you is the one that applies.</p>

      <h2>Before you buy</h2>
      <p>Everything you need in order to decide is on the site before any payment step:</p>
      <ul>
        <li><strong>Who you are buying from.</strong> Tilecraft Digital, an independent business selling digital pattern products. See <a href="/about/">About</a>.</li>
        <li><strong>What the product is.</strong> Each product page describes in full what that product includes and does, who it suits, and who it does not.</li>
        <li><strong>The price.</strong> Shown on every product page in US dollars. Applicable taxes are calculated and shown at checkout before you pay.</li>
        <li><strong>How it is delivered.</strong> Instantly, in your browser. See the <a href="/delivery/">Delivery Policy</a>.</li>
        <li><strong>What you may do with it.</strong> See the <a href="/license/">License</a>.</li>
        <li><strong>How to cancel and get your money back.</strong> See the <a href="/refunds/">Refund Policy</a>.</li>
        <li><strong>How to complain.</strong> Through the <a href="/contact/">Contact page</a>, covered below.</li>
      </ul>

      <h2>Functionality and compatibility of the digital content</h2>
      <p>You are entitled to know what you are getting technically, before you buy:</p>
      <ul>
        <li>The products run in a modern web browser, on a computer, tablet, or phone. There is nothing to install.</li>
        <li>There is no account, no subscription, and no login.</li>
        <li>There is no digital rights management, no copy protection, and no remote switch. Nothing phones home, and nothing can be switched off from our end.</li>
        <li>Once the Studio has loaded, it works offline.</li>
        <li>Licenses and saved work are stored in your own browser, using its local storage and IndexedDB. They are not stored on any server, and so cannot be recovered by us.</li>
        <li>Exports are image files, and with Production Studio also vector SVG files. These are standard formats that open in ordinary graphics software.</li>
        <li>Clearing your browser data, or using a private window, can remove your licenses and saved work. The Studio provides a backup export and import for this reason.</li>
      </ul>

      <h2>If you are in the EU or the UK: the right of withdrawal</h2>
      <p>Consumers in the EU and the UK normally have 14 days to withdraw from a distance purchase. For digital content delivered immediately, a trader is allowed to ask you to give up that right in exchange for getting the content straight away.</p>
      <p><strong>We do not ask you to give it up.</strong> You get the content immediately and you keep the full 14 days. Our <a href="/refunds/">Refund Policy</a> gives you a full refund within 14 days of purchase, no reason required, whether or not you have already used or exported anything. That is at least as good as the statutory right, and it applies to every customer everywhere, not only in the EU and the UK.</p>
      <p>To exercise it, write to us through the <a href="/contact/">Contact page</a> with your order number and say you want a refund. You do not need a special form of words and you do not need to explain yourself.</p>

      <h2>If you are in the EU or the UK: digital content quality</h2>
      <p>Digital content must be as described, fit for its purpose, and of satisfactory quality. If a product does not match what its page says it does, you are entitled to have it put right or to get your money back. Tell us through the <a href="/contact/">Contact page</a> and we will do one or the other.</p>

      <h2>If you are in the United States</h2>
      <p>Our 14-day refund policy applies to you in the same way. Beyond that, consumer protection law varies by state, and nothing in our policies limits the rights your state gives you. California residents should also read the CCPA section of the <a href="/privacy/">Privacy Policy</a>.</p>

      <h2>Automatic renewals</h2>
      <p>There are none. Every product here is a single one-time purchase. There is no subscription, no recurring charge, no trial that converts into a paid plan, and no stored payment arrangement on our side. You will never be charged a second time without buying something a second time.</p>

      <h2>Complaints</h2>
      <p>If something has gone wrong, write through the <a href="/contact/">Contact page</a> with your order number and what happened. Every complaint is answered within the response time stated on that page. If the answer does not resolve it, say so in reply and it will be looked at again.</p>
      <p>If you are a consumer in the EU or the UK and we cannot resolve a complaint between us, you keep the right to take the matter to the consumer protection body or court where you live.</p>

      <h2>Accessibility</h2>
      <p>If any part of this site or the Studio is difficult for you to use, see the <a href="/accessibility/">Accessibility</a> page, which says what has been done and how to tell us about a problem.</p>`
};

export const POLICY_PAGES = [refunds, delivery, privacy, terms, disclaimer, consumerRights];

export default POLICY_PAGES;
