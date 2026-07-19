# Restoran Suriani Website

A bilingual (Bahasa Melayu / English) website for Restoran Suriani, with a
tap-to-view digital menu built from the restaurant's real menu boards.

## What's here

- `index.html` — all page content (hero, about, menu, catering, gallery, location, contact)
- `styles.css` — colors and layout, matching the restaurant's maroon-and-gold signboard
- `script.js` — the EN/BM language switch, the menu tabs/card/popup logic, and the
  catering enquiry form (there's no backend, so submitting the form opens
  WhatsApp with the details pre-filled — the customer still has to press send).
  The WhatsApp number it uses is set in the `CATERING_WHATSAPP` constant near
  the bottom of `script.js`, currently the same number as the order button.
- `menu-data.js` — every menu item (name, description, price). **Edit this
  file to add, remove, or correct dishes** — the site re-renders automatically.
- `menu-icons.js` — small drawn icons used as menu pictures (not real photos —
  the site clearly labels them "Illustration only"). Each dish is auto-matched
  to the closest icon by `pickMenuIcon()` in `script.js`. To use a real food
  photo instead, add a `photo: "assets/food/<dish>.jpg"` field to that dish in
  `menu-data.js` — the site automatically shows the photo and drops the
  "Illustration only" label for that item. No script.js changes needed.
- `assets/` — `storefront.jpg` and `interior.jpg` are real photos; put more here (see `assets/README.txt`)

## Still needs your input

1. **5 menu prices couldn't be read reliably** from the scanned menu photos
   (faded handwriting or a torn price sticker). On the live site these show
   "Sila tanya / Ask staff" instead of a price. Open `menu-data.js` and
   search for `priceNote` to find them — they're marked `illegible`,
   `unconfirmed`, or `torn`. Once you confirm the real price with the
   restaurant, just fill in the `price` field and delete the `priceNote` line.
2. **Food photos** for the gallery — the 4 current photos are storefront/interior
   shots; add real food photos when you have them (see `assets/README.txt`).
3. The "Lebih Pilihan / More Favourites" category (25 dishes) comes from a
   separate photo menu board that had no prices printed at all — some of
   these may be the same dishes as items already priced elsewhere under a
   different name. Worth a quick check with the restaurant if you want to
   merge duplicates or add confirmed prices.

## How to update the menu

Open `menu-data.js`. Each dish is one line like:

```js
{ code: "SNP01", category: "rice-sets", ms: "Ayam Masak Merah", en: "Chicken Masak Merah",
  descMs: "...", descEn: "...", price: 10.0 },
```

- Change `price` to update it (use `null` and add a `priceNote` if unsure).
- Copy a line and edit it to add a new dish.
- Categories (tabs) are defined at the top in `MENU_CATEGORIES`.

## How to add the Google Maps embed

Already done — the map on the Location section is a live embed of
28, Lorong 1/77a, Pudu, 55100 Kuala Lumpur. If the address ever changes,
open Google Maps, search the new address, click **Share → Embed a map**,
and swap the `<iframe src="...">` inside `<div class="map-placeholder">`
in `index.html`.

## How to preview locally

Just open `index.html` in a web browser — no installation needed.

## How to publish with GitHub Pages

1. Create a new repository on GitHub (e.g. `restoran-suriani`).
2. From this folder, run:
   ```
   git init
   git add .
   git commit -m "Initial website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/restoran-suriani.git
   git push -u origin main
   ```
3. On GitHub, go to the repo's **Settings → Pages**, set the source to the
   `main` branch and `/ (root)` folder, then save.
4. The site will be live in a minute or two at
   `https://<your-username>.github.io/restoran-suriani/`.
