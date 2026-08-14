/**
 * Generates the derived images the site and Google need, from the four
 * portrait source photos in public/assets/.
 *
 * All four originals are 608x1080 portrait. That is fine on the page, but
 * wrong everywhere an image is consumed at a fixed aspect ratio:
 *
 *   - Open Graph / Twitter `summary_large_image` wants ~1.91:1. Handing it a
 *     0.56:1 portrait means WhatsApp and Facebook crop the preview to a band
 *     of sky and never show the signboard.
 *   - Google rich results ask for 16:9, 4:3 and 1:1 of the same photo.
 *   - Google Business Profile wants a 1080x608 cover and a 720x720 square.
 *
 * Rather than hand-cropping in an image editor, this renders each target with
 * headless Chromium so the crops are reproducible and re-runnable when the
 * photos are replaced.
 *
 * Requires Playwright (not a dependency of the site itself — this is one-off
 * asset generation, not part of the build):
 *
 *     npm i -D playwright && node scripts/make-images.mjs
 */

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve('public');
const OUT = path.join(ROOT, 'assets');
const PORT = 8891;

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const buf = await readFile(path.join(ROOT, p));
    res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
    res.end(buf);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const base = `http://127.0.0.1:${PORT}`;

/* The signboard sits at roughly 42% of the way down the source photo. Each
   crop's object-position is worked back from that so the sign stays in frame
   whatever the target ratio. */
const crop = (src, pos) => `
  <style>
    html,body{margin:0;padding:0;background:#4a0c14}
    img{width:100vw;height:100vh;object-fit:cover;object-position:center ${pos};display:block}
  </style>
  <img src="${base}/assets/${src}">`;

/* The link-preview card. Deliberately not a bare photograph: at the size
   WhatsApp renders it, a legible name and "open 24 hours" does more work than
   any crop of a storefront. Uses the site's own fonts and signboard lockup. */
const ogCard = `
  <style>
    @font-face{font-family:"Fraunces";src:url("${base}/assets/fonts/fraunces-latin-var.woff2") format("woff2");font-weight:100 900}
    @font-face{font-family:"Figtree";src:url("${base}/assets/fonts/figtree-latin-var.woff2") format("woff2");font-weight:300 900}
    @font-face{font-family:"Amiri";src:url("${base}/assets/fonts/amiri-bismillah-subset.woff2") format("woff2")}
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      width:1200px;height:630px;display:flex;align-items:center;gap:56px;
      padding:0 0 0 72px;overflow:hidden;
      font-family:"Figtree",sans-serif;color:#fdf6e3;
      background:radial-gradient(120% 90% at 12% 0%, #9a1a2b 0%, transparent 62%),
                 linear-gradient(160deg,#4a0c14 0%,#3a0810 100%);
    }
    .copy{flex:1;min-width:0}
    .bismillah{font-family:"Amiri",serif;font-size:26px;color:#e8b923;opacity:.85;display:block;margin-bottom:18px}
    .restoran{
      font-size:17px;font-weight:600;letter-spacing:.44em;text-transform:uppercase;
      color:#f4d878;border-bottom:2px solid rgba(232,185,35,.55);
      padding-bottom:9px;display:block;width:max-content;max-width:100%
    }
    .name{
      font-family:"Fraunces",serif;font-size:96px;font-weight:700;line-height:1;
      color:#e8b923;display:block;margin-top:12px;letter-spacing:.01em
    }
    .tag{font-size:25px;line-height:1.45;color:rgba(253,246,227,.84);margin-top:26px;max-width:19ch}
    .meta{
      display:flex;align-items:center;gap:14px;margin-top:30px;
      font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#f4d878
    }
    .dot{width:11px;height:11px;border-radius:50%;background:#46d17f;flex:none}
    .shot{
      width:392px;height:630px;flex:none;overflow:hidden;position:relative;
      border-left:1px solid rgba(232,185,35,.28)
    }
    .shot img{width:100%;height:100%;object-fit:cover;object-position:center 34%;display:block}
    .shot::after{
      content:"";position:absolute;inset:0;
      background:linear-gradient(90deg,rgba(74,12,20,.92) 0%,rgba(74,12,20,.12) 42%,transparent 100%)
    }
  </style>
  <div class="copy">
    <span class="bismillah">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</span>
    <span class="restoran">Restoran</span>
    <span class="name">Suriani</span>
    <p class="tag">Masakan Melayu, nasi ayam Hainan &amp; makanan barat.</p>
    <div class="meta"><span class="dot"></span><span>Pudu, KL &middot; Buka 24 Jam</span></div>
  </div>
  <div class="shot"><img src="${base}/assets/storefront.jpg"></div>`;

/* A square brand tile for the Google Business Profile logo slot. */
const logoTile = `
  <style>
    @font-face{font-family:"Fraunces";src:url("${base}/assets/fonts/fraunces-latin-var.woff2") format("woff2");font-weight:100 900}
    @font-face{font-family:"Figtree";src:url("${base}/assets/fonts/figtree-latin-var.woff2") format("woff2");font-weight:300 900}
    @font-face{font-family:"Amiri";src:url("${base}/assets/fonts/amiri-bismillah-subset.woff2") format("woff2")}
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      width:720px;height:720px;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:0;
      font-family:"Figtree",sans-serif;text-align:center;
      background:linear-gradient(160deg,#7a1120 0%,#4a0c14 100%)
    }
    .bismillah{font-family:"Amiri",serif;font-size:30px;color:#e8b923;opacity:.85;margin-bottom:30px}
    .restoran{
      font-size:20px;font-weight:600;letter-spacing:.46em;text-transform:uppercase;
      color:#f4d878;border-bottom:2px solid rgba(232,185,35,.55);padding-bottom:12px
    }
    .name{font-family:"Fraunces",serif;font-size:104px;font-weight:700;line-height:1;color:#e8b923;margin-top:16px}
    .sub{margin-top:34px;font-size:19px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,216,120,.72)}
  </style>
  <div class="bismillah">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
  <div class="restoran">Restoran</div>
  <div class="name">Suriani</div>
  <div class="sub">Pudu &middot; Sejak 1995</div>`;

const targets = [
  // Link previews (Open Graph / Twitter / WhatsApp).
  { name: 'og-image.jpg', w: 1200, h: 630, html: ogCard, q: 88 },

  // Same photo at the three ratios Google asks for in rich results.
  { name: 'photo-16x9.jpg', w: 1200, h: 675, html: crop('storefront.jpg', '38%'), q: 84 },
  { name: 'photo-4x3.jpg', w: 1200, h: 900, html: crop('storefront.jpg', '36%'), q: 84 },
  { name: 'photo-1x1.jpg', w: 1200, h: 1200, html: crop('storefront.jpg', '31%'), q: 84 },

  // Google Business Profile: cover photo and logo.
  { name: 'google/cover.jpg', w: 1080, h: 608, html: crop('storefront.jpg', '38%'), q: 88 },
  { name: 'google/logo.jpg', w: 720, h: 720, html: logoTile, q: 92 },

  // Business Profile interior shots, landscape so they sit well in the
  // Maps photo strip rather than being letterboxed.
  { name: 'google/interior.jpg', w: 1080, h: 810, html: crop('interior.jpg', '46%'), q: 86 },
  { name: 'google/dining-area.jpg', w: 1080, h: 810, html: crop('dining-area.jpg', '44%'), q: 86 },
];

await mkdir(path.join(OUT, 'google'), { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

for (const t of targets) {
  const ctx = await browser.newContext({
    viewport: { width: t.w, height: t.h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.setContent(t.html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(OUT, t.name),
    type: 'jpeg',
    quality: t.q,
  });
  await ctx.close();
  console.log(`  ${t.name.padEnd(26)} ${t.w}x${t.h}`);
}

await browser.close();
server.close();
