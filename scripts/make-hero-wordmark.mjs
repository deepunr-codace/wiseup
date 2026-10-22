// Generates the hero wordmark as an inline-ready SVG: one <path> per letter (so the entrance
// animation in motion/main.ts can stagger them individually), plus a duplicate "sheen" layer
// (same glyph outlines, a moving bright gradient, blend-mode screen in site.css) for the
// light-sweep highlight that plays once the letters have settled.
// Font: Switzer Semibold (Fontshare) — a neutral, standard-premium grotesk (closest free
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
const FONT_FILE = 'Switzer-Semibold.ttf';
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

const letterPaths = letters.map(
  (l) => `<path class="hero-logo__ch" data-ch="${l.ch}" d="${commandsToPath(l.commands, l.x + dx0, dy0)}"/>`,
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
<stop stop-color="white"/>
<stop offset="1" stop-color="#999999"/>
</linearGradient>
<linearGradient id="hero-logo-sheen" x1="${-sheenW}" y1="${mid}" x2="0" y2="${mid}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#fff" stop-opacity="0"/>
<stop offset="0.5" stop-color="#fff" stop-opacity="0.95"/>
<stop offset="1" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
</defs>
<g class="hero-logo__chars" fill-rule="evenodd" clip-rule="evenodd" fill="url(#hero-logo-fill)">
${letterPaths.join('\n')}
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
