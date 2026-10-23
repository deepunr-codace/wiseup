// "We create a voice. Not dragon fire. A burning flame." backdrop: a live flame drawn in the brand palette that
// ignites as the pinned section is scrolled (it replaces the old pre-rendered frame sequence).
//
//  - Canvas at 1/4 resolution, upscaled and softly blurred by CSS, so the flame reads as light, not as shapes.
//  - The flame is a stack of tongues (tall radial-gradient ellipses, additive blend): deep teal outside, brand
//    teal/green in the middle, a pale-teal then white-hot core. Each tongue flickers on its own sine mix.
//  - Scroll progress p (0..1) is the fuel: a small ember at p=0, a full flame at p=1; embers rise in proportion.
//  - Slow smoke blobs drift behind it. Everything sleeps off screen; reduced motion draws one still full flame.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, isMobile, prefersReducedMotion } from '../engine';

const PAL: [number, number, number][] = [[2, 101, 122], [3, 114, 140], [20, 135, 151], [39, 142, 139], [47, 133, 122], [35, 93, 73]];
const smooth = (t: number) => t * t * (3 - 2 * t);
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lift = (c: number[], t: number) => c.map((v) => v + (255 - v) * t);

type Ember = { x: number; y: number; r: number; v: number; ph: number; a: number };

export function flameBackdrop() {
  onPage(() => {
    const pin = document.querySelector<HTMLElement>('[data-seq]');
    const canvas = pin?.querySelector<HTMLCanvasElement>('[data-flame]');
    const ctx = canvas?.getContext('2d');
    if (!pin || !canvas || !ctx) return;
    const reduced = prefersReducedMotion();
    const mobile = isMobile();
    let w = 0, h = 0;
    let embers: Ember[] = [];
    const newEmber = (fresh: boolean): Ember => ({
      x: 0.5 + (Math.random() - 0.5) * 0.5, y: fresh ? 1.02 : Math.random(), r: 0.6 + Math.random() * 1.6,
      v: 0.05 + Math.random() * 0.09, ph: Math.random() * 6.28, a: 0.35 + Math.random() * 0.65,
    });
    const size = () => {
      const s = mobile ? 1 / 6 : 1 / 4;
      w = Math.max(2, Math.round(canvas.clientWidth * s)); h = Math.max(2, Math.round(canvas.clientHeight * s));
      canvas.width = w; canvas.height = h;
      embers = Array.from({ length: mobile ? 28 : 60 }, () => newEmber(false));
    };
    size();
    addEventListener('resize', size);

    let p = reduced ? 1 : 0;      // scroll fuel, eased
    let pT = p;
    let t = 0;
    const draw = (dt: number) => {
      p += (pT - p) * (1 - Math.exp(-dt * 6));
      const fuel = 0.16 + 0.84 * smooth(p);
      const cx = w * (0.74 - 0.12 * smooth(p));           // the flame drifts a little toward the centre as it grows
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#020405'; ctx.fillRect(0, 0, w, h);

      // smoke / ambient: big dim blobs
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const c = PAL[(i * 2) % 6];
        const x = (0.3 + 0.55 * ((i * 0.37 + Math.sin(t * 0.05 + i * 2) * 0.12) % 1)) * w;
        const y = (0.45 + Math.cos(t * 0.04 + i * 1.7) * 0.18) * h;
        const r = Math.max(w, h) * (0.38 + i * 0.05);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(c, 0.1 * (0.5 + fuel))); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }

      // floor glow under the flame
      const fg = ctx.createRadialGradient(cx, h * 1.02, 0, cx, h * 1.02, h * (0.55 + 0.5 * fuel));
      fg.addColorStop(0, rgba(lift(PAL[3], 0.35), 0.55 * fuel)); fg.addColorStop(0.5, rgba(PAL[1], 0.22 * fuel)); fg.addColorStop(1, rgba(PAL[0], 0));
      ctx.fillStyle = fg; ctx.fillRect(0, 0, w, h);

      // tongues
      const N = mobile ? 7 : 11;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);                                   // 0 = outer left ... 1 = outer right
        const mid = 1 - Math.abs(u - 0.5) * 2;                   // 1 in the middle, 0 at the edges
        const flick = 0.82 + 0.18 * Math.sin(t * (1.7 + i * 0.37) + i * 2.1) + 0.08 * Math.sin(t * 4.3 + i);
        const hgt = h * (0.26 + 0.78 * fuel) * (0.35 + 0.65 * mid * mid) * flick;
        const wid = h * (0.045 + 0.06 * fuel) * (0.7 + 0.5 * mid);
        const sway = Math.sin(t * (0.9 + i * 0.21) + i) * w * 0.012 * (1 + fuel);
        const x = cx + (u - 0.5) * h * (0.22 + 0.3 * fuel) + sway;
        // colour by closeness to the middle: outer = deep teal, centre = pale teal, white-hot core when fuelled
        const col = mid > 0.8 ? lift(PAL[3], 0.5 + 0.35 * fuel) : mid > 0.45 ? PAL[(2 + (i % 3)) % 6] : PAL[i % 2];
        ctx.save();
        ctx.translate(x, h * 1.04); ctx.scale(wid, hgt);
        const g = ctx.createRadialGradient(0, -0.5, 0, 0, -0.5, 0.62);
        g.addColorStop(0, rgba(mid > 0.8 && fuel > 0.55 ? lift(col, 0.55) : col, (0.42 + 0.5 * mid) * (0.4 + 0.6 * fuel)));
        g.addColorStop(0.55, rgba(col, 0.2 * (0.4 + 0.6 * fuel)));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -0.5, 0.62, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      // embers
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        if (!reduced) e.y -= e.v * dt * (0.4 + 1.1 * fuel);
        if (e.y < -0.03) { embers[i] = newEmber(true); continue; }
        const ex = (cx / w + (e.x - 0.5) * (0.55 + 0.3 * fuel) + Math.sin(t * 0.8 + e.ph) * 0.02) * w;
        const ey = e.y * h;
        const near = 1 - Math.min(1, Math.abs(e.y - 0.55) * 1.4);
        const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + e.ph * 3);
        const al = Math.max(0, e.a * tw * (0.2 + 0.8 * fuel) * (0.35 + 0.65 * near));
        ctx.fillStyle = `rgba(190,245,235,${al * 0.2})`; ctx.beginPath(); ctx.arc(ex, ey, e.r * 2.6, 0, 6.2832); ctx.fill();
        ctx.fillStyle = `rgba(235,255,250,${al})`; ctx.beginPath(); ctx.arc(ex, ey, e.r * 0.8, 0, 6.2832); ctx.fill();
      }
    };

    if (reduced) { draw(0.016); return () => removeEventListener('resize', size); }

    const tick = (_t: number, ms: number) => { const dt = Math.min(ms / 1000, 1 / 20); t += dt; draw(dt); };
    let on = false;
    const show = (v: boolean) => { if (v && !on) { gsap.ticker.add(tick); on = true; } else if (!v && on) { gsap.ticker.remove(tick); on = false; } };
    const view = ScrollTrigger.create({ trigger: pin, start: 'top bottom', end: 'bottom top', onToggle: (s) => show(s.isActive) });
    const st = ScrollTrigger.create({
      trigger: pin, start: 'top top', end: '+=140%', pin: true, scrub: 0.5,
      onUpdate: (self) => { pT = self.progress; },
    });
    return () => { removeEventListener('resize', size); show(false); view.kill(); st.kill(); };
  });
}
