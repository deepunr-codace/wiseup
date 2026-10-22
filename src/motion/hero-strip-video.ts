// Hero strip testimonial videos. The strip keeps its continuous diagonal drift (driftTrack in main.ts);
// this controller adds the video behaviour on top:
//
//  - Slide timing: the card arriving at the focus point makes the drift ease almost to a stop, its video
//    plays muted, then the drift eases back up and carries the strip on to the next card. The dwell is
//    dynamic: it follows the video's real duration, clamped to [MIN, CAP] seconds (a clip shorter than MIN
//    loops until MIN; a longer one is cut at CAP), measured on the video's own clock so a stall does not
//    shorten it. A video that has not started within START_TIMEOUT is abandoned.
//  - Loading: only the focus card and the next one are warmed (full buffering for the focus card, metadata
//    only for the next), every other card has its src removed. These MP4s are 14-58 MB, so nothing else is
//    fetched. Data-saver / slow connections get posters only.
//  - Playback: only the focus card plays; it is paused when the hero leaves the screen or the tab is hidden.
//  - Errors: a video that errors or never starts is dropped (poster stays) and the carousel carries on.
//  - Autoplay policy: videos are muted + playsinline; if play() is refused the poster is simply kept.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type Card = {
  el: HTMLElement; vid: HTMLVideoElement; src: string;
  failed: boolean; cx: number; vis: number; started: boolean;
};

const MIN = 4;                 // shortest dwell (s)
const START_TIMEOUT = 4500;    // ms to wait for a video to start playing
const SEEN = 0.35;             // fraction of a card that must be on screen before it loads/plays
const POSTER_DWELL = 2200;     // ms a card with no usable video holds before the strip moves on
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function stripVideos(track: HTMLElement, o: { mobile: boolean; hero: Element }) {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  const slow = !!nav.connection?.saveData || /(^|-)2g$|3g/.test(nav.connection?.effectiveType ?? '');
  const CAP = o.mobile ? 9 : 12; // longest dwell (s)

  const cards: Card[] = Array.from(track.querySelectorAll<HTMLElement>('[data-vcard]')).map((el) => ({
    el, vid: el.querySelector<HTMLVideoElement>('video')!, src: el.dataset.video || '', failed: !el.dataset.video, cx: 0, vis: 0, started: false,
  }));
  if (!cards.length) return { scale: () => 1, destroy() {} };

  let active: Card | null = null;
  let last: Card | null = null;
  let t0 = 0;
  let visible = true;
  let target = 1, scale = 1;
  let pitch = 300;

  const hasSrc = (c: Card) => c.vid?.hasAttribute('src');
  const unload = (c: Card) => {
    if (!c.vid || !hasSrc(c) || c === active) return;
    c.vid.removeAttribute('src'); c.vid.load();
    c.el.classList.remove('is-loading', 'is-playing'); c.started = false;
  };
  const load = (c: Card, mode: 'auto' | 'metadata') => {
    if (slow || c.failed || !c.vid) return;
    c.vid.preload = mode;
    if (!hasSrc(c)) { c.el.classList.add('is-loading'); c.vid.src = c.src; }
  };
  const fail = (c: Card) => {
    if (c.failed) return;
    c.failed = true;
    c.el.classList.remove('is-loading', 'is-playing'); c.el.classList.add('is-failed');
    c.vid?.remove();
    if (active === c) endDwell();
  };

  cards.forEach((c) => {
    const v = c.vid;
    if (!v) return;
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('muted', '');
    v.addEventListener('loadeddata', () => c.el.classList.remove('is-loading'));
    v.addEventListener('playing', () => { c.started = true; c.el.classList.remove('is-loading'); if (active === c) c.el.classList.add('is-playing'); });
    v.addEventListener('ended', () => { if (active === c) endDwell(); });
    v.addEventListener('error', () => fail(c));
  });

  const startDwell = (c: Card) => {
    active = c; t0 = performance.now(); c.started = false;
    if (c.failed || slow || !c.vid) return;
    load(c, 'auto');
    const v = c.vid;
    const go = () => {
      try { v.currentTime = 0; } catch { /* metadata not ready yet; it starts at 0 anyway */ }
      v.loop = false;
      const p = v.play();
      if (p) p.catch((err: DOMException) => {
        // Autoplay refused or interrupted: keep the poster (AbortError just means we paused it ourselves).
        if (err?.name === 'NotAllowedError') c.failed = true;
      });
    };
    if (visible) go();
  };
  const endDwell = () => {
    if (!active) return;
    const c = active;
    c.vid?.pause();
    c.el.classList.remove('is-playing');
    last = c; active = null;
  };

  // 12 Hz: measure where the cards are, run the dwell state machine, warm/unload videos.
  const FOCUS = () => innerWidth * (o.mobile ? 0.5 : 0.6);
  let acc = 0;
  const step = () => {
    cards.forEach((c) => {
      const r = c.el.getBoundingClientRect();
      c.cx = r.left + r.width / 2;
      // fraction of the card that is actually on screen (the strip is a sliver above the fold at first)
      const vh = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0), vw = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
      c.vis = vh > 0 && vw > 0 ? (vh * vw) / (r.width * r.height) : 0;
    });
    const f = FOCUS();
    if (cards.length > 1) pitch = Math.max(120, Math.abs(cards[1].cx - cards[0].cx)) || pitch;

    if (active) {
      target = 0.015; // park on the active card
      const c = active, v = c.vid;
      const moved = Math.abs(f - c.cx) > pitch * 0.7 || c.vis < 0.15; // the user scrolled it away
      if (c.failed || slow || !v) { if (performance.now() - t0 > POSTER_DWELL) endDwell(); }
      else if (moved) endDwell();
      else if (!c.started) {
        if (performance.now() - t0 > START_TIMEOUT) { fail(c); }
      } else if (visible) {
        const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : CAP;
        const want = clamp(dur, MIN, CAP);
        if (dur < MIN) v.loop = true;           // very short clip: loop until MIN
        if (v.currentTime >= want - 0.05 || performance.now() - t0 > (want + 8) * 1000) endDwell();
      }
    } else {
      // The next card is the one with the smallest gap still ahead of the focus point (the strip moves right).
      if (last && f - last.cx > pitch * 0.4) last = null; // the previous card has moved on
      let next: Card | null = null, nd = Infinity;
      const ahead: { c: Card; d: number }[] = [];
      cards.forEach((c) => {
        if (c === last) return;
        const d = f - c.cx;
        if (d > -pitch * 0.06) { ahead.push({ c, d }); if (d < nd) { nd = d; next = c; } }
      });
      ahead.sort((a, b) => a.d - b.d);
      const next2 = next as Card | null;
      // Only park on / load a card when enough of it is on screen; otherwise the strip just keeps drifting.
      const seen = !!next2 && next2.vis >= SEEN;
      if (next2 && seen) {
        // ease into the card: fast while it is far, almost still as it reaches the focus point
        target = 0.04 + 1.9 * smooth(clamp(nd / (pitch * 0.85), 0, 1));
        if (nd <= 8 && visible) startDwell(next2);
      } else target = 1;
      // warm: the next card fully, the one after it metadata only; everything else is released
      const warmA = seen ? ahead[0]?.c : undefined, warmB = seen ? ahead[1]?.c : undefined;
      cards.forEach((c) => { if (c !== warmA && c !== warmB && c !== active) unload(c); });
      if (warmA) load(warmA, 'auto');
      if (warmB) load(warmB, 'metadata');
    }
  };

  const tick = (_t: number, dt: number) => {
    acc += dt;
    if (acc >= 83) { acc = 0; if (visible) step(); }
    scale += (target - scale) * (1 - Math.exp(-dt / 1000 * 5));
  };
  gsap.ticker.add(tick);

  const st = ScrollTrigger.create({
    trigger: o.hero, start: 'top bottom', end: 'bottom top',
    onToggle: (s) => {
      visible = s.isActive;
      if (!active?.vid) return;
      if (visible) active.vid.play().catch(() => {}); else active.vid.pause();
    },
  });
  const onVis = () => { if (!active?.vid) return; if (document.hidden) active.vid.pause(); else if (visible) active.vid.play().catch(() => {}); };
  document.addEventListener('visibilitychange', onVis);

  return {
    scale: () => scale,
    destroy() {
      gsap.ticker.remove(tick); st.kill(); document.removeEventListener('visibilitychange', onVis);
      cards.forEach((c) => { c.vid?.pause(); if (c.vid && hasSrc(c)) { c.vid.removeAttribute('src'); c.vid.load(); } });
    },
  };
}
