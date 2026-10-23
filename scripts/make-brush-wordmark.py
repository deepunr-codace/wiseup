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

def smooth(m, sigma=4.6 * S, thr=0.5):
    """Round and repair one letter's mask: a Gaussian blur followed by a threshold removes slivers and chips
    thinner than ~sigma (the bristle spikes), closes pin-hole gaps and softens every corner, while the broad
    strokes (100+ px wide) keep their shape. Done on the letter's bounding box only, for speed."""
    yy, xx = np.nonzero(m)
    pad = int(sigma * 3)
    y0, y1 = max(0, yy.min() - pad), min(m.shape[0], yy.max() + pad + 1)
    x0, x1 = max(0, xx.min() - pad), min(m.shape[1], xx.max() + pad + 1)
    out = np.zeros_like(m)
    out[y0:y1, x0:x1] = ndi.gaussian_filter(m[y0:y1, x0:x1].astype(np.float32), sigma) > thr
    # drop any island the smoothing left behind (specks), keeping only the main body of the letter
    lab2, n2 = ndi.label(out)
    if n2 > 1:
        sizes2 = ndi.sum(out, lab2, range(1, n2 + 1))
        out = np.isin(lab2, [i + 1 for i, v in enumerate(sizes2) if v > 0.02 * sizes2.max()])
    return out

def trace(m, sigma=30.0, step=9, min_area=3500):
    """Outline -> smooth cubic Beziers. Each contour is found with OpenCV, its coordinates are low-pass filtered
    along the contour (Gaussian, `sigma` points, ~7 source px of arc), which irons out wobble and bristle bumps
    while keeping the overall brush shape, then every `step`-th point becomes a Catmull-Rom knot, written as
    cubic Beziers: continuous (C1) curves, no corners except where the shape truly turns. Outer contours wind one
    way and holes the other so a plain nonzero fill cuts the counters out."""
    import cv2
    from scipy.ndimage import gaussian_filter1d
    yy, xx = np.nonzero(m)
    y0, x0 = yy.min() - 6, xx.min() - 6
    crop = np.pad(m[y0 + 6 - 6 if False else max(y0, 0):yy.max() + 7, max(x0, 0):xx.max() + 7].astype(np.uint8) * 255, 6)
    y0, x0 = max(y0, 0) - 6, max(x0, 0) - 6
    cs, hier = cv2.findContours(crop, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    f = lambda v: f'{v:.1f}'
    parts = []
    for c, h in zip(cs, hier[0]):
        pts = c[:, 0, :].astype(np.float64)
        if cv2.contourArea(c) < min_area or len(pts) < 40:
            continue
        sm = np.stack([gaussian_filter1d(pts[:, 0], sigma, mode='wrap'), gaussian_filter1d(pts[:, 1], sigma, mode='wrap')], 1)
        # winding: outer (no parent) positive, hole negative
        area = 0.5 * np.sum(sm[:, 0] * np.roll(sm[:, 1], -1) - np.roll(sm[:, 0], -1) * sm[:, 1])
        outer = h[3] < 0
        if (area > 0) != outer:
            sm = sm[::-1]
        k = sm[::step]
        n = len(k)
        if n < 4:
            continue
        P = lambda i: k[i % n]
        parts.append(f'M{f((P(0)[0] + x0) / S)} {f((P(0)[1] + y0) / S)}')
        for i in range(n):  # Catmull-Rom (tension 0.5) -> cubic Bezier from P(i) to P(i+1)
            p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
            c1 = p1 + (p2 - p0) / 6
            c2 = p2 - (p3 - p1) / 6
            parts.append(f'C{f((c1[0] + x0) / S)} {f((c1[1] + y0) / S)} {f((c2[0] + x0) / S)} {f((c2[1] + y0) / S)} {f((p2[0] + x0) / S)} {f((p2[1] + y0) / S)}')
        parts.append('Z')
    return ''.join(parts)

order = ['w', 'i', 's', 'e', 'u', 'p']
masks = {k: smooth(masks[k]) for k in order}
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
