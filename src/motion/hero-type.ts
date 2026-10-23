// Hero heading: the brush logo (scripts/make-brush-wordmark.py), one <path> per letter, as pure white,
// lit 3D letters on the dark hero.
//
//  - 3D: every letter is extruded by stacking depth layers (<use> copies of the glyph, stepped along
//    a direction and shaded from mid grey near the face to near-black at the back). The face on top is
//    pure white. Nothing is duplicated as path data, the layers all reference the original glyph.
//  - Light: the pointer is the light source. Each letter's depth swings away from the cursor, so the
//    letters appear to turn in 3D as it moves; with no pointer the depth rests down and to the right.
//  - Hover: letters shift slightly (springs), the hovered one lifts a little further.
//  - Colour: on hover, the letter (with its joined partner) turns a flowing orange-yellow gradient, fading
//    back to pure white when the cursor leaves.
//  - Entrance: each letter is painted on by a diagonal wipe that follows the brush slant.
//
// Each letter is its own <svg> (a depth svg and a face svg, same viewBox, stacked: all depths first, then
// all faces, so a neighbour's depth never cuts across a face). The logo's i|s and U|p were cut from shared
// strokes, so each pair shares one spring; a seam would open if they moved independently. All motion runs from one
// gsap.ticker callback that sleeps while the hero is off screen; reduced motion keeps the static 3D.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, isTouch, prefersReducedMotion } from '../engine';

const NS = 'http://www.w3.org/2000/svg';
// Hover colour: a warm orange-yellow flow.
const PAL = ['#ff7a00', '#ff9d00', '#ffc400', '#ffd84a', '#ffc400', '#ff9d00'];

const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `#${hex(a[0] + (b[0] - a[0]) * t)}${hex(a[1] + (b[1] - a[1]) * t)}${hex(a[2] + (b[2] - a[2]) * t)}`;

const PARTNER: Record<string, string> = { i: 's', s: 'i', u: 'p', p: 'u' };
const DEPTH = 42;          // number of stacked layers
const STEP = 0.6;          // svg units between layers
// Sides are never light grey (no white haze): a soft teal rim picked up from the stage right behind the face,
// falling off to near-black at the back (ambient occlusion), so the pure white face stays crisp against them.
const NEAR: [number, number, number] = [86, 140, 146];
const MID: [number, number, number] = [30, 58, 64];
const FAR: [number, number, number] = [5, 10, 13];
const sideColor = (t: number) => (t < 0.3 ? mix(NEAR, MID, t / 0.3) : mix(MID, FAR, (t - 0.3) / 0.7));

type Unit = {
  els: SVGPathElement[];        // glyph paths in this unit
  letters: string[];            // their letter keys
  boxes: SVGSVGElement[];       // the depth + face svgs of those letters (what gets transformed)
  cx: number; cy: number;
  idle: { r: number; y: number; f: number; p: number };
  spread: { x: number; y: number; r: number };
  hover: boolean;
  x: number; y: number; r: number;
  vx: number; vy: number; vr: number;
  dx: number; dy: number;       // current depth direction (unit vector)
  color: number;                // 0..1 colour-gradient strength
};

export function heroType() {
  onPage(({ intro }) => {
    const wrap = document.querySelector<HTMLElement>('[data-wordmark]');
    const svg = wrap?.querySelector<SVGSVGElement>('svg');
    const group = wrap?.querySelector<SVGGElement>('.hero-logo__chars');
    if (!wrap || !svg || !group) return;
    const letters = Array.from(group.querySelectorAll<SVGPathElement>('.hero-logo__ch'));
    if (!letters.length) return;
    const reduced = prefersReducedMotion();
    const fine = !isTouch();
    const vb = svg.viewBox.baseVal;
    const defs = svg.querySelector('defs') ?? svg.insertBefore(svgEl('defs'), svg.firstChild);
    svg.querySelector('.hero-logo__sheen')?.remove(); // the old light-sweep copy is not used by the 3D build

    // ---- Hover colour: a faint swatch gradient that flows through the letters ------------------------
    const flow = svgEl('linearGradient', { id: 'hero-color-flow', gradientUnits: 'userSpaceOnUse', spreadMethod: 'repeat', x1: vb.x, y1: vb.y + vb.height, x2: vb.x + vb.width * 0.5, y2: vb.y });
    [...PAL, PAL[0]].forEach((c, i) => flow.appendChild(svgEl('stop', { offset: i / PAL.length, 'stop-color': c })));
    defs.appendChild(flow);
    // Bevel: the glyph's alpha, blurred, is used as a height map for a distant light from the upper left, so the
    // edge of every face is softly rounded: lit edges stay pure white, edges turned away from the light fall to
    // a gentle grey. The flat interior is lit to exactly 1.0 (pure white). Clipped back to the glyph afterwards.
    defs.insertAdjacentHTML('beforeend', `
      <filter id="hero-bevel" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="h"/>
        <feDiffuseLighting in="h" surfaceScale="6" diffuseConstant="1.17" lighting-color="#ffffff" result="d"><feDistantLight azimuth="232" elevation="62"/></feDiffuseLighting>
        <feComposite in="d" in2="SourceAlpha" operator="in"/>
      </filter>
      <filter id="hero-bevel-color" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="h"/>
        <feDiffuseLighting in="h" surfaceScale="6" diffuseConstant="1.17" lighting-color="#ffffff" result="d"><feDistantLight azimuth="232" elevation="62"/></feDiffuseLighting>
        <feComposite in="d" in2="SourceAlpha" operator="in" result="lit"/>
        <feBlend in="SourceGraphic" in2="lit" mode="multiply"/>
      </filter>
      <filter id="hero-shadow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="10"/></filter>`);
    const flowPos = { x: 0 };
    const flowTween = gsap.to(flowPos, { x: vb.width * 0.5, duration: 4, ease: 'none', repeat: -1, paused: true, onUpdate: () => flow.setAttribute('gradientTransform', `translate(${flowPos.x} 0)`) });

    // ---- Build the 3D letters --------------------------------------------------------------------------
    // Every letter is its own <svg> (same viewBox, stacked), in two layers: all the depth svgs first, then
    // all the white face svgs. Faces therefore always sit above every letter's depth, so a neighbour's
    // extrusion can never cut across a face (that was the dark line at the U|p join).
    // The original inline svg stays in the DOM as the source of the glyph outlines (and the accessible name).
    const R = vb.width * 0.3;
    const specs = [
      { l: ['w'], idle: { r: 0.3, y: 2.2, f: 0.55, p: 0 }, spread: { x: -110, y: 0, r: -5 } },
      { l: ['i', 's'], idle: { r: 0.35, y: 2.6, f: 0.45, p: 1.3 }, spread: { x: -40, y: -26, r: -2 } },
      { l: ['e'], idle: { r: 0.3, y: 2.8, f: 0.65, p: 2.4 }, spread: { x: 40, y: 18, r: 3 } },
      { l: ['u', 'p'], idle: { r: 0.3, y: 2.4, f: 0.5, p: 3.7 }, spread: { x: 110, y: -10, r: 5 } },
    ];
    // The i|s and U|p were cut from shared strokes, so those pairs share one spring (they move together,
    // each still its own svg), which keeps the join closed.
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', 'WiseUp');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('hero-logo--src');
    const stack = document.createElement('div');
    stack.className = 'hero-letters';
    stack.style.aspectRatio = `${vb.width} / ${vb.height}`;
    wrap.appendChild(stack);
    const mkSvg = (cls: string) => {
      const e = svgEl('svg', { class: `hero-l ${cls}`, viewBox: `${vb.x} ${vb.y} ${vb.width} ${vb.height}`, 'aria-hidden': 'true', focusable: 'false' }) as SVGSVGElement;
      stack.appendChild(e);
      return e;
    };
    const byCh = (ch: string) => letters.find((l) => l.dataset.ch === ch)!;
    const depthSvgs: Record<string, SVGSVGElement> = {};
    const faceSvgs: Record<string, SVGSVGElement> = {};
    const tints: Record<string, SVGElement> = {};
    const layersOf: Record<string, SVGUseElement[]> = {};
    const shadows: Record<string, SVGUseElement> = {};
    letters.forEach((el) => { depthSvgs[el.dataset.ch!] = mkSvg('hero-l--depth'); });
    letters.forEach((el) => { faceSvgs[el.dataset.ch!] = mkSvg('hero-l--face'); });
    letters.forEach((el) => {
      const ch = el.dataset.ch!;
      const ls: SVGUseElement[] = [];
      // soft contact shadow under the whole extrusion (ambient occlusion on the stage)
      const shadow = svgEl('use', { href: `#${el.id}`, fill: '#010608', opacity: 0.55, filter: 'url(#hero-shadow)' }) as SVGUseElement;
      depthSvgs[ch].appendChild(shadow);
      shadows[ch] = shadow;
      for (let i = DEPTH; i >= 1; i--) {
        const u = svgEl('use', { href: `#${el.id}`, fill: sideColor((i - 1) / (DEPTH - 1)) }) as SVGUseElement;
        depthSvgs[ch].appendChild(u);
        ls[i] = u;
      }
      layersOf[ch] = ls;
      // The face is the bevelled union of this letter and its joined partner (i|s, U|p), clipped to this letter.
      // Bevelling the pair as one shape means no bevel edge can appear along the cut between them.
      const partner = PARTNER[ch] ? byCh(PARTNER[ch]) : null;
      const clip = svgEl('clipPath', { id: `hero-fc-${ch}` });
      clip.appendChild(svgEl('use', { href: `#${el.id}` }));
      // Kept in this (visible) face svg: a clipPath under the hidden source svg would inherit visibility:hidden
      // and clip everything away.
      const fdefs = svgEl('defs');
      fdefs.appendChild(clip);
      faceSvgs[ch].appendChild(fdefs);
      const faceG = svgEl('g', { 'clip-path': partner ? `url(#hero-fc-${ch})` : '' });
      if (!partner) faceG.removeAttribute('clip-path');
      const bev = svgEl('g', { filter: 'url(#hero-bevel)' });
      bev.appendChild(svgEl('use', { href: `#${el.id}`, fill: '#ffffff', 'data-ch': ch }));
      if (partner) bev.appendChild(svgEl('use', { href: `#${partner.id}`, fill: '#ffffff', 'pointer-events': 'none' }));
      faceG.appendChild(bev);
      faceSvgs[ch].appendChild(faceG);
      // The hover colour is built exactly like the face (bevelled pair union, clipped to this letter), so the
      // orange-yellow keeps the rounded bevel and shows no seam at the i|s and U|p joins.
      const tintG = svgEl('g', { opacity: 0, 'pointer-events': 'none' });
      const tintClip = svgEl('g', { 'clip-path': partner ? `url(#hero-fc-${ch})` : '' });
      if (!partner) tintClip.removeAttribute('clip-path');
      const tbev = svgEl('g', { filter: 'url(#hero-bevel-color)' });
      tbev.appendChild(svgEl('use', { href: `#${el.id}`, fill: 'url(#hero-color-flow)' }));
      if (partner) tbev.appendChild(svgEl('use', { href: `#${partner.id}`, fill: 'url(#hero-color-flow)' }));
      tintClip.appendChild(tbev);
      tintG.appendChild(tintClip);
      tints[ch] = faceSvgs[ch].appendChild(tintG);
    });
    const unitPx = () => stack.clientWidth / vb.width; // svg units -> css px
    const units: Unit[] = specs.map((d) => {
      const els = d.l.map(byCh);
      const bb = els.map((e) => e.getBBox());
      const x1 = Math.min(...bb.map((b) => b.x)), x2 = Math.max(...bb.map((b) => b.x + b.width));
      const y1 = Math.min(...bb.map((b) => b.y)), y2 = Math.max(...bb.map((b) => b.y + b.height));
      const boxes = d.l.flatMap((c) => [depthSvgs[c], faceSvgs[c]]);
      // pivot: bottom centre of the unit, as a percentage of the (whole-word) svg box
      const origin = `${(((x1 + x2) / 2 - vb.x) / vb.width) * 100}% ${((y2 - vb.y) / vb.height) * 100}%`;
      gsap.set(boxes, { transformOrigin: origin });
      return {
        els, letters: d.l, boxes, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, idle: d.idle, spread: d.spread, hover: false,
        x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, dx: 0.62, dy: 0.78, color: 0,
      };
    });
    const setDepth = (u: Unit) => {
      u.letters.forEach((c) => {
        const ls = layersOf[c];
        for (let i = 1; i <= DEPTH; i++) ls[i].setAttribute('transform', `translate(${(u.dx * STEP * i).toFixed(2)} ${(u.dy * STEP * i).toFixed(2)})`);
        const k = DEPTH + 6; // the shadow lands a little beyond the back of the extrusion
        shadows[c].setAttribute('transform', `translate(${(u.dx * STEP * k).toFixed(2)} ${(u.dy * STEP * k).toFixed(2)})`);
      });
    };
    units.forEach(setDepth);
    const unitOfCh = (ch: string) => units.find((u) => u.letters.includes(ch))!;
    const allBoxes = units.flatMap((u) => u.boxes);

    // ---- Entrance: one brush-slant wipe across the whole word ------------------------------------------
    gsap.set(wrap, { visibility: 'visible' });
    let ready = reduced;
    const tl = gsap.timeline({ paused: true, onComplete: () => { ready = true; } });
    if (!reduced) {
      tl.fromTo(allBoxes,
        { clipPath: 'polygon(-30% -30%, -30% -30%, -50% 130%, -50% 130%)', autoAlpha: 0.001 },
        { clipPath: 'polygon(-30% -30%, 140% -30%, 120% 130%, -50% 130%)', autoAlpha: 1, duration: 1.7, ease: 'power2.inOut', clearProps: 'clipPath' }, 0);
      intro.add(() => tl.play(), 0);
    }
    if (reduced) return () => {};

    // ---- Pointer = the light --------------------------------------------------------------------------
    const pt = svg.createSVGPoint();
    const toSvg = (cx: number, cy: number) => {
      pt.x = cx; pt.y = cy;
      const m = faceSvgs.w.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: -9999, y: -9999 };
    };
    let active = false;
    let tx = -9999, ty = -9999, sx = -9999, sy = -9999;
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const pad = 90;
      const inside = e.clientX > r.left - pad && e.clientX < r.right + pad && e.clientY > r.top - pad && e.clientY < r.bottom + pad;
      if (inside) {
        const p = toSvg(e.clientX, e.clientY);
        if (!active || sx < -9000) { sx = p.x; sy = p.y; }
        tx = p.x; ty = p.y;
      }
      active = inside;
    };
    if (fine) {
      addEventListener('pointermove', onMove, { passive: true });
      letters.forEach((el) => {
        const ch = el.dataset.ch!;
        const face = faceSvgs[ch].querySelector<SVGElement>('use[data-ch]')!;
        face.style.cursor = 'pointer';
        face.addEventListener('pointerenter', () => { unitOfCh(ch).hover = true; });
        face.addEventListener('pointerleave', () => { unitOfCh(ch).hover = false; });
      });
    }

    // ---- The one ticker ---------------------------------------------------------------------------------
    let t = 0, scrollP = 0, flowOn = false;
    const K = 60, C = 10;
    const tick = () => {
      const dt = Math.min(gsap.ticker.deltaRatio(60) / 60, 1 / 30);
      t += dt;
      if (active) { const k = 1 - Math.exp(-dt * 14); sx += (tx - sx) * k; sy += (ty - sy) * k; }
      scrollP += (clamp(scrollY / (innerHeight * 0.7), 0, 1) - scrollP) * (1 - Math.exp(-dt * 8));
      let anyColor = false;

      units.forEach((u) => {
        const dx = u.cx - sx, dy = u.cy - sy, d = Math.hypot(dx, dy) || 1;
        const fall = active ? Math.exp(-((d / R) ** 2)) : 0;
        // slight shift: letters ease a touch toward the cursor, and the hovered one lifts
        const px = active ? clamp((sx - u.cx) / R, -1, 1) * fall * 9 : 0;
        const py = active ? clamp((sy - u.cy) / R, -1, 1) * fall * 7 : 0;
        const tX = px + u.spread.x * scrollP;
        const tY = Math.sin(t * u.idle.f * 1.3 + u.idle.p) * u.idle.y + Math.sin(t * 9 + u.idle.p * 5) * 0.35 + py - (u.hover ? 9 : 0) + u.spread.y * scrollP;
        const tR = Math.sin(t * u.idle.f + u.idle.p) * u.idle.r + Math.sin(t * 7.3 + u.idle.p * 3) * 0.05 + (active ? clamp((sx - u.cx) / R, -1, 1) * fall * 1.6 : 0) + u.spread.r * scrollP;
        u.vx += ((tX - u.x) * K - u.vx * C) * dt;
        u.vy += ((tY - u.y) * K - u.vy * C) * dt;
        u.vr += ((tR - u.r) * K - u.vr * C) * dt;
        u.x = clamp(u.x + u.vx * dt, -150, 150); u.y = clamp(u.y + u.vy * dt, -60, 60); u.r = clamp(u.r + u.vr * dt, -10, 10);
        const k = unitPx();
        gsap.set(u.boxes, { x: u.x * k, y: u.y * k, rotation: u.r });

        // light direction: the depth points away from the cursor (resting: down-right)
        let ldx = 0.62, ldy = 0.78;
        if (active) {
          const nx = dx / d, ny = dy / d;
          const w = 0.35 + 0.65 * Math.exp(-((d / (R * 2)) ** 2));
          ldx = 0.62 * (1 - w) + nx * w; ldy = 0.78 * (1 - w) + ny * w;
          const l = Math.hypot(ldx, ldy) || 1; ldx /= l; ldy /= l;
        }
        const k2 = 1 - Math.exp(-dt * 9);
        const ndx = u.dx + (ldx - u.dx) * k2, ndy = u.dy + (ldy - u.dy) * k2;
        if (Math.abs(ndx - u.dx) + Math.abs(ndy - u.dy) > 0.0008) { u.dx = ndx; u.dy = ndy; setDepth(u); }

        // faint colour: strongest on the hovered letter, a little on its neighbours
        const wantC = u.hover ? 1 : 0; // the hovered letter (with its joined partner) turns orange-yellow
        u.color += (wantC - u.color) * (1 - Math.exp(-dt * 9));
        const o = u.color < 0.01 ? 0 : u.color;
        u.letters.forEach((c) => tints[c].setAttribute('opacity', o.toFixed(3)));
        if (o > 0) anyColor = true;
      });

      if (anyColor !== flowOn) { flowOn = anyColor; if (flowOn) flowTween.play(); else flowTween.pause(); }
    };

    const st = ScrollTrigger.create({
      trigger: wrap, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { if (s.isActive) gsap.ticker.add(tick); else { gsap.ticker.remove(tick); flowTween.pause(); flowOn = false; } },
    });

    return () => {
      st.kill(); tl.kill(); flowTween.kill();
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      stack.remove();
    };
  });
}
