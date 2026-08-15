#!/usr/bin/env python3
"""Regenerate the Restoran Suriani logo files into public/assets/brand/.

The logo is a wordmark: RESTORAN over a gold rule over Suriani, mirroring the
arrangement on the restaurant's signboard. There is no pictorial mark.

It is converted from live text into SVG outlines, so the files carry no font
dependency — a logo that only renders where a webfont happens to be installed
is not a logo. The trade-off is that the name cannot be retyped by editing the
SVG; change it here and regenerate.

Square formats (favicon, WhatsApp avatar, Google Business Profile logo) cannot
hold a wide wordmark, so those use a monogram cut from the wordmark's own S in
the same weight of Fraunces — a crop of the logo rather than a second symbol.

    pip install fonttools brotli
    python3 scripts/make-logo.py

PNG/JPEG exports are a separate step (scripts/make-images.mjs), since they need
a browser to rasterise.
"""
import json, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

ROOT = pathlib.Path(__file__).resolve().parent.parent
FR = ROOT / "public/assets/fonts/fraunces-latin-var-2.woff2"
FG = ROOT / "public/assets/fonts/figtree-latin-var.woff2"

def load(path, **axes):
    return instancer.instantiateVariableFont(TTFont(path), axes, inplace=False)

def run(font, text, size, tracking=0.0):
    """SVG path data for `text`, baseline at y=0, flipped into y-down space."""
    upem = font["head"].unitsPerEm
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    scale, x, parts = size / upem, 0.0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        x += hmtx[g][0] * scale + tracking * size
    return " ".join(parts), (x - tracking * size if text else 0)

def bbox(font, text, size):
    upem = font["head"].unitsPerEm
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    s, x = size / upem, 0.0
    ymin, ymax = 1e9, -1e9
    for ch in text:
        g = cmap[ord(ch)]
        bp = BoundsPen(gs); gs[g].draw(bp)
        if bp.bounds:
            ymin = min(ymin, bp.bounds[1] * s); ymax = max(ymax, bp.bounds[3] * s)
        x += hmtx[g][0] * s
    return ymin, ymax

fraunces, figtree = load(FR, wght=700, opsz=72), load(FG, wght=600)
SUR, SUR_W = run(fraunces, "Suriani", 100)
RES, RES_W = run(figtree, "RESTORAN", 26, tracking=0.42)
_sy0, SUR_ASC = bbox(fraunces, "Suriani", 100)
SUR_DESC = -_sy0
_ry0, RES_ASC = bbox(figtree, "RESTORAN", 26)

MAROON, MAROON_D, GOLD, GOLD_LT = "#7a1120", "#4a0c14", "#e8b923", "#f4d878"

# --- wordmark layout, from measured glyph bounds --------------------------
RES_BASE = round(RES_ASC, 1)
RULE_Y   = round(RES_BASE + 12, 1)
RULE_H   = 2.5
SUR_BASE = round(RULE_Y + RULE_H + 18 + SUR_ASC, 1)
WM_H     = round(SUR_BASE + SUR_DESC, 1)

def wordmark(res_fill, rule_fill, sur_fill):
    return (f'<path d="{RES}" transform="translate(0,{RES_BASE})" fill="{res_fill}"/>\n'
            f'  <rect x="0" y="{RULE_Y}" width="{SUR_W:.1f}" height="{RULE_H}" fill="{rule_fill}"/>\n'
            f'  <path d="{SUR}" transform="translate(0,{SUR_BASE})" fill="{sur_fill}"/>')

def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  {body}\n</svg>\n')

W, H = round(SUR_W), round(WM_H)
TITLE = "Restoran Suriani"

files = {
  # Primary — maroon, for light backgrounds
  "logo.svg":       svg(W, H, wordmark(MAROON, GOLD, MAROON_D), TITLE),
  # For maroon or dark backgrounds (the site header, the signboard)
  "logo-dark.svg":  svg(W, H, wordmark(GOLD_LT, GOLD, GOLD), TITLE),
  # Single ink — stamps, embroidery, receipts, anything one-colour
  "logo-mono.svg":  svg(W, H, wordmark("#2b1810", "#2b1810", "#2b1810"), TITLE),
}

# --- monogram for square formats ------------------------------------------
# Not a new symbol: the S of "Suriani", same font and weight, on a maroon tile.
S_SIZE = 92
S_PATH, _ = run(fraunces, "S", S_SIZE)
_s_lo, _s_hi = bbox(fraunces, "S", S_SIZE)
_bp = BoundsPen(fraunces.getGlyphSet())
fraunces.getGlyphSet()[fraunces.getBestCmap()[ord("S")]].draw(_bp)
_scale = S_SIZE / fraunces["head"].unitsPerEm
S_W = (_bp.bounds[2] - _bp.bounds[0]) * _scale
S_X = round(60 - S_W / 2 - _bp.bounds[0] * _scale, 1)   # centre the inked area
S_Y = round(60 + _s_hi / 2, 1)                          # optical vertical centre

def monogram(tile, ink, rounded=True):
    r = ' rx="24"' if rounded else ''
    return (f'<rect width="120" height="120"{r} fill="{tile}"/>\n'
            f'  <path d="{S_PATH}" transform="translate({S_X},{S_Y})" fill="{ink}"/>')

files["monogram.svg"]      = svg(120, 120, monogram(MAROON_D, GOLD), TITLE)
files["monogram-square.svg"] = svg(120, 120, monogram(MAROON_D, GOLD, rounded=False), TITLE)

out = ROOT / "public/assets/brand"
out.mkdir(parents=True, exist_ok=True)
# The old arch mark and its lockups are retired.
for stale in out.glob("logo-mark*"):
    stale.unlink()
for stale in list(out.glob("logo-horizontal*")) + list(out.glob("logo-stacked*")):
    stale.unlink()

for n, c in files.items():
    (out / n).write_text(c)

print(f"  wordmark {W}x{H}  ·  monogram 120x120")
print(f"  Suriani ascenders top at {SUR_BASE - SUR_ASC:.1f}, rule ends at {RULE_Y + RULE_H} "
      f"-> {SUR_BASE - SUR_ASC - RULE_Y - RULE_H:.1f}px clearance")
for n in files:
    print(f"    {n}")
