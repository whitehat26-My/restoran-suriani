#!/usr/bin/env python3
"""Regenerate the Restoran Suriani logo files into public/assets/brand/.

The wordmark is converted from live text into SVG outlines, so the logo files
carry no font dependency — a logo that only renders where a webfont happens to
be installed is not a logo. The mark is hand-drawn geometry: the ogee arch from
the restaurant's own signboard, holding a bowl and two curls of steam.

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
FR = ROOT / "public/assets/fonts/fraunces-latin-var.woff2"
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

MAROON, MAROON_D, GOLD, GOLD_LT, INK = "#7a1120", "#4a0c14", "#e8b923", "#f4d878", "#2b1810"

# --- mark -----------------------------------------------------------------
# The ogee arch is traced from the mosque motif on the restaurant's own
# signboard. Inside it, a bowl and two curls of steam — masakan panas, which
# is what they actually sell. Bold shapes only, so it holds at favicon size.
ARCH = ("M14,112 L14,64 C14,44 27,36 41,27 C53,19 56,14 60,8 "
        "C64,14 67,19 79,27 C93,36 106,44 106,64 L106,112 Z")
RIM   = "M28,70 h64 a4,4 0 0 1 0,8 h-64 a4,4 0 0 1 0,-8 Z"
BOWL  = "M34,82 L86,82 C86,95 75,103 60,103 C45,103 34,95 34,82 Z"
STEAM = ["M52,62 C52,55 46,53 46,47 C46,42 50,40 50,36",
         "M70,62 C70,55 64,53 64,47 C64,42 68,40 68,36"]
MARK_H = 120

def mark(arch_fill, inner):
    s = "".join(f'\n  <path d="{d}" fill="none" stroke="{inner}" stroke-width="6" '
                f'stroke-linecap="round"/>' for d in STEAM)
    return (f'<path d="{ARCH}" fill="{arch_fill}"/>\n'
            f'  <path d="{RIM}" fill="{inner}"/>\n'
            f'  <path d="{BOWL}" fill="{inner}"/>{s}')

def mark_outline(ink):
    """Single ink: the arch becomes an outline so the whole mark prints in one
    colour — a rubber stamp, embroidery on an apron, a receipt header."""
    s = "".join(f'\n  <path d="{d}" fill="none" stroke="{ink}" stroke-width="6" '
                f'stroke-linecap="round"/>' for d in STEAM)
    return (f'<path d="{ARCH}" fill="none" stroke="{ink}" stroke-width="8" '
            f'stroke-linejoin="round"/>\n'
            f'  <path d="{RIM}" fill="{ink}"/>\n'
            f'  <path d="{BOWL}" fill="{ink}"/>{s}')

# --- wordmark layout, from measured glyph bounds --------------------------
RES_BASE = round(RES_ASC, 1)
RULE_Y   = round(RES_BASE + 12, 1)
RULE_H   = 2.5
SUR_BASE = round(RULE_Y + RULE_H + 18 + SUR_ASC, 1)
WM_H     = round(SUR_BASE + SUR_DESC, 1)

def wordmark(res_fill, rule_fill, sur_fill):
    return (f'<path d="{RES}" transform="translate(0,{RES_BASE})" fill="{res_fill}"/>\n'
            f'    <rect x="0" y="{RULE_Y}" width="{SUR_W:.1f}" height="{RULE_H}" fill="{rule_fill}"/>\n'
            f'    <path d="{SUR}" transform="translate(0,{SUR_BASE})" fill="{sur_fill}"/>')

def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  {body}\n</svg>\n')

GAP    = 34
LOCK_H = round(max(MARK_H, WM_H) + 8)
LOCK_W = round(MARK_H + GAP + SUR_W)
MY     = round((LOCK_H - MARK_H) / 2, 1)   # mark, vertically centred
WY     = round((LOCK_H - WM_H) / 2, 1)     # wordmark, vertically centred

def lockup(arch, inner, res, rule, sur):
    return (f'<g transform="translate(0,{MY})">{mark(arch, inner)}</g>\n'
            f'  <g transform="translate({MARK_H + GAP},{WY})">{wordmark(res, rule, sur)}</g>')

files = {
  "logo-mark.svg":            svg(120, 120, mark(MAROON, GOLD), "Restoran Suriani"),
  "logo-mark-gold.svg":       svg(120, 120, mark(GOLD, MAROON_D), "Restoran Suriani"),
  "logo-mark-mono.svg":       svg(120, 120, mark_outline(INK), "Restoran Suriani"),
  "logo-horizontal.svg":      svg(LOCK_W, LOCK_H, lockup(MAROON, GOLD, MAROON, GOLD, MAROON_D), "Restoran Suriani"),
  "logo-horizontal-dark.svg": svg(LOCK_W, LOCK_H, lockup(GOLD, MAROON_D, GOLD_LT, GOLD, GOLD), "Restoran Suriani"),
}

# stacked
SX = round((SUR_W - MARK_H) / 2, 1)
SGAP = 34
files["logo-stacked.svg"] = svg(
    round(SUR_W), round(MARK_H + SGAP + WM_H),
    f'<g transform="translate({SX},0)">{mark(MAROON, GOLD)}</g>\n'
    f'  <g transform="translate(0,{MARK_H + SGAP})">{wordmark(MAROON, GOLD, MAROON_D)}</g>',
    "Restoran Suriani")

out = ROOT / "public/assets/brand"; out.mkdir(parents=True, exist_ok=True)
for n, c in files.items():
    (out / n).write_text(c)

print(f"  lockup {LOCK_W}x{LOCK_H}  ·  wordmark {SUR_W:.0f}x{WM_H}  ·  mark 120x120")
print(f"  Suriani ascenders top at {SUR_BASE - SUR_ASC:.1f}, rule ends at {RULE_Y + RULE_H} → {SUR_BASE - SUR_ASC - RULE_Y - RULE_H:.1f}px clearance")
for n in files: print(f"    {n}")
