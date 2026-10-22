// Generates the hero wordmark as an inline-ready SVG: one <path> per letter (so the entrance
// animation in motion/main.ts can stagger them individually), plus a duplicate "sheen" layer
// (same glyph outlines, a moving bright gradient, blend-mode screen in site.css) for the
// light-sweep highlight that plays once the letters have settled.
// Font: Switzer Medium (Fontshare; was Semibold, lightened on request) — a neutral, standard-premium grotesk (closest free
// alternative to Neue Montreal/Suisse), picked after two swings that didn't land: Clash Display
// Bold read as too heavy/shouty, Permanent Marker (matching the header logo's brush script) read
// as unpolished. Switzer is deliberately the safe, confident choice. See CLAUDE.md for the full
// font history.
// Usage: node scripts/make-hero-wordmark.mjs
import opentype from 'opentype.js';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TEXT = 'wiseup';
const FONT_FILE = 'Switzer-Medium.ttf';
const FONT_ZIP_URL = 'https://api.fontshare.com/v2/fonts/download/switzer';
const FONT_SIZE = 200;
const PAD_X = 16;
const PAD_Y = 20;
const GAP_TIGHTEN = 0.28; // fraction of natural whitespace between letters to remove
const OUT_PATH = path.join('public', 'brand', 'hero-wiseup-logo-big.svg');

// Minimal ZIP reader (central directory + deflate/store entries only — all Node needs is
// zlib.inflateRawSync, no extra dependency) so this script is reproducible without a manual
// "download and extract the font by hand" step.
function readZipEntry(zipBuf, entryPathSuffix) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = zipBuf.length - 22; i >= 0; i--) {
    if (zipBuf.readUInt32LE(i) === eocdSig) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('Not a valid zip (no EOCD record)');
  const cdOffset = zipBuf.readUInt32LE(eocd + 16);
  const cdEntries = zipBuf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (zipBuf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad central directory entry');
    const method = zipBuf.readUInt16LE(p + 10);
    const compSize = zipBuf.readUInt32LE(p + 20);
    const nameLen = zipBuf.readUInt16LE(p + 28);
    const extraLen = zipBuf.readUInt16LE(p + 30);
    const commentLen = zipBuf.readUInt16LE(p + 32);
    const localOffset = zipBuf.readUInt32LE(p + 42);
    const name = zipBuf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name.endsWith(entryPathSuffix)) {
      const lNameLen = zipBuf.readUInt16LE(localOffset + 26);
      const lExtraLen = zipBuf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const raw = zipBuf.subarray(dataStart, dataStart + compSize);
      return method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`"${entryPathSuffix}" not found in zip`);
}

async function getFont() {
  const cachePath = path.join(process.env.TEMP || '/tmp', FONT_FILE);
  if (!fs.existsSync(cachePath)) {
    const zipBuf = Buffer.from(await fetch(FONT_ZIP_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then((r) => r.arrayBuffer()));
    const ttf = readZipEntry(zipBuf, `WEB/fonts/${FONT_FILE}`);
    fs.writeFileSync(cachePath, ttf);
  }
  const buf = fs.readFileSync(cachePath);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function commandsToPath(commands, dx, dy) {
  const f = (n) => Number((n + 0).toFixed(2));
  return commands
    .map((c) => {
      switch (c.type) {
        case 'M': return `M${f(c.x + dx)} ${f(c.y + dy)}`;
        case 'L': return `L${f(c.x + dx)} ${f(c.y + dy)}`;
        case 'C': return `C${f(c.x1 + dx)} ${f(c.y1 + dy)} ${f(c.x2 + dx)} ${f(c.y2 + dy)} ${f(c.x + dx)} ${f(c.y + dy)}`;
        case 'Q': return `Q${f(c.x1 + dx)} ${f(c.y1 + dy)} ${f(c.x + dx)} ${f(c.y + dy)}`;
        case 'Z': return 'Z';
        default: throw new Error(`Unsupported path command ${c.type}`);
      }
    })
    .join('');
}

function bboxOf(commands, dx = 0) {
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  for (const c of commands) {
    for (const [xk, yk] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
      if (typeof c[xk] !== 'number' || typeof c[yk] !== 'number') continue;
      x1 = Math.min(x1, c[xk] + dx); x2 = Math.max(x2, c[xk] + dx);
      y1 = Math.min(y1, c[yk]); y2 = Math.max(y2, c[yk]);
    }
  }
  return { x1, x2, y1, y2 };
}

const font = await getFont();
const scale = (1 / font.unitsPerEm) * FONT_SIZE;

// Pass 1: natural advance-width placement, per-letter commands kept separate (each glyph's own
// command list already isolates its own contours, so no cross-letter M-splitting is needed).
let advanceX = 0;
const letters = [...TEXT].map((ch) => {
  const g = font.charToGlyph(ch);
  const commands = g.getPath(0, 0, FONT_SIZE).commands;
  const letter = { ch, commands, x: advanceX, bbox: bboxOf(commands, advanceX) };
  advanceX += (g.advanceWidth || 0) * scale;
  return letter;
});

// Pass 2: close up the natural whitespace between letters by GAP_TIGHTEN, cumulatively.
let shift = 0;
for (let i = 0; i < letters.length; i++) {
  if (i > 0) {
    const gap = letters[i].bbox.x1 - letters[i - 1].bbox.x2;
    shift += gap * GAP_TIGHTEN;
  }
  letters[i].x -= shift;
  letters[i].bbox.x1 -= shift;
  letters[i].bbox.x2 -= shift;
}

const bbox = {
  x1: Math.min(...letters.map((l) => l.bbox.x1)),
  x2: Math.max(...letters.map((l) => l.bbox.x2)),
  y1: Math.min(...letters.map((l) => l.bbox.y1)),
  y2: Math.max(...letters.map((l) => l.bbox.y2)),
};
const w = Math.ceil(bbox.x2 - bbox.x1 + PAD_X * 2);
const h = Math.ceil(bbox.y2 - bbox.y1 + PAD_Y * 2);
const dx0 = -bbox.x1 + PAD_X;
const dy0 = -bbox.y1 + PAD_Y;

// Palette sampled from the brand swatch strip (teal -> green -> near-black). Smoke blobs use the
// palette as is; the tiny balls use lightened copies so they read against the dark letter base.
const PALETTE = ['#03576a', '#02657a', '#03728c', '#148797', '#278e8b', '#2f857a', '#1d5144', '#235d49', '#15270c'];
const lighten = (hex, t) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
// Deterministic PRNG so re-running the script produces the same art.
let seed = 7;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const between = (a, b) => a + (b - a) * rnd();
const f2 = (n) => Number(n.toFixed(2));

// Smoke blobs + tiny balls live inside each letter, clipped to its glyph. Their motion is CSS
// (.wm-blob / .wm-ball in site.css) driven by the per-element custom properties set here.
function insideLetter(l) {
  const bx1 = l.bbox.x1 + dx0, bx2 = l.bbox.x2 + dx0, by1 = l.bbox.y1 + dy0, by2 = l.bbox.y2 + dy0;
  const bw = bx2 - bx1, bh = by2 - by1;
  const blobs = Array.from({ length: 6 }, () => {
    const r = between(0.32, 0.55) * Math.min(bw, bh);
    return `<circle class="wm-blob" cx="${f2(between(bx1, bx2))}" cy="${f2(between(by1, by2))}" r="${f2(r)}" fill="${PALETTE[Math.floor(rnd() * PALETTE.length)]}" style="--dx:${f2(between(-0.5, 0.5) * bw)}px;--dy:${f2(between(-0.5, 0.5) * bh)}px;--s:${f2(between(0.8, 1.3))};--dur:${f2(between(5, 9))}s;--del:${f2(-between(0, 9))}s"/>`;
  });
  const balls = Array.from({ length: 12 }, () => {
    const c = lighten(PALETTE[1 + Math.floor(rnd() * (PALETTE.length - 3))], 0.35);
    return `<circle class="wm-ball" cx="${f2(between(bx1, bx2))}" cy="${f2(between(by1, by2))}" r="${f2(between(1.4, 3.4))}" fill="${c}" style="--dx:${f2(between(-0.3, 0.3) * bw)}px;--dy:${f2(between(-0.3, 0.3) * bh)}px;--dur:${f2(between(3, 6))}s;--del:${f2(-between(0, 6))}s"/>`;
  });
  return `<g clip-path="url(#wm-clip-${l.ch})"><g class="wm-smoke" filter="url(#wm-blur)">${blobs.join('')}</g><g class="wm-balls">${balls.join('')}</g></g>`;
}

// A small boy sitting on the dot of the "i", head tipped down, looking at the word below him.
// Drawn around (0,0) = the middle of the dot's top edge; CSS (.wm-boy*) swings the legs, nods the
// head and blinks. He lives inside the "i" group, so he bounces with the letter.
function boy(x, y) {
  return `<g class="wm-boy" transform="translate(${f2(x)} ${f2(y)})">
<g class="wm-leg wm-leg--r"><rect x="-4" y="-5" width="16" height="5.2" rx="2.6" fill="#2f3d7a"/><g class="wm-shin"><rect x="8.6" y="-4" width="5.2" height="15" rx="2.6" fill="#2f3d7a"/><ellipse cx="12.8" cy="12" rx="4.4" ry="2.5" fill="#d9d9de"/></g></g>
<g class="wm-leg wm-leg--l"><rect x="-6" y="-5.6" width="16" height="5.2" rx="2.6" fill="#3d4f9a"/><g class="wm-shin"><rect x="5.4" y="-4.6" width="5.2" height="15" rx="2.6" fill="#3d4f9a"/><ellipse cx="9.6" cy="11.4" rx="4.4" ry="2.5" fill="#f4f4f5"/></g></g>
<rect x="-9" y="-22" width="18" height="19" rx="7" fill="#ff8a4c"/>
<path d="M-9 -17 Q-14 -10 -11 -3" stroke="#ff8a4c" stroke-width="4.4" stroke-linecap="round" fill="none"/>
<path d="M9 -17 Q14 -10 11 -3" stroke="#ff8a4c" stroke-width="4.4" stroke-linecap="round" fill="none"/>
<circle cx="-11" cy="-2.4" r="2.4" fill="#f1c9a5"/><circle cx="11" cy="-2.4" r="2.4" fill="#f1c9a5"/>
<g class="wm-head">
<circle cx="0" cy="-31" r="9.5" fill="#f1c9a5"/>
<path d="M-9.6 -32 Q-9 -42 0 -41.5 Q9 -42 9.6 -32 Q4 -36.5 -2 -35.5 Q-6 -35 -9.6 -32Z" fill="#1b1b1f"/>
<g class="wm-eyes"><ellipse cx="-3.6" cy="-29.5" rx="2.1" ry="2.5" fill="#fff"/><ellipse cx="3.6" cy="-29.5" rx="2.1" ry="2.5" fill="#fff"/>
<circle cx="-3.5" cy="-28.4" r="1.2" fill="#1b1b1f"/><circle cx="3.7" cy="-28.4" r="1.2" fill="#1b1b1f"/></g>
<path d="M-2 -24.6 Q0 -23.4 2 -24.6" stroke="#9a5b3c" stroke-width="1" stroke-linecap="round" fill="none"/>
</g>
</g>`;
}

const dotCmds = (() => {
  const i = letters.find((l) => l.ch === 'i').commands;
  const second = i.findIndex((c, k) => k > 0 && c.type === 'M');
  return { first: i.slice(0, second), l: letters.find((l) => l.ch === 'i') };
})();
const dotBox = bboxOf(dotCmds.first, dotCmds.l.x + dx0);
const dotTopY = dotBox.y1 + dy0 + 0.5;

const letterGroups = letters.map((l) => {
  const d = commandsToPath(l.commands, l.x + dx0, dy0);
  return `<g class="hero-logo__ch" data-ch="${l.ch}">
<path d="${d}" fill="url(#hero-logo-fill)"/>
${insideLetter(l)}
${l.ch === 'i' ? boy((dotBox.x1 + dotBox.x2) / 2, dotTopY) : ''}
</g>`;
});
const clipDefs = letters.map(
  (l) => `<clipPath id="wm-clip-${l.ch}"><path clip-rule="evenodd" d="${commandsToPath(l.commands, l.x + dx0, dy0)}"/></clipPath>`,
);
const sheenPaths = letters.map(
  (l) => `<path d="${commandsToPath(l.commands, l.x + dx0, dy0)}"/>`,
);

const mid = (h / 2).toFixed(2);
const sheenW = Math.round(w * 0.3);
const svg = `<svg class="hero__logo hero-logo" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${TEXT}">
<title>${TEXT}</title>
<defs>
<linearGradient id="hero-logo-fill" x1="0" y1="${mid}" x2="${w}" y2="${mid}" gradientUnits="userSpaceOnUse">
<stop stop-color="#04323c"/>
<stop offset="1" stop-color="#0f2a1f"/>
</linearGradient>
<linearGradient id="hero-logo-sheen" x1="${-sheenW}" y1="${mid}" x2="0" y2="${mid}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#fff" stop-opacity="0"/>
<stop offset="0.5" stop-color="#fff" stop-opacity="0.95"/>
<stop offset="1" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<filter id="wm-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
${clipDefs.join('\n')}
</defs>
<g class="hero-logo__chars" fill-rule="evenodd" clip-rule="evenodd">
${letterGroups.join('\n')}
</g>
<g class="hero-logo__sheen" fill-rule="evenodd" clip-rule="evenodd" fill="url(#hero-logo-sheen)" aria-hidden="true">
${sheenPaths.join('\n')}
</g>
</svg>
`;
if (svg.includes('NaN')) throw new Error('Path contains NaN');

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, svg);
console.log({ w, h, letters: letters.map((l) => l.ch), outPath: OUT_PATH });
