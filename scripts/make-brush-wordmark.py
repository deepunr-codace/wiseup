"""Traces the brush "WiseUp" logo into one SVG path per letter.

Input:  a white-on-black PNG/WebP of the logo (default: the original artwork).
Output: public/brand/hero-wiseup-brush.svg   (all letters, shared viewBox, class hero-logo__ch per path)
        public/brand/letters/<letter>.svg    (each letter alone, tight viewBox)
Usage:  pip install potracer scipy pillow numpy && python3 scripts/make-brush-wordmark.py <logo-image>

The logo's letters touch (i|s share a stroke, U|p share a stem), so after labelling connected blobs the
joined ones are split along hand-picked cut lines (in source-image pixels, see CUTS below).
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
import potrace

SRC = sys.argv[1] if len(sys.argv) > 1 else 'logo.png'
S = 4  # trace at 4x the source resolution for smooth curves
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'brand')

im = Image.open(SRC).convert('L')
big = im.resize((im.width * S, im.height * S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(S * 1.0))
mask = np.array(big) > 128
H, W = mask.shape
ys, xs = np.mgrid[0:H, 0:W]
X, Y = xs / S, ys / S  # back to source-image pixels

lab, n = ndi.label(mask)
objs = ndi.find_objects(lab)
sizes = ndi.sum(mask, lab, range(1, n + 1))
blobs = [(i + 1, int(sz), o) for i, (sz, o) in enumerate(zip(sizes, objs)) if sz > 2000 * S * S / 9]

def blob_at(px, py):
    return lab[int(py * S), int(px * S)]

# Seed points (source px) that sit inside each blob.
b_W, b_dot, b_is, b_e, b_Up = blob_at(300, 600), blob_at(580, 300), blob_at(480, 560), blob_at(790, 500), blob_at(1150, 400)
assert len({b_W, b_dot, b_is, b_e, b_Up}) == 5, 'unexpected blob layout'

# i | s: the line x = 583 + 0.053 * (y - 380) separates the i stem from the s.
right_of_is = X > 583 + (Y - 380) * 0.053
# U | p: p = the bowl (x >= 1455) plus the descender below y = 640; the shared stem stays with U.
p_part = (X >= 1455) | (Y >= 640)

masks = {
    'w': lab == b_W,
    'i': (lab == b_dot) | ((lab == b_is) & ~right_of_is),
    's': (lab == b_is) & right_of_is,
    'e': lab == b_e,
    'u': (lab == b_Up) & ~p_part,
    'p': (lab == b_Up) & p_part,
}
# Letters that were cut apart overlap their neighbour by OVERLAP source px, so no seam opens when
# they move independently (the overlap is the same colour, so it is invisible while at rest).
OVERLAP = 12
snap = {k: v.copy() for k, v in masks.items()}
for a, b in (('i', 's'), ('s', 'i'), ('u', 'p'), ('p', 'u')):
    near = ndi.distance_transform_edt(~snap[a]) <= OVERLAP * S
    masks[a] = masks[a] | (snap[b] & near)
# Stray specks near a letter's brush edge join that letter (nearest by x centre).
used = np.zeros_like(mask)
for m in masks.values():
    used |= m
rest, rn = ndi.label(mask & ~used)
centres = {k: np.mean(np.nonzero(m)[1]) / S for k, m in masks.items()}
for r in range(1, rn + 1):
    rm = rest == r
    if rm.sum() < 40:
        continue
    cx = np.mean(np.nonzero(rm)[1]) / S
    masks[min(centres, key=lambda k: abs(centres[k] - cx))] |= rm

def trace(m):
    # potracer inverts boolean input (it traces the False pixels), hence ~m. Crop to the letter's box
    # first: the trace is pure Python and slow on the full canvas.
    yy, xx = np.nonzero(m)
    y0, x0 = yy.min() - 4, xx.min() - 4
    crop = m[y0:yy.max() + 5, x0:xx.max() + 5]
    bmp = potrace.Bitmap(~crop)
    plist = bmp.trace(turdsize=1800, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.15, opticurve=True, opttolerance=0.8)
    f = lambda p: f'{(p.x + x0) / S:.1f} {(p.y + y0) / S:.1f}'
    parts = []
    for curve in plist:
        parts.append(f'M{f(curve.start_point)}')
        for seg in curve.segments:
            if seg.is_corner:
                parts.append(f'L{f(seg.c)}L{f(seg.end_point)}')
            else:
                parts.append(f'C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}')
        parts.append('Z')
    return ''.join(parts)

order = ['w', 'i', 's', 'e', 'u', 'p']
paths = {k: trace(masks[k]) for k in order}
boxes = {}
for k in order:
    yy, xx = np.nonzero(masks[k])
    boxes[k] = (xx.min() / S, yy.min() / S, xx.max() / S, yy.max() / S)

pad = 12
x1 = min(b[0] for b in boxes.values()) - pad; y1 = min(b[1] for b in boxes.values()) - pad
x2 = max(b[2] for b in boxes.values()) + pad; y2 = max(b[3] for b in boxes.values()) + pad
w, h = x2 - x1, y2 - y1

os.makedirs(os.path.join(OUT, 'letters'), exist_ok=True)
body = '\n'.join(f'<path id="hb-{k}" class="hero-logo__ch" data-ch="{k}" d="{paths[k]}"/>' for k in order)
sheen = '\n'.join(f'<use href="#hb-{k}"/>' for k in order)  # same outlines, no duplicated path data
svg = f'''<svg class="hero__logo hero-logo hero-logo--brush" width="{w:.0f}" height="{h:.0f}" viewBox="{x1:.2f} {y1:.2f} {w:.2f} {h:.2f}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="WiseUp">
<title>WiseUp</title>
<defs>
<linearGradient id="hero-logo-sheen" x1="{x1 - w * 0.3:.1f}" y1="0" x2="{x1:.1f}" y2="0" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
</defs>
<g class="hero-logo__chars" fill="#ffffff" fill-rule="nonzero">
{body}
</g>
<g class="hero-logo__sheen" fill="url(#hero-logo-sheen)" aria-hidden="true">
{sheen}
</g>
</svg>
'''
open(os.path.join(OUT, 'hero-wiseup-brush.svg'), 'w').write(svg)
for k in order:
    bx1, by1, bx2, by2 = boxes[k]
    lw, lh = bx2 - bx1 + 2 * pad, by2 - by1 + 2 * pad
    open(os.path.join(OUT, 'letters', f'{k}.svg'), 'w').write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{bx1 - pad:.2f} {by1 - pad:.2f} {lw:.2f} {lh:.2f}" width="{lw:.0f}" height="{lh:.0f}" role="img" aria-label="{k}">'
        f'<path fill="#ffffff" d="{paths[k]}"/></svg>\n')
print({k: len(v) for k, v in paths.items()}, round(w), round(h))
