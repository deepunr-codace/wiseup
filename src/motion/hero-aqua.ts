// Hero "digital aquarium": the brand gradient behaves like water and 3D digital-marketing icons rise
// through it like objects suspended in a fluid. No water, bubbles or underwater imagery.
//
//  - Fluid: a low-resolution canvas (upscaled, so it is smooth) of large radial blobs in the brand
//    swatch palette drifting on slow Lissajous paths over a near-black base. Dark enough that the
//    white heading and the tagline stay readable.
//  - Icons: real CSS 3D tiles (stacked layers in preserve-3d + a glass front face with a white glyph),
//    swaying and slowly turning. They rise from the bottom in a designed lane pattern: lanes alternate
//    left and right, durations differ, starts are evenly staggered, so it reads as one continuous flow.
//    Depth of field: far icons are smaller, blurrier and dimmer, near ones larger and crisper.
//  - Everything sleeps while the hero is off screen; reduced motion draws the fluid once, no icons.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, isMobile, prefersReducedMotion } from '../engine';

// Brand swatch strip.
const PAL: [number, number, number][] = [
  [2, 101, 122], [3, 114, 140], [20, 135, 151], [39, 142, 139], [47, 133, 122], [35, 93, 73],
];

// 24x24 glyphs, drawn to read as white line/fill art on the glass face.
const G = {
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="17.1" cy="6.9" r="1.2" fill="#fff"/>',
  facebook: '<path fill="#fff" d="M13.6 21v-8h2.7l.4-3.2h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.5c-.3 0-1.2-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.7V13h2.7v8z"/>',
  youtube: '<rect x="2.8" y="5.5" width="18.4" height="13" rx="4" fill="none" stroke="#fff" stroke-width="1.9"/><path fill="#fff" d="M10.2 9.2v5.6l4.8-2.8z"/>',
  linkedin: '<rect x="4" y="9.5" width="3.2" height="10" fill="#fff"/><circle cx="5.6" cy="5.8" r="1.9" fill="#fff"/><path fill="#fff" d="M10 9.5h3v1.5c.5-.9 1.6-1.7 3.2-1.7 3 0 3.8 1.9 3.8 4.5v5.7h-3.2v-5c0-1.2-.2-2.2-1.6-2.2-1.5 0-1.9 1.1-1.9 2.3v4.9H10z"/>',
  x: '<path d="M5 5l14 14M19 5L5 19" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="#fff" stroke-width="2"/><path d="M15.2 15.2L20.5 20.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M7.6 12.6l2-2.2 1.6 1.4 2.1-2.8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  seo: '<circle cx="10" cy="10.5" r="5.8" fill="none" stroke="#fff" stroke-width="2"/><path d="M14.3 14.8L19.6 20" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M13.5 5.8h4.4v4.4M17.9 5.8l-5.6 5.6" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  analytics: '<rect x="4" y="12.5" width="3.6" height="7.5" rx="1" fill="#fff"/><rect x="10.2" y="8" width="3.6" height="12" rx="1" fill="#fff"/><rect x="16.4" y="4" width="3.6" height="16" rx="1" fill="#fff"/>',
  target: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="12" r="1.3" fill="#fff"/>',
  megaphone: '<path d="M4 10v4l9 4V6z" fill="#fff"/><path d="M15.5 9.2c1.4 1.7 1.4 3.9 0 5.6M18 7c2.4 2.7 2.4 7.3 0 10" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M6 14.2l1.2 5h2.4l-1-4.2" fill="#fff"/>',
  chat: '<path d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H12l-4.5 3.5V16.5H4.5A1.5 1.5 0 0 1 3 15V7a1.5 1.5 0 0 1 1.5-1.5z" fill="none" stroke="#fff" stroke-width="1.9" stroke-linejoin="round"/><path d="M7.5 10h9M7.5 13h5.5" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="#fff"/>',
  code: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.4 5.5l-2.8 13" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  click: '<path d="M8 3.5v3M3.5 8h3M5 5l2 2M11.5 11.5l8 2.5-3.3 1.5 3 3-1.7 1.7-3-3-1.5 3.3z" fill="#fff" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>',
  globe: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="#fff" stroke-width="1.9"/><ellipse cx="12" cy="12" rx="3.7" ry="8.5" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M3.8 9.5h16.4M3.8 14.5h16.4" stroke="#fff" stroke-width="1.6"/>',
  cart: '<path d="M3 4.5h2.6l2 10h9.5l2-7.2H7" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.4" cy="19" r="1.6" fill="#fff"/><circle cx="16.6" cy="19" r="1.6" fill="#fff"/>',
} as const;

// Order matters: neighbours in this list rise one after another, so mix social, search and data.
const ICONS: (keyof typeof G)[] = ['instagram', 'search', 'analytics', 'youtube', 'seo', 'megaphone', 'facebook', 'target', 'linkedin', 'chat', 'globe', 'heart', 'code', 'click', 'x', 'cart'];
// Lane (x position, % of the hero) per icon in the order above: alternating sides, never adjacent.
const LANES = [9, 78, 31, 91, 18, 62, 45, 86, 6, 70, 24, 52, 94, 38, 14, 82];
const LAYERS = 8; // stacked layers that give each tile real thickness

function makeIcon(name: keyof typeof G, size: number) {
  const el = document.createElement('div');
  el.className = 'aqua-ico';
  el.style.setProperty('--s', `${size}px`);
  let layers = '';
  for (let i = LAYERS; i >= 1; i--) layers += `<i class="aqua-ico__l" style="transform:translateZ(${-i * 2.2}px);opacity:${(1 - i / (LAYERS + 3)).toFixed(2)}"></i>`;
  el.innerHTML = `<div class="aqua-ico__3d">${layers}<div class="aqua-ico__face"><svg viewBox="0 0 24 24" aria-hidden="true">${G[name]}</svg><span class="aqua-ico__shine"></span></div></div>`;
  return el;
}

export function heroAqua() {
  onPage(() => {
    const aqua = document.querySelector<HTMLElement>('[data-aqua]');
    const canvas = aqua?.querySelector<HTMLCanvasElement>('[data-aqua-fluid]');
    const stage = aqua?.querySelector<HTMLElement>('[data-aqua-icons]');
    const ctx = canvas?.getContext('2d');
    if (!aqua || !canvas || !stage || !ctx) return;
    const reduced = prefersReducedMotion();
    const mobile = isMobile();

    // ---- Fluid gradient ------------------------------------------------------------------------------
    // Each blob: palette colour, size, and two periods for its slow Lissajous path (seconds).
    const blobs = [
      { c: PAL[1], r: 0.5, px: 52, py: 61, ax: 0.32, ay: 0.22, ox: 0.28, oy: 0.4, a: 0.5 },
      { c: PAL[3], r: 0.46, px: 67, py: 49, ax: 0.3, ay: 0.26, ox: 0.74, oy: 0.55, a: 0.42 },
      { c: PAL[0], r: 0.56, px: 79, py: 71, ax: 0.36, ay: 0.2, ox: 0.5, oy: 0.78, a: 0.5 },
      { c: PAL[4], r: 0.4, px: 58, py: 83, ax: 0.28, ay: 0.3, ox: 0.15, oy: 0.7, a: 0.36 },
      { c: PAL[2], r: 0.38, px: 91, py: 57, ax: 0.26, ay: 0.24, ox: 0.88, oy: 0.3, a: 0.32 },
      { c: PAL[5], r: 0.5, px: 73, py: 90, ax: 0.34, ay: 0.18, ox: 0.4, oy: 0.12, a: 0.4 },
    ];
    let cw = 0, ch = 0;
    const size = () => {
      const w = aqua.clientWidth, h = aqua.clientHeight;
      const scale = mobile ? 1 / 6 : 1 / 5;
      cw = Math.max(2, Math.round(w * scale)); ch = Math.max(2, Math.round(h * scale));
      canvas.width = cw; canvas.height = ch;
    };
    const drawFluid = (t: number) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#04080a';
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = 'lighter';
      for (const b of blobs) {
        const x = (b.ox + Math.sin((t / b.px) * 6.2832 + b.ox * 9) * b.ax) * cw;
        const y = (b.oy + Math.cos((t / b.py) * 6.2832 + b.oy * 7) * b.ay) * ch;
        const r = b.r * Math.max(cw, ch);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const [R, G2, B] = b.c;
        g.addColorStop(0, `rgba(${R},${G2},${B},${b.a * 0.4})`);
        g.addColorStop(0.5, `rgba(${R},${G2},${B},${b.a * 0.14})`);
        g.addColorStop(1, `rgba(${R},${G2},${B},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
      }
      // a faint, slowly travelling band of light: the water's surface catching the sun
      ctx.globalCompositeOperation = 'lighter';
      const bx = (0.5 + Math.sin(t / 37) * 0.45) * cw;
      const lg = ctx.createLinearGradient(bx - cw * 0.35, 0, bx + cw * 0.35, ch);
      lg.addColorStop(0, 'rgba(120,200,210,0)'); lg.addColorStop(0.5, 'rgba(120,200,210,0.05)'); lg.addColorStop(1, 'rgba(120,200,210,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, cw, ch);
    };
    size();
    drawFluid(0);
    const onResize = () => { size(); drawFluid(0); };
    addEventListener('resize', onResize);
    if (reduced) return () => removeEventListener('resize', onResize);

    // ---- Icons ---------------------------------------------------------------------------------------
    const count = mobile ? 8 : ICONS.length;
    const tweens: gsap.core.Animation[] = [];
    const nodes: HTMLElement[] = [];
    for (let i = 0; i < count; i++) {
      // depth: 0 = far, 1 = mid, 2 = near; a repeating pattern, so every band of the screen has all three
      const depth = [1, 0, 2, 0, 1, 2, 0, 1][i % 8];
      const base = mobile ? 54 : 74;
      const sz = base * [0.62, 0.82, 1.1][depth];
      const el = makeIcon(ICONS[i], sz);
      const lane = LANES[i % LANES.length];
      el.style.left = `${lane}%`;
      el.style.setProperty('--blur', `${[2.2, 0.9, 0]![depth]}px`);
      el.style.setProperty('--dim', `${[0.5, 0.78, 1][depth]}`);
      el.style.zIndex = String(depth + 1);
      stage.appendChild(el);
      nodes.push(el);

      const dur = [30, 23, 17][depth] + (i % 4) * 1.6;      // far drifts slowest (parallax)
      const sway = [10, 16, 24][depth];
      const inner = el.querySelector<HTMLElement>('.aqua-ico__3d')!;
      // rise: one long upward travel, fading in near the bottom and out near the top
      const rise = gsap.timeline({ repeat: -1, repeatDelay: 1.5 + (i % 3) * 1.2 });
      rise.fromTo(el, { y: '6vh', opacity: 0 }, { y: '-112vh', duration: dur, ease: 'none' }, 0)
        .to(el, { opacity: 1, duration: dur * 0.14, ease: 'sine.out' }, 0)
        .to(el, { opacity: 0, duration: dur * 0.2, ease: 'sine.in' }, dur * 0.8);
      // start evenly spread along the cycle so the hero is already alive on load
      rise.progress(((i * 0.618) % 1) * 0.95);
      tweens.push(rise);
      // lateral sway and slow 3D turn, on their own clocks
      tweens.push(gsap.to(el, { x: sway, duration: 5 + (i % 5), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -(i % 5) }));
      tweens.push(gsap.fromTo(inner,
        { rotationY: -22 - (i % 3) * 6, rotationX: 10, rotationZ: -4 },
        { rotationY: 22 + (i % 3) * 6, rotationX: -12, rotationZ: 5, duration: 7 + (i % 4) * 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -(i % 6) }));
    }

    // ---- Fluid ticker + visibility -----------------------------------------------------------------
    let t = 0;
    const tick = () => { t += gsap.ticker.deltaRatio(60) / 60; drawFluid(t); };
    const st = ScrollTrigger.create({
      trigger: aqua, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => {
        if (s.isActive) { gsap.ticker.add(tick); tweens.forEach((a) => a.play()); }
        else { gsap.ticker.remove(tick); tweens.forEach((a) => a.pause()); }
      },
    });

    return () => {
      st.kill(); gsap.ticker.remove(tick); removeEventListener('resize', onResize);
      tweens.forEach((a) => a.kill());
      nodes.forEach((n) => n.remove());
    };
  });
}
