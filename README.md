# Restoran Suriani Website

A bilingual (Bahasa Melayu / English) website for Restoran Suriani, Pudu,
Kuala Lumpur, with a tap-to-view digital menu built from the restaurant's real
menu boards.

Live at **https://restoransuriani.com** — hosted on Cloudflare Workers static
assets.

- [CLOUDFLARE.md](CLOUDFLARE.md) — domain, DNS, TLS and security setup
- [GOOGLE.md](GOOGLE.md) — Google Business Profile and Search Console

## Layout

The website itself lives in **`public/`**. That directory is what gets
published; everything outside it (this README, `wrangler.jsonc`, `scripts/`,
and `.git/`) is not. Keeping them separate is deliberate — see
[CLOUDFLARE.md](CLOUDFLARE.md#why-the-site-lives-in-public).

```
public/                  ← everything here is served publicly
  index.html             page content
  404.html               not-found page
  styles.css             design system + layout
  script.js              language switch, menu, modal, form, map facade
  menu-data.js           ← every dish, price and description. Edit this.
  menu-icons.js          drawn dish illustrations
  _headers               security headers + caching (parsed by Cloudflare, not served)
  robots.txt  sitemap.xml  favicon.svg  apple-touch-icon.png
  assets/                photos and self-hosted fonts
wrangler.jsonc           Cloudflare deployment config
scripts/                 Cloudflare setup + maintenance scripts
```

## How to update the menu

Open `public/menu-data.js`. Each dish is one entry:

```js
{ code: "SNP01", category: "rice-sets", ms: "Ayam Masak Merah", en: "Chicken Masak Merah",
  descMs: "...", descEn: "...", price: 10.0 },
```

- Change `price` to update it (use `null` plus a `priceNote` if unsure).
- Copy an entry and edit it to add a dish.
- Category tabs are defined at the top in `MENU_CATEGORIES`.

Prices go live within about five minutes of the change being deployed —
`public/_headers` caches JS for 300 seconds precisely so menu edits are not
stuck behind a long cache.

## How to add a real food photo

Drop the file in `public/assets/food/`, then add a `photo` field to that dish:

```js
{ code: "SNP01", ..., photo: "/assets/food/ayam-masak-merah.jpg" },
```

The site swaps the drawn illustration for the photo and removes the
"Illustration only" label for that dish automatically.

**When replacing an existing photo, give it a new filename.** Photos are
cached for 30 days, so overwriting `interior.jpg` in place leaves returning
visitors on the old image.

## Delivery platform links

`public/script.js` has a `DELIVERY` array near the top:

```js
var DELIVERY = [
  { id: "foodpanda", label: "foodpanda", url: "" },
  { id: "grabfood",  label: "GrabFood",  url: "" }
];
```

Paste the store URLs from the foodpanda and GrabFood merchant dashboards and
the buttons appear in the Location section. Left empty, the buttons are simply
not rendered — no broken links. Also add the same URLs to the `sameAs` array
in the JSON-LD block at the bottom of `public/index.html` so Google associates
those listings with the restaurant, then re-run `scripts/csp-hash.py` (below).

## ⚠️ Do not add inline `<script>`, `<style>` or `onclick=`

The Content-Security-Policy in `public/_headers` is strict: `default-src
'none'` with no `'unsafe-inline'` anywhere. That is unusual and worth keeping —
it means an injected script cannot execute even if something else goes wrong.

The cost is that inline code silently fails in the browser. If you add an
inline `<script>` block, an inline `style="..."` attribute, or an `onclick=`
handler, it will be blocked with a console error and no visible symptom.
Put JavaScript in `script.js` and CSS in `styles.css`.

The one exception is the JSON-LD structured-data block in `index.html`, which
is allowed by SHA-256 hash. **If you edit that block, re-run:**

```sh
python3 scripts/csp-hash.py
```

and paste the new hash into the `script-src` directive in `public/_headers`.
Otherwise Google stops seeing the restaurant's structured data.

## Design notes

The visual language is taken from the restaurant's own signboard: maroon
field, gold serif lettering, `RESTORAN` letterspaced above a heavy `SURIANI`
with a hairline gold rule between, and the ogee arch of the mosque motif —
reused to frame the hero photograph and the gallery lead image.

- **Type** — Fraunces (display), Figtree (text), Amiri (the bismillah, subset
  to 16 glyphs). All self-hosted in `public/assets/fonts/`, all SIL Open Font
  Licence, licences included alongside. Self-hosting is also why the CSP needs
  no third-party origin.
- **Colour** — the original palette is unchanged. One addition: `--gold-ink`
  (`#7d5a06`) is the only gold permitted as text on cream. The display gold
  `#e8b923` sits at roughly 1.6:1 against the cream background, well below the
  4.5:1 accessibility minimum, so it is reserved for use on maroon (5.9:1) and
  for rules.
- **No photography-led layout.** The interior photos are honest phone shots of
  a working kopitiam. A design built around large photographic heroes would
  expose them; one built around typography does not need to. The menu carries
  the page instead, set the way a printed menu is set.

## How to preview locally

The page uses absolute paths (`/styles.css`), so it needs a server rather than
opening the file directly:

```sh
cd public && python3 -m http.server 8000
# then open http://localhost:8000
```

Or, with the Cloudflare toolchain, from the repo root:

```sh
npx wrangler dev
```

## How to deploy

Pushing to `main` deploys automatically via Workers Builds. To deploy by hand:

```sh
npx wrangler deploy
```

## Still needs your input

1. **Delivery store URLs** for foodpanda and GrabFood (see above).
2. **A few menu prices could not be read** from the scanned menu boards (faded
   or torn price stickers). These show "Sila tanya / Ask staff" rather than a
   guessed price. Search `menu-data.js` for `priceNote` — they are marked
   `illegible`, `unconfirmed` or `torn`. Fill in `price` and delete the
   `priceNote` line once confirmed.
3. **Food photos.** The four current photos are storefront and interior shots.
   Real dish photos would improve the site more than any other single change.
4. The "Lebih Pilihan / More Favourites" category (25 dishes) comes from a
   separate photo menu board with no printed prices; some may duplicate dishes
   already priced elsewhere under a different name.
5. **Confirm the payment methods** shown in the Location section — a QR
   payment sticker is visible on the counter in `assets/counter.jpg`, but which
   one it is has not been confirmed.

### A note on halal wording

The site describes the kitchen factually as Malay and Muslim-owned. It
deliberately carries **no halal certification badge and does not use the word
"certified"**, because there is no JAKIM certificate. Do not add one unless
and until the restaurant holds a current certificate — an unsubstantiated
halal claim carries real legal exposure in Malaysia under the Trade
Descriptions Act.
