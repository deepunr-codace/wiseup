// WiseUp v3 motion. Everything page-level runs inside onPage() (engine gsap.context, auto-reverted).
// One clock: GSAP timelines and ScrollTrigger only. Every loop pauses off screen and is skipped
// under reduced motion, where the CSS shows each mock/section in its finished, fully visible state.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { Observer } from 'gsap/Observer';
import { onPage, onScroll, isMobile, isTouch, prefersReducedMotion, ease } from '../engine';
import { site } from '../data/site';
import { setupAbout } from './about';
import { heroType } from './hero-type';

gsap.registerPlugin(ScrollTrigger, SplitText, MorphSVGPlugin, Observer);

export function setupMotion() {
  header();
  menu();
  themeToggle();
  heroType();
  heroArt();
  heroStrip();
  imageSequence();
  heroLine();
  horizontalGallery();
  rollingDrum();
  loopedPanels();
  workRows();
  dynamicMorph();
  accordions();
  faqRefresh();
  contactForm();
  contactMorph();
  setupAbout();
}

/** Play a looping timeline only while its element is on screen. */
function whileVisible(el: Element, tl: gsap.core.Timeline) {
  tl.pause();
  ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) });
}

/* Header: current section marked in the nav; steps aside reading down, returns on the way up. */
function header() {
  onPage(() => {
    const head = document.querySelector<HTMLElement>('[data-head]');
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav]')];
    let current: HTMLAnchorElement | null = null;
    const set = (a: HTMLAnchorElement | null) => {
      current = a;
      links.forEach((l) => {
        l.classList.toggle('is-current', l === a);
        if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
      });
    };
    links.forEach((a) => {
      const sec = document.getElementById(a.dataset.nav!);
      if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: (s) => { if (s.isActive) set(a); else if (current === a) set(null); } });
    });
    if (!head) return;
    let last = scrollY;
    const off = onScroll(({ y }) => {
      if (y < 160 || y < last - 2) head.classList.remove('is-hidden');
      else if (y > last + 2 && !head.contains(document.activeElement)) head.classList.add('is-hidden');
      last = y;
    });
    const show = () => head.classList.remove('is-hidden');
    head.addEventListener('focusin', show);
    return () => { off(); head.removeEventListener('focusin', show); };
  });
}

/* Mobile menu: a disclosure. Escape and link clicks close it. */
function menu() {
  onPage(() => {
    const btn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
    const panel = document.querySelector<HTMLElement>('[data-menu]');
    if (!btn || !panel) return;
    const set = (open: boolean) => {
      btn.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      if (open && !prefersReducedMotion()) gsap.fromTo(panel, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'expo.out' });
    };
    const toggle = () => set(btn.getAttribute('aria-expanded') !== 'true');
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } };
    const click = (e: Event) => { if ((e.target as HTMLElement).closest('[data-menu-link]')) set(false); };
    btn.addEventListener('click', toggle);
    document.addEventListener('keydown', key);
    panel.addEventListener('click', click);
    return () => { btn.removeEventListener('click', toggle); document.removeEventListener('keydown', key); panel.removeEventListener('click', click); };
  });
}

/* Theme toggle: flips :root's own tokens to the light palette already used per-section for
   About/Clients/FAQ (see tokens.css). The pre-paint read in Base.astro's inline script sets the
   initial state; this just owns the click and keeps localStorage + aria-pressed in sync. */
function themeToggle() {
  onPage(() => {
    const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
    if (!btn) return;
    const sync = () => {
      const light = document.documentElement.dataset.theme === 'light';
      btn.setAttribute('aria-pressed', String(light));
      btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    };
    sync();
    const click = () => {
      const light = document.documentElement.dataset.theme === 'light';
      if (light) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = 'light';
      try { localStorage.setItem('wu-theme', light ? 'night' : 'light'); } catch {}
      sync();
    };
    btn.addEventListener('click', click);
    return () => btn.removeEventListener('click', click);
  });
}

/* ------------------------------------------------------------------ *
 * Hero artwork motion layers: the image slowly breathes, the coloured glows pulse and drift, the
 * phone screen glows, a light sweep crosses the lettering every few seconds, and a canvas of
 * tiny particles floats upward (blue to the left, orange to the right, like the artwork's light).
 * Everything runs on GSAP (timelines + one ticker) and sleeps while the hero is off screen.
 * ------------------------------------------------------------------ */
function heroArt() {
  onPage(() => {
    const art = document.querySelector<HTMLElement>('[data-hero-art]');
    if (!art || prefersReducedMotion()) return;
    const img = art.querySelector<HTMLElement>('.hero__bgimg');
    const glows = art.querySelectorAll<HTMLElement>('[data-fx-glow]');
    const phone = art.querySelector<HTMLElement>('[data-fx-phone]');
    const sweep = art.querySelector<HTMLElement>('[data-fx-sweep]');
    const canvas = art.querySelector<HTMLCanvasElement>('[data-fx-canvas]');

    const tl = gsap.timeline({ repeat: -1 });
    if (img) tl.to(img, { scale: 1.035, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0);
    glows.forEach((g, i) => {
      tl.to(g, { opacity: 0.8, scale: 1.18, x: i === 1 ? 0 : (i ? -30 : 30), duration: 4 + i, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
    });
    if (phone) tl.fromTo(phone, { opacity: 0.35, scale: 0.85 }, { opacity: 1, scale: 1.15, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
    if (sweep) {
      const sw = gsap.timeline({ repeat: -1, repeatDelay: 4.5, delay: 3 });
      sw.fromTo(sweep, { xPercent: -100, opacity: 0 }, { xPercent: 380, opacity: 1, duration: 2.8, ease: 'power1.inOut' })
        .to(sweep, { opacity: 0, duration: 0.5 }, '-=0.6');
      tl.add(sw, 0);
    }

    // Particles
    let tick: (() => void) | null = null;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      type P = { x: number; y: number; r: number; vy: number; sway: number; ph: number; a: number; c: string };
      let w = 0, h = 0, dpr = 1;
      let parts: P[] = [];
      // Neutral dust motes: the hero is a dark stage lit by white light.
      const COLORS = ['255,255,255', '235,240,245', '210,220,230', '255,255,255'];
      const make = (rand: boolean): P => {
        const x = Math.random();
        // left half cool, right half warm, a few of either anywhere
        const warm = x > 0.62;
        return {
          x, y: rand ? Math.random() : 1.02,
          r: 0.5 + Math.random() * 1.7, vy: 0.012 + Math.random() * 0.03, sway: 0.004 + Math.random() * 0.012,
          ph: Math.random() * 6.28, a: 0.35 + Math.random() * 0.65, c: warm ? COLORS[3] : COLORS[Math.floor(Math.random() * 3)],
        };
      };
      const size = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.clientWidth; h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        parts = Array.from({ length: isMobile() ? 36 : 80 }, () => make(true));
      };
      size();
      addEventListener('resize', size);
      let t = 0;
      tick = () => {
        const dt = Math.min(gsap.ticker.deltaRatio(60), 3);
        t += 0.016 * dt;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.y -= p.vy * 0.016 * 60 * dt * 0.16;
          const px = (p.x + Math.sin(t * 0.7 + p.ph) * p.sway) * w;
          const py = p.y * h;
          if (p.y < -0.02) { parts[i] = make(false); continue; }
          const tw = 0.55 + 0.45 * Math.sin(t * 2 + p.ph * 3);
          const edge = Math.min(1, p.y * 6, (1 - p.y) * 6);
          const al = Math.max(0, p.a * tw * edge);
          ctx.fillStyle = `rgba(${p.c},${al * 0.18})`;
          ctx.beginPath(); ctx.arc(px, py, p.r * 3.2, 0, 6.2832); ctx.fill();
          ctx.fillStyle = `rgba(${p.c},${al})`;
          ctx.beginPath(); ctx.arc(px, py, p.r, 0, 6.2832); ctx.fill();
        }
      };
      gsap.ticker.add(tick);
      var cleanupResize = () => removeEventListener('resize', size);
    }

    const st = ScrollTrigger.create({
      trigger: art, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => {
        if (s.isActive) { tl.play(); if (tick) gsap.ticker.add(tick); }
        else { tl.pause(); if (tick) gsap.ticker.remove(tick); }
      },
    });
    return () => { st.kill(); tl.kill(); if (tick) gsap.ticker.remove(tick); if (typeof cleanupResize === 'function') cleanupResize(); };
  });
}

/* ------------------------------------------------------------------ *
 * Hero strip: one row of covers on a tilted plane (the tilt is static CSS on
 * .strip__plane). This only moves the track along the plane's own x axis, so
 * every bit of motion follows the diagonal: a slow drift at rest, plus an
 * offset driven by scroll, both toward the upper right. One transform per
 * frame (the track), never per card, so it stays cheap on phones. The track
 * holds STRIP_SETS identical sets; the offset wraps by one set width, so the
 * loop has no visible seam. The orbit dot circles the wordmark on the same clock.
 * ------------------------------------------------------------------ */
function heroStrip() {
  onPage(({ intro }) => {
    const strip = document.querySelector<HTMLElement>('[data-strip]');
    const track = document.querySelector<HTMLElement>('[data-strip-track]');
    const orbit = document.querySelector<HTMLElement>('[data-orbit]');
    if (!strip || !track || prefersReducedMotion()) return;
    intro.from(strip, { yPercent: 24, autoAlpha: 0, duration: 1.6, ease: 'expo.out' }, 0.35);
    const orbitTl = orbit ? gsap.to(orbit, { rotation: 360, duration: 90, ease: 'none', repeat: -1 }) : undefined;
    const hero = strip.closest('section') || strip;
    const stop = driftTrack(track, {
      dir: 1, speed: isMobile() ? 26 : 38, scrollEl: hero, scrollStart: 'top top', scrollShare: 0.55,
      onVisible: (v) => orbitTl?.paused(!v),
    });
    return () => { stop(); orbitTl?.kill(); };
  });
}

/* ------------------------------------------------------------------ *
 * Work: two rows of covers drifting in opposite directions (top left,
 * bottom right), slow at rest like the reference, and pushed further apart
 * by scroll while the section is on screen.
 * ------------------------------------------------------------------ */
function workRows() {
  onPage(() => {
    const rows = gsap.utils.toArray<HTMLElement>('[data-work-row]');
    if (!rows.length || prefersReducedMotion()) return;
    const stops = rows.map((row) => {
      const track = row.querySelector<HTMLElement>('[data-sets]');
      if (!track) return () => {};
      return driftTrack(track, {
        dir: Number(row.dataset.dir) < 0 ? -1 : 1, speed: isMobile() ? 12 : 16,
        scrollEl: row.closest('section') || row, scrollStart: 'top bottom', scrollShare: 0.35,
      });
    });
    return () => stops.forEach((s) => s());
  });
}

/** Seamless looping track: `track` holds `data-sets` identical sets of items. It moves by a slow
 *  drift plus a scroll-driven offset, eased toward the target each tick and wrapped by one set
 *  width, so the loop never shows a seam. One transform per frame on the track, never per item.
 *  Pauses while its scroll element is off screen. dir 1 moves right, -1 moves left. */
function driftTrack(track: HTMLElement, o: {
  dir: 1 | -1; speed: number; scrollEl: Element; scrollStart: string; scrollShare: number; onVisible?: (visible: boolean) => void;
}) {
  const sets = Number(track.dataset.sets || 1);
  let setW = 0;
  const measure = () => { setW = track.scrollWidth / sets; };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  let drift = 0;
  let scrollOff = 0;
  let cur = 0;
  let visible = true;
  const setX = gsap.quickSetter(track, 'x', 'px') as (v: number) => void;
  const scroll = ScrollTrigger.create({ trigger: o.scrollEl, start: o.scrollStart, end: 'bottom top', onUpdate: (s) => { scrollOff = s.progress * setW * o.scrollShare; } });
  const view = ScrollTrigger.create({ trigger: o.scrollEl, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; o.onVisible?.(s.isActive); } });

  const tick = (_t: number, dt: number) => {
    if (!visible || !setW) return;
    drift += (o.speed * dt) / 1000;
    const target = drift + scrollOff;
    cur += (target - cur) * (1 - Math.pow(0.86, dt / 16.67)); // frame-rate independent ease toward target
    setX(gsap.utils.wrap(-setW, 0, o.dir * cur - setW));
  };
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    ScrollTrigger.removeEventListener('refreshInit', measure);
    scroll.kill();
    view.kill();
  };
}

/* ------------------------------------------------------------------ *
 * Image sequence: the flame clip, scrubbed by scroll while the section
 * is pinned. Canvas draws the current frame; the H1 lines light up in
 * step. Skipped (poster frame only) when no sequence was generated.
 * ------------------------------------------------------------------ */
function imageSequence() {
  onPage(() => {
    const pin = document.querySelector<HTMLElement>('[data-seq]');
    const canvas = document.querySelector<HTMLCanvasElement>('[data-seq-canvas]');
    const count = Number(pin?.dataset.frames || 0);
    if (!pin || !canvas || !count || prefersReducedMotion()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 96 frames would otherwise all be requested on every page load, regardless of whether the
    // visitor ever scrolls there — wasteful, and on a slow/throttled connection many stay pending
    // indefinitely. Frame 1 loads eagerly (so the canvas has something the instant it's reached);
    // the rest load only once this section is roughly one screen away.
    const images: HTMLImageElement[] = new Array(count);
    const base = pin.dataset.seqBase || '/seq/';
    const src = (i: number) => `${base}f${String(i + 1).padStart(3, '0')}.webp`;
    const frame = { i: 0 };
    const load = (i: number) => {
      if (images[i]) return images[i];
      const img = new Image();
      img.decoding = 'async';
      img.src = src(i);
      images[i] = img;
      return img;
    };
    const draw = () => {
      const img = images[Math.round(frame.i)];
      if (!img || !img.complete || !img.naturalWidth) return;
      const cw = canvas.width, ch = canvas.height, ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      let dw = cw, dh = ch, dx = 0, dy = 0;
      if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; } else { dw = cw; dh = cw / ir; dy = (ch - dh) / 2; }
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    };
    const size = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; draw(); };

    load(0).onload = () => size();
    size();
    addEventListener('resize', size);

    // This section starts one screen down, so "near" is true on first paint. Wait for the window
    // load event too, so the 95 frames never compete with the hero's own images for bandwidth
    // (on a throttled phone they pushed the hero LCP from ~2s to 8s).
    const loadRest = () => { for (let i = 1; i < count; i++) load(i).onload = draw; };
    const afterPageLoad = () => (document.readyState === 'complete' ? loadRest() : addEventListener('load', loadRest, { once: true }));
    const preload = ScrollTrigger.create({ trigger: pin, start: 'top bottom+=100%', once: true, onEnter: afterPageLoad });
    const st = ScrollTrigger.create({
      trigger: pin, start: 'top top', end: '+=140%', pin: true, scrub: 0.5,
      onUpdate: (self) => { frame.i = Math.min(count - 1, Math.floor(self.progress * count)); draw(); },
    });
    return () => { removeEventListener('resize', size); removeEventListener('load', loadRest); preload.kill(); st.kill(); };
  });
}

/* Hero statement (under the flame): words light up as they scroll into the reading line. */
function heroLine() {
  onPage(() => {
    const el = document.querySelector<HTMLElement>('[data-words]');
    if (!el || prefersReducedMotion()) return;
    const split = SplitText.create(el, { type: 'lines,words', linesClass: 'seq__split-line' });
    gsap.fromTo(split.words, { opacity: 0.22 }, {
      opacity: 1, stagger: 0.09, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom 40%', scrub: 0.5 },
    });
    return () => split.revert();
  });
}

/* ------------------------------------------------------------------ *
 * Process: horizontal scrolling gallery. Desktop/motion only (see CSS
 * breakpoint); the section pins and the track's x is scrubbed across
 * its own overflow, using the pin's scroll distance as the driver.
 * ------------------------------------------------------------------ */
function horizontalGallery() {
  onPage(() => {
    const view = document.querySelector<HTMLElement>('[data-hgal]');
    const track = document.querySelector<HTMLElement>('[data-hgal-track]');
    if (!view || !track || prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const amount = () => Math.max(0, track.scrollWidth - view.clientWidth);
      const tween = gsap.to(track, { x: () => -amount(), ease: 'none' });
      const st = ScrollTrigger.create({
        trigger: view, start: 'top top', end: () => `+=${amount()}`, pin: true, scrub: 0.6, animation: tween, invalidateOnRefresh: true,
      });
      return () => st.kill();
    });
    return () => mm.revert();
  });
}

/* ------------------------------------------------------------------ *
 * Services: rolling text drum. The channel words sit on a 3D cylinder
 * (CSS rotateX per word) and the ring turns with scroll progress.
 * ------------------------------------------------------------------ */
function rollingDrum() {
  onPage(() => {
    const drum = document.querySelector<HTMLElement>('[data-drum]');
    const ring = document.querySelector<HTMLElement>('[data-drum-ring]');
    if (!drum || !ring || prefersReducedMotion()) return;
    const words = ring.children.length;
    gsap.to(ring, {
      rotateX: words * 30, ease: 'none',
      scrollTrigger: { trigger: drum.closest('section'), start: 'top 70%', end: 'bottom top', scrub: 0.8 },
    });
  });
}

/* ------------------------------------------------------------------ *
 * Clients: infinite looped panels. Observer drives drag/wheel, snap
 * rounds to the nearest panel, and maxScroll-style wrap keeps it endless
 * by re-splicing the DOM order after each settle (so "infinite" is real,
 * not just a large scroll range).
 * ------------------------------------------------------------------ */
function loopedPanels() {
  onPage(() => {
    const root = document.querySelector<HTMLElement>('[data-loop]');
    const track = document.querySelector<HTMLUListElement>('[data-loop-track]');
    const prevBtn = document.querySelector<HTMLButtonElement>('[data-loop-prev]');
    const nextBtn = document.querySelector<HTMLButtonElement>('[data-loop-next]');
    if (!root || !track) return;
    const panels = [...track.children] as HTMLElement[];
    if (panels.length < 2) return;

    // Step by the panel's measured pixel width plus GAP, not a percentage of its own width:
    // translateX(100%) is relative to the panel's own box, so stepping by "100%" alone places
    // panels flush edge to edge no matter what GAP is — the CSS custom property only reserves
    // room inside each panel's width, it never re-inserts that space between panels. Pixel
    // stepping needs a resize remeasure, since panel width changes with the viewport.
    const GAP = 28; // px between visible panels — keep in sync with .loop__track's CSS gap
    let perView = 4;
    let step = 0;
    const setPerView = () => { perView = innerWidth < 640 ? 1 : innerWidth < 1100 ? 2 : 4; };
    const measure = () => {
      setPerView();
      panels.forEach((p) => { p.style.setProperty('--pw', `calc((100% - ${(perView - 1) * GAP}px) / ${perView})`); });
      step = panels[0].getBoundingClientRect().width + GAP;
    };
    measure();
    gsap.set(panels, { x: (i) => i * step });

    const wrap = gsap.utils.wrap(0, panels.length);
    let index = 0;
    const reduced = prefersReducedMotion();
    const go = (dir: number) => {
      // All panels already visible (4 per view on wide screens): nothing to page through, so stay
      // in reading order instead of rotating cards around.
      index = perView >= panels.length ? 0 : wrap(index + dir);
      panels.forEach((p, i) => {
        const rel = gsap.utils.wrap(0, panels.length, i - index);
        gsap.to(p, { x: rel * step, duration: reduced ? 0 : 0.6, ease: 'expo.out', overwrite: true });
      });
    };
    go(0);
    const resize = () => { measure(); go(0); };
    addEventListener('resize', resize);

    prevBtn?.addEventListener('click', () => go(-1));
    nextBtn?.addEventListener('click', () => go(1));

    let obs: Observer | null = null;
    if (!isTouch() && !reduced) {
      obs = Observer.create({
        target: root, type: 'wheel,touch,pointer', axis: 'x', tolerance: 10, preventDefault: true,
        onLeft: () => go(1), onRight: () => go(-1), dragMinimum: 20,
      });
    }
    return () => { removeEventListener('resize', resize); obs?.kill(); };
  });
}

/* ------------------------------------------------------------------ *
 * CodeAce: dynamic morphing. One SVG path cycles CodeAce mark -> WiseUp
 * mark -> flame -> back, in time with the section's scroll progress.
 * ------------------------------------------------------------------ */
function dynamicMorph() {
  onPage(() => {
    const fig = document.querySelector<HTMLElement>('[data-morph]');
    const path = fig?.querySelector<SVGPathElement>('[data-morph-path]');
    const label = fig?.querySelector<HTMLElement>('[data-morph-label]');
    if (!fig || !path || prefersReducedMotion()) return;
    const shapeW = 'M40 90 60 150 100 60 140 150 160 90 100 20Z'; // W
    const shapeFlame = 'M100 15C130 55 148 90 148 118A48 48 0 1 1 52 118C52 96 66 86 78 72A30 30 0 0 0 100 15Z';
    const tl = gsap.timeline({
      scrollTrigger: { trigger: fig.closest('section'), start: 'top 60%', end: 'bottom top', scrub: 0.7 },
    })
      .to(path, { morphSVG: shapeW, duration: 1, ease: 'none' })
      .call(() => label && (label.textContent = 'WiseUp'), [], 0.5)
      .to(path, { morphSVG: shapeFlame, duration: 1, ease: 'none' }, 1)
      .call(() => label && (label.textContent = 'One team'), [], 1.5);
    return () => tl.scrollTrigger?.kill();
  });
}

/* Service rows: accordion state on aria-expanded; the row carries .is-open. */
function accordions() {
  onPage(() => {
    const btns = [...document.querySelectorAll<HTMLButtonElement>('[data-acc]')];
    const click = (e: Event) => {
      const b = e.currentTarget as HTMLButtonElement;
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      b.closest('li')?.classList.toggle('is-open', open);
      setTimeout(() => ScrollTrigger.refresh(), 600);
    };
    btns.forEach((b) => b.addEventListener('click', click));
    return () => btns.forEach((b) => b.removeEventListener('click', click));
  });
}

/* FAQ is native <details>; re-measure scroll positions once one has opened or closed. */
function faqRefresh() {
  onPage(() => {
    const items = document.querySelectorAll<HTMLDetailsElement>('[data-faq] details');
    let id = 0;
    const refresh = () => { clearTimeout(id); id = window.setTimeout(() => ScrollTrigger.refresh(), 600); };
    items.forEach((d) => d.addEventListener('toggle', refresh));
    return () => items.forEach((d) => d.removeEventListener('toggle', refresh));
  });
}

/* Contact: no backend. The form composes one WhatsApp message from all three fields.
   Without JS it still submits the message field to wa.me as ?text=. */
function contactForm() {
  onPage(() => {
    const form = document.querySelector<HTMLFormElement>('[data-form]');
    if (!form) return;
    const submit = (e: SubmitEvent) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const phone = String(data.get('phone') || '').trim();
      const service = String(data.get('service') || '').trim();
      const text = String(data.get('text') || '').trim();
      const msg = [
        name && `Hi WiseUp, I'm ${name}.`,
        service && `I'm interested in: ${service}.`,
        text,
        [email && `Email: ${email}`, phone && `Phone: ${phone}`].filter(Boolean).join(' · '),
      ].filter(Boolean).join('\n\n') || 'Hi WiseUp, I would like your plan.';
      window.open(`${site.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    };
    form.addEventListener('submit', submit);
    return () => form.removeEventListener('submit', submit);
  });
}

/* Contact morph: the same device as the CodeAce figure (dynamicMorph() above) — one path
   reshaped via MorphSVGPlugin, a caption in lockstep — but ambient-looping (repeat: -1) instead
   of scroll-scrubbed, since this section has no extra scroll height to scrub against. Cycles
   three marks that echo the section's own copy: a talk bubble ("Let's talk", the eyebrow), the
   WiseUp "W", then the flame from "light the fire?". whileVisible() pauses it off screen. */
function contactMorph() {
  onPage(() => {
    const fig = document.querySelector<HTMLElement>('[data-contact-morph]');
    const path = fig?.querySelector<SVGPathElement>('[data-contact-morph-path]');
    const label = fig?.querySelector<HTMLElement>('[data-contact-morph-label]');
    if (!fig || !path || prefersReducedMotion()) return;
    const shapeW = 'M40 90 60 150 100 60 140 150 160 90 100 20Z';
    const shapeFlame = 'M100 15C130 55 148 90 148 118A48 48 0 1 1 52 118C52 96 66 86 78 72A30 30 0 0 0 100 15Z';
    const shapeTalk = 'M60 30H140A20 20 0 0 1 160 50V110A20 20 0 0 1 140 130H100L75 155V130H60A20 20 0 0 1 40 110V50A20 20 0 0 1 60 30Z';
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
      .to(path, { morphSVG: shapeW, duration: 1.1, ease: ease.inOut })
      .call(() => label && (label.textContent = 'WiseUp'))
      .to({}, { duration: 1.2 })
      .to(path, { morphSVG: shapeFlame, duration: 1.1, ease: ease.inOut })
      .call(() => label && (label.textContent = 'Light the fire'))
      .to({}, { duration: 1.2 })
      .to(path, { morphSVG: shapeTalk, duration: 1.1, ease: ease.inOut })
      .call(() => label && (label.textContent = "Let's talk"))
      .to({}, { duration: 1.2 });
    whileVisible(fig, tl);
  });
}
