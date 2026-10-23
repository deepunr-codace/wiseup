// YouTube video as a section backdrop (muted, looping, no controls, cover-fit). The iframe is only created when
// the section is about a screen away, fades in over the existing canvas backdrop once it loads, and is paused
// through the IFrame API (postMessage) whenever the section is off screen, so it never plays in the background.
// Data-saver / slow connections and reduced motion keep the canvas only.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, prefersReducedMotion } from '../engine';

export function ytBackdrop() {
  onPage(() => {
    const host = document.querySelector<HTMLElement>('[data-yt]');
    const id = host?.dataset.yt;
    if (!host || !id || prefersReducedMotion()) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$|3g/.test(conn?.effectiveType ?? '')) return;

    let frame: HTMLIFrameElement | null = null;
    let visible = false;
    const cmd = (func: string) => frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
    const create = () => {
      if (frame) return;
      frame = document.createElement('iframe');
      const q = new URLSearchParams({
        autoplay: '1', mute: '1', controls: '0', loop: '1', playlist: id, playsinline: '1', modestbranding: '1', rel: '0',
        disablekb: '1', iv_load_policy: '3', fs: '0', enablejsapi: '1', origin: location.origin,
      });
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?${q}`;
      frame.title = 'Background video';
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.allow = 'autoplay; encrypted-media';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      // Fade in only once the player itself reports "playing" (state 1); a blocked or failed player stays invisible
      // and the flame underneath remains the backdrop.
      frame.addEventListener('load', () => frame?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'));
      host.appendChild(frame);
    };
    const onMsg = (e: MessageEvent) => {
      if (!frame || e.source !== frame.contentWindow || typeof e.data !== 'string') return;
      let d: { event?: string; info?: { playerState?: number } | number; data?: number };
      try { d = JSON.parse(e.data); } catch { return; }
      const state = d.event === 'onStateChange' ? d.data : d.event === 'infoDelivery' && typeof d.info === 'object' ? d.info?.playerState : undefined;
      if (state === 1) { host.classList.add('is-on'); if (!visible) cmd('pauseVideo'); }
    };
    addEventListener('message', onMsg);
    const near = ScrollTrigger.create({ trigger: host, start: 'top bottom+=100%', once: true, onEnter: create });
    const view = ScrollTrigger.create({
      trigger: host, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { visible = s.isActive; cmd(visible ? 'playVideo' : 'pauseVideo'); },
    });
    return () => { removeEventListener('message', onMsg); near.kill(); view.kill(); frame?.remove(); host.classList.remove('is-on'); };
  });
}
