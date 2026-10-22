// Hero heading: the brush logo (scripts/make-brush-wordmark.py), one <path> per letter, made interactive.
//
//  - Entrance: each letter is painted on by a diagonal wipe that follows the brush slant.
//  - Colour: a band through every palette swatch flows over the white letters; it speeds up with the pointer.
//  - Flashlight: a radial glow through the same palette follows the pointer and lights the letters beneath it.
//  - Jelly physics: letters are springs. Sweeping the pointer shoves them (velocity coupling) and they
//    wobble back; they also lean toward the pointer and lift as it gets close.
//  - Liquid: an feTurbulence/feDisplacementMap filter ripples the whole word in proportion to pointer speed.
//  - Click: a shockwave ring and colour sparks burst from the click point and kick the nearby letters.
//  - Scroll: the letters drift apart as the hero scrolls away.
//  - A small ring cursor grows over the letters (fine pointers only).
//
// The logo's i|s and U|p were cut from shared strokes, so each pair moves as one rigid unit around a
// shared pivot (svgOrigin); a seam would open if they moved independently. All motion runs from one
// gsap.ticker callback that sleeps while the hero is off screen, and is skipped for reduced motion.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, isTouch, prefersReducedMotion } from '../engine';

const NS = 'http://www.w3.org/2000/svg';
// Palette sampled from the brand swatch strip (teal > green > near-black); every swatch is used.
const PAL = ['#02657a', '#03728c', '#148797', '#278e8b', '#2f857a', '#235d49', '#15270c'];
// The same swatches as a dark-top / light-bottom pair, as they appear in the strip.
const PAL_TOP = ['#023642', '#015163', '#045b6c', '#104c50', '#184640', '#12322f', '#020501'];
// Lifted tints of each swatch for the tiny balls and highlights, so they read on black.
const lift = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
// Sparks use the lighter swatches (plus white) so they read on black.
const BURST = ['#ffffff', PAL[2], PAL[3], PAL[4], PAL[1], '#ffffff', PAL[2]];
const GLOW: Record<string, string> = { w: PAL[2], i: PAL[3], s: PAL[4], e: PAL[1], u: PAL[5], p: PAL[0] };

const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Unit = {
  letters: string[];
  els: SVGPathElement[];
  cx: number; cy: number;
  idle: { r: number; y: number; f: number; p: number };
  spread: { x: number; y: number; r: number };
  hover: boolean;
  x: number; y: number; r: number; s: number;
  vx: number; vy: number; vr: number; vs: number;
};

export function heroType() {
  onPage(({ intro }) => {
    const wrap = document.querySelector<HTMLElement>('[data-wordmark]');
    const svg = wrap?.querySelector<SVGSVGElement>('svg');
    const group = wrap?.querySelector<SVGGElement>('.hero-logo__chars');
    if (!wrap || !svg || !group || prefersReducedMotion()) return;
    const letters = Array.from(group.querySelectorAll<SVGPathElement>('.hero-logo__ch'));
    if (!letters.length) return;
    gsap.set(wrap, { visibility: 'visible' });
    const vb = svg.viewBox.baseVal;
    const fine = !isTouch();
    const defs = svg.querySelector('defs') ?? svg.insertBefore(svgEl('defs'), svg.firstChild);

    // ---- Colour: the letters are filled with the swatch strip itself (each swatch dark > light, as in the
    // reference), flowing diagonally through the word so every letter keeps changing colour.
    const flow = svgEl('linearGradient', { id: 'hero-brush-flow', gradientUnits: 'userSpaceOnUse', spreadMethod: 'repeat', x1: vb.x, y1: vb.y + vb.height, x2: vb.x + vb.width * 0.55, y2: vb.y });
    PAL.forEach((c, i) => {
      flow.appendChild(svgEl('stop', { offset: i / PAL.length, 'stop-color': PAL_TOP[i] }));
      flow.appendChild(svgEl('stop', { offset: (i + 0.55) / PAL.length, 'stop-color': lift(c, 0.12) }));
    });
    flow.appendChild(svgEl('stop', { offset: 1, 'stop-color': PAL_TOP[0] }));
    defs.appendChild(flow);
    group.setAttribute('fill', 'url(#hero-brush-flow)');
    const flowPos = { x: 0 };
    const flowTween = gsap.to(flowPos, { x: vb.width * 0.55, duration: 9, ease: 'none', repeat: -1, onUpdate: () => flow.setAttribute('gradientTransform', `translate(${flowPos.x} 0)`) });

    // ---- Flashlight: a duplicate of the letters filled with a radial colour that follows the pointer
    const R = vb.width * 0.3;
    const spot = svgEl('radialGradient', { id: 'hero-brush-spot', gradientUnits: 'userSpaceOnUse', cx: -9999, cy: -9999, r: R * 0.8 });
    [[0, '#ffffff', 1], [0.1, lift(PAL[2], 0.55), 1], [0.25, lift(PAL[3], 0.3), 1], [0.4, lift(PAL[4], 0.1), 1], [0.55, PAL[1], 0.95], [0.7, PAL[0], 0.9], [0.85, PAL[5], 0.7], [1, PAL[6], 0]].forEach(([o, c, a]) =>
      spot.appendChild(svgEl('stop', { offset: o, 'stop-color': c, 'stop-opacity': a })));
    defs.appendChild(spot);

    // ---- Liquid distortion filter -------------------------------------------------------------
    const filt = svgEl('filter', { id: 'hero-liquid', x: '-8%', y: '-8%', width: '116%', height: '116%', 'color-interpolation-filters': 'sRGB' });
    const turb = svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.006 0.012', numOctaves: 2, seed: 4, result: 'n' });
    const disp = svgEl('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G' });
    filt.append(turb, disp);
    defs.appendChild(filt);

    // Wrapper (carries the liquid filter) holding the original letters and the flashlight copy.
    const liquid = svgEl('g', { class: 'hero-logo__liquid' });
    group.parentNode!.insertBefore(liquid, group);
    liquid.appendChild(group);
    const overlay = group.cloneNode(true) as SVGGElement;
    overlay.removeAttribute('class');
    overlay.setAttribute('fill', 'url(#hero-brush-spot)');
    overlay.setAttribute('pointer-events', 'none');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    // ---- Smoke and tiny colour balls living inside each letter -------------------------------------
    // Clipped to the glyph through <use> (follows the letter's live transform); blobs are blurred and
    // drift on yoyo tweens, the balls are small lifted-swatch dots that wander and twinkle.
    const smoke = svgEl('g', { 'aria-hidden': 'true', 'pointer-events': 'none' });
    const blur = svgEl('filter', { id: 'hero-smoke-blur', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    blur.appendChild(svgEl('feGaussianBlur', { stdDeviation: 16 }));
    defs.appendChild(blur);
    const rand = gsap.utils.random;
    const drift: SVGElement[] = [];
    letters.forEach((el, li) => {
      const bb = el.getBBox();
      const clip = svgEl('clipPath', { id: `hero-clip-${el.dataset.ch}` });
      clip.appendChild(svgEl('use', { href: `#${el.id}`, 'clip-rule': 'nonzero' }));
      defs.appendChild(clip);
      const g = svgEl('g', { 'clip-path': `url(#hero-clip-${el.dataset.ch})` });
      const blobs = svgEl('g', { filter: 'url(#hero-smoke-blur)' });
      for (let k = 0; k < 6; k++) {
        const c = PAL[(li + k) % PAL.length];
        const b = svgEl('circle', { cx: rand(bb.x, bb.x + bb.width), cy: rand(bb.y, bb.y + bb.height), r: rand(0.22, 0.4) * Math.min(bb.width, bb.height) + 30, fill: lift(c, k % 2 ? 0.25 : 0.05), opacity: rand(0.55, 0.9) });
        blobs.appendChild(b);
        gsap.to(b, { attr: { cx: `+=${rand(-0.4, 0.4) * bb.width}`, cy: `+=${rand(-0.35, 0.35) * bb.height}`, r: `*=${rand(0.8, 1.3)}` }, duration: rand(4, 8), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -rand(0, 6) });
        drift.push(b);
      }
      g.appendChild(blobs);
      for (let k = 0; k < 14; k++) {
        const c = k % 5 === 0 ? '#ffffff' : lift(PAL[(li + k) % 6], 0.55);
        const d = svgEl('circle', { cx: rand(bb.x, bb.x + bb.width), cy: rand(bb.y, bb.y + bb.height), r: rand(2.2, 6), fill: c, opacity: rand(0.5, 1) });
        g.appendChild(d);
        gsap.to(d, { attr: { cx: `+=${rand(-70, 70)}`, cy: `+=${rand(-90, 90)}` }, duration: rand(3, 7), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -rand(0, 6) });
        gsap.to(d, { opacity: rand(0.1, 0.4), duration: rand(0.8, 2), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -rand(0, 2) });
      }
      smoke.appendChild(g);
    });
    liquid.appendChild(smoke);
    liquid.appendChild(overlay);
    gsap.set(overlay, { opacity: 0 });
    const overlayLetters = Array.from(overlay.querySelectorAll<SVGPathElement>('path'));
    const burstLayer = svgEl('g', { 'pointer-events': 'none' });
    svg.appendChild(burstLayer);

    // ---- Springy units --------------------------------------------------------------------------
    const pick = (list: SVGPathElement[], ch: string) => list.find((l) => l.dataset.ch === ch)!;
    const specs = [
      { l: ['w'], idle: { r: 1.4, y: 6, f: 0.9, p: 0 }, spread: { x: -110, y: 0, r: -5 } },
      { l: ['i', 's'], idle: { r: 1.8, y: 9, f: 0.75, p: 1.3 }, spread: { x: -40, y: -26, r: -2 } },
      { l: ['e'], idle: { r: 1.2, y: 12, f: 1.1, p: 2.4 }, spread: { x: 40, y: 18, r: 3 } },
      { l: ['u', 'p'], idle: { r: 1.2, y: 9, f: 0.7, p: 3.7 }, spread: { x: 110, y: -10, r: 5 } },
    ];
    const units: Unit[] = specs.map((d) => {
      const els = d.l.map((c) => pick(letters, c));
      const bb = els.map((e) => e.getBBox());
      const x1 = Math.min(...bb.map((b) => b.x)), x2 = Math.max(...bb.map((b) => b.x + b.width));
      const y1 = Math.min(...bb.map((b) => b.y)), y2 = Math.max(...bb.map((b) => b.y + b.height));
      return { letters: d.l, els, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, idle: d.idle, spread: d.spread, hover: false, x: 0, y: 0, r: 0, s: 1, vx: 0, vy: 0, vr: 0, vs: 0, _pivot: `${(x1 + x2) / 2} ${y2}`, _all: [] as SVGPathElement[] } as Unit & { _pivot: string; _all: SVGPathElement[] };
    });
    units.forEach((u) => {
      const uu = u as Unit & { _pivot: string; _all: SVGPathElement[] };
      uu._all = [...u.els, ...u.letters.map((c) => pick(overlayLetters, c))];
      gsap.set(uu._all, { svgOrigin: uu._pivot });
    });
    const unitOf = (el: SVGPathElement) => units.find((u) => u.els.includes(el))!;

    // ---- Entrance --------------------------------------------------------------------------------
    let ready = false;
    const tl = gsap.timeline({ paused: true, onComplete: () => { ready = true; } });
    tl.fromTo(letters,
      { clipPath: 'polygon(0% 0%, 0% 0%, -30% 100%, -30% 100%)', autoAlpha: 0 },
      { clipPath: 'polygon(0% 0%, 160% 0%, 130% 100%, -30% 100%)', autoAlpha: 1, duration: 1.2, stagger: 0.16, ease: 'power2.out', clearProps: 'clipPath' }, 0);
    intro.add(() => tl.play(), 0);

    // ---- Pointer ----------------------------------------------------------------------------------
    const pt = svg.createSVGPoint();
    const toSvg = (cx: number, cy: number) => {
      pt.x = cx; pt.y = cy;
      const m = svg.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: -9999, y: -9999 };
    };
    let active = false;
    let tx = -9999, ty = -9999;            // pointer target (svg units)
    let sx = -9999, sy = -9999;            // smoothed pointer
    let spotX = -9999, spotY = -9999;      // flashlight centre (slower follow)
    let pvx = 0, pvy = 0;                  // smoothed pointer velocity (svg units / s)
    let cursor: HTMLElement | null = null;
    let moveCursor: ((x: number, y: number) => void) | null = null;

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const pad = 90;
      const inside = e.clientX > r.left - pad && e.clientX < r.right + pad && e.clientY > r.top - pad && e.clientY < r.bottom + pad;
      if (inside && !active) { sx = tx; sy = ty; spotX = tx; spotY = ty; }
      active = inside;
      if (inside) {
        const p = toSvg(e.clientX, e.clientY);
        if (sx < -9000) { sx = p.x; sy = p.y; spotX = p.x; spotY = p.y; }
        tx = p.x; ty = p.y;
      }
      if (cursor && moveCursor) { moveCursor(e.clientX, e.clientY); gsap.to(cursor, { autoAlpha: inside ? 1 : 0, duration: 0.25, overwrite: 'auto' }); }
    };
    const onLeave = () => { active = false; if (cursor) gsap.to(cursor, { autoAlpha: 0, duration: 0.25 }); };

    // ---- Click burst -----------------------------------------------------------------------------
    const burst = (e: PointerEvent, color: string) => {
      const p = toSvg(e.clientX, e.clientY);
      const ring = svgEl('circle', { cx: p.x, cy: p.y, r: 14, fill: 'none', stroke: '#ffffff', 'stroke-width': 16, opacity: 1 });
      burstLayer.appendChild(ring);
      gsap.to(ring, { attr: { r: R * 0.9, 'stroke-width': 2 }, opacity: 0, duration: 1.1, ease: 'power2.out', onComplete: () => ring.remove() });
      for (let i = 0; i < 24; i++) {
        const r0 = gsap.utils.random(12, 26);
        const dot = svgEl('circle', { cx: p.x, cy: p.y, r: r0, fill: BURST[i % BURST.length] });
        burstLayer.appendChild(dot);
        const a = Math.random() * Math.PI * 2, d = gsap.utils.random(140, 380);
        // animate the circle's own attributes: a transform scale would pivot around the SVG origin
        gsap.to(dot, { attr: { cx: p.x + Math.cos(a) * d, cy: p.y + Math.sin(a) * d + 40, r: 0 }, opacity: 0, duration: gsap.utils.random(1.0, 1.8), ease: 'power2.out', onComplete: () => dot.remove() });
      }
      units.forEach((u) => {
        const dx = u.cx - p.x, dy = u.cy - p.y, d = Math.hypot(dx, dy) || 1;
        const f = Math.exp(-((d / R) ** 2));
        u.vx += (dx / d) * 900 * f; u.vy += (dy / d) * 700 * f - 250 * f; u.vr += (dx / d) * 40 * f; u.vs += 1.2 * f;
      });
    };

    letters.forEach((el) => {
      const c = GLOW[el.dataset.ch ?? ''] ?? PAL[3];
      el.style.cursor = 'pointer';
      el.addEventListener('pointerenter', () => {
        unitOf(el).hover = true;
        gsap.to(el, { filter: `drop-shadow(0 0 18px ${c}) drop-shadow(0 0 4px ${c})`, duration: 0.4, overwrite: 'auto' });
        if (cursor) gsap.to(cursor, { scale: 2.6, duration: 0.35, ease: 'back.out(2)', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => {
        unitOf(el).hover = false;
        gsap.to(el, { filter: 'drop-shadow(0 0 0px rgba(0,0,0,0))', duration: 0.6, overwrite: 'auto' });
        if (cursor) gsap.to(cursor, { scale: 1, duration: 0.4, overwrite: 'auto' });
      });
      el.addEventListener('pointerdown', (e) => burst(e, c));
    });

    if (fine) {
      cursor = document.createElement('div');
      cursor.className = 'hero-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cursor);
      gsap.set(cursor, { autoAlpha: 0 });
      const qx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
      const qy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
      moveCursor = (x, y) => { qx(x); qy(y); };
      addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    // ---- The one ticker ---------------------------------------------------------------------------
    let t = 0, liq = 0, filterOn = false, ovOpacity = 0, scrollP = 0;
    const K = 70, C = 9;
    const tick = () => {
      const dt = Math.min(gsap.ticker.deltaRatio(60) / 60, 1 / 30);
      t += dt;

      // smoothed pointer + velocity
      if (active && sx > -9000) {
        const k = 1 - Math.exp(-dt * 20);
        const px = sx, py = sy;
        sx += (tx - sx) * k; sy += (ty - sy) * k;
        const m = 1 - Math.exp(-dt * 12);
        pvx += ((sx - px) / dt - pvx) * m; pvy += ((sy - py) / dt - pvy) * m;
        spotX += (tx - spotX) * (1 - Math.exp(-dt * 9)); spotY += (ty - spotY) * (1 - Math.exp(-dt * 9));
      } else {
        const m = 1 - Math.exp(-dt * 8);
        pvx -= pvx * m; pvy -= pvy * m;
      }
      const speed = Math.hypot(pvx, pvy);

      scrollP += (clamp(scrollY / (innerHeight * 0.7), 0, 1) - scrollP) * (1 - Math.exp(-dt * 8));

      units.forEach((u) => {
        const uu = u as Unit & { _all: SVGPathElement[] };
        const dx = u.cx - sx, dy = u.cy - sy, d = Math.hypot(dx, dy);
        const fall = active ? Math.exp(-((d / R) ** 2)) : 0;
        const lean = active ? clamp((sx - u.cx) / R, -1, 1) * fall : 0;
        const targetX = u.spread.x * scrollP;
        const targetY = Math.sin(t * u.idle.f * 1.3 + u.idle.p) * u.idle.y - fall * 14 + u.spread.y * scrollP;
        const targetR = Math.sin(t * u.idle.f + u.idle.p) * u.idle.r + lean * 4 + u.spread.r * scrollP;
        const targetS = (u.hover ? 1.06 : 1) + fall * 0.025;
        // coupling to pointer velocity: the letters get shoved along with the pointer
        const cx = clamp(pvx * 0.28, -420, 420) * fall, cy = clamp(pvy * 0.28, -420, 420) * fall;
        u.vx += ((targetX - u.x) * K - u.vx * C + (cx - u.vx) * 6 * fall) * dt;
        u.vy += ((targetY - u.y) * K - u.vy * C + (cy - u.vy) * 6 * fall) * dt;
        u.vr += ((targetR - u.r) * K * 1.2 - u.vr * C + clamp(pvx * 0.01, -60, 60) * fall * Math.sign(u.cy - sy || 1)) * dt;
        u.vs += ((targetS - u.s) * K * 1.6 - u.vs * C) * dt;
        u.x = clamp(u.x + u.vx * dt, -150, 150); u.y = clamp(u.y + u.vy * dt, -90, 90);
        u.r = clamp(u.r + u.vr * dt, -16, 16); u.s = clamp(u.s + u.vs * dt, 0.9, 1.25);
        gsap.set(uu._all, { x: u.x, y: u.y, rotation: u.r, scale: u.s });
      });

      // flashlight
      const wantOv = ready && active ? 1 : 0;
      ovOpacity += (wantOv - ovOpacity) * (1 - Math.exp(-dt * 7));
      overlay.style.opacity = String(ovOpacity < 0.01 ? 0 : ovOpacity);
      spot.setAttribute('cx', String(spotX)); spot.setAttribute('cy', String(spotY));
      spot.setAttribute('fx', String(spotX)); spot.setAttribute('fy', String(spotY));

      // colour flow speeds up with the pointer
      flowTween.timeScale(1 + clamp(speed / 700, 0, 5));

      // liquid
      const target = fine ? clamp(speed / 55, 0, 26) : 0;
      liq += (target - liq) * (1 - Math.exp(-dt * 6));
      if (liq > 0.6) {
        if (!filterOn) { liquid.setAttribute('filter', 'url(#hero-liquid)'); filterOn = true; }
        disp.setAttribute('scale', liq.toFixed(2));
        turb.setAttribute('baseFrequency', `${(0.006 + Math.sin(t * 0.7) * 0.0015).toFixed(5)} ${(0.012 + Math.cos(t * 0.6) * 0.003).toFixed(5)}`);
      } else if (filterOn) { liquid.removeAttribute('filter'); filterOn = false; }
    };

    const st = ScrollTrigger.create({
      trigger: wrap, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => {
        if (s.isActive) { gsap.ticker.add(tick); flowTween.play(); }
        else { gsap.ticker.remove(tick); flowTween.pause(); }
      },
    });

    return () => {
      st.kill(); tl.kill(); flowTween.kill(); gsap.killTweensOf(smoke.querySelectorAll('circle'));
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cursor?.remove();
      burstLayer.remove();
    };
  });
}
