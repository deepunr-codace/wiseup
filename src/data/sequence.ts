// Frame count of the scroll sequence in public/seq (written by scripts/gen-sequence.ts), read at
// build time. Resolved from process.cwd() (the project root Astro builds from), not import.meta.url:
// Vite/Astro relocates this module into dist/_astro/ during a production build, which would change
// what a relative import.meta.url path resolves against and silently produce 0 frames.
import { readdirSync } from 'node:fs';
import path from 'node:path';

let count = 0;
try {
  const dir = path.join(process.cwd(), 'public', 'seq');
  count = readdirSync(dir).filter((f) => /^f\d{3}\.webp$/.test(f)).length;
} catch {
  count = 0;
}
export const SEQ_FRAMES = count;
