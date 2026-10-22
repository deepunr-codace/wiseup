// About page, v2. Quiet on purpose: the left column's index marks the block in view, and the three
// numbers count up to their real values once. Text and blocks use the engine's data-split and
// data-reveal. Everything runs inside onPage() on the GSAP clock.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, ease, prefersReducedMotion } from '../engine';

gsap.registerPlugin(ScrollTrigger);

export function setupAbout() {
  aboutIndex();
  aboutCounters();
}

/* Index: the link for the block crossing the middle of the screen is current, and a single
   mark glides down to sit beside it (one moving part, not five painted states). */
function aboutIndex() {
  onPage(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-ix]')];
    if (!links.length) return;
    const mark = document.querySelector<HTMLElement>('[data-ix-mark]');
    const set = (a: HTMLAnchorElement | null) => {
      links.forEach((l) => {
        l.classList.toggle('is-current', l === a);
        if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
      });
      if (mark && a) { mark.style.transform = `translateY(${a.offsetTop + 7}px)`; mark.classList.add('is-active'); }
    };
    links.forEach((a) => {
      const sec = document.getElementById(a.dataset.ix!);
      if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => s.isActive && set(a) });
    });
  });
}

/* Numbers count up once as they scroll in. The final values are in the HTML for no-JS. */
function aboutCounters() {
  onPage(() => {
    if (prefersReducedMotion()) return;
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, {
        v: target, duration: 1.6, ease: ease.out,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: () => { el.textContent = String(Math.round(o.v)); },
      });
    });
  });
}
