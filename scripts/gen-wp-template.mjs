// Generates template-wiseup-{home,about,contact}.php from the current production build (dist/),
// following the project's established WordPress conventions: fully self-contained (no
// get_header/get_footer), wp_head()/wp_footer() hooked in for plugin compatibility, every bare-tag
// selector scoped to .wiseup-home AND wrapped in :where() so it can neither leak onto the theme's
// own markup nor outrank one of our own component rules. All three pages share one scoped
// stylesheet/script (same design system) and one asset folder — only the body markup, title and
// meta description differ per page.
// Usage: npm run build && node scripts/gen-wp-template.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('..'); // the project folder one level above wiseup-site/
const DIST = path.resolve('dist');
const OUT_ASSETS = path.join(ROOT, 'wiseup-assets'); // copy this whole folder, as-is, into the theme

// ---------- 1. CSS: concatenate the readable sources (not the minified bundle) and scope every
// risky bare-tag reset selector in base.css/tokens.css to .wiseup-home, so none of it can leak onto
// the WP theme, admin bar, or any other plugin-injected chrome sharing the page outside our own
// markup — and wrap every one of those in :where() so it also can't outrank one of our own
// single-class component rules by specificity. Shared verbatim across all three generated pages. --
let tokens = readFileSync('src/styles/tokens.css', 'utf8');
let base = readFileSync('src/styles/base.css', 'utf8');
const site = readFileSync('src/styles/site.css', 'utf8');

// Matched by the SELECTOR list only, not the declarations inside { }, so editing base.css's rules
// later can't silently break this scoping the way an exact-string match on the whole rule once did.
const RISKY_SELECTORS = ['*', 'html', 'body', 'img, svg, video', 'img', 'input, button, textarea, select', 'button', 'a', 'ul, ol', 'h1, h2, h3, h4', 'p'];
// The <html> element itself can't carry our class (WordPress only lets a template add body classes),
// so "our html" is the html whose body is ours. Its rules (background, scroll-padding-top for anchor
// links under the fixed header) must land on <html>, the scroll container; on <body> they do nothing.
const OUR_HTML = ':where(html:has(> body.wiseup-home))';
const scopeSelector = (sel) => sel.split(',').map((s) => {
  s = s.trim();
  return s === 'body' ? 'body:where(.wiseup-home)' : s === 'html' ? OUR_HTML : `:where(.wiseup-home) ${s}`;
}).join(', ');
const scopeBase = (css) => {
  // Includes our <body> itself, or it keeps the browser's default 8px margin: a frame of the theme's
  // background around the whole page.
  let out = css.replace(/^\* \{ margin: 0; \}$/m, ':where(.wiseup-home), :where(.wiseup-home) * { margin: 0; }');
  for (const sel of RISKY_SELECTORS) {
    if (sel === '*') continue; // handled above (margin reset); *::before/*::after below are separate selectors
    const re = new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'm');
    out = out.replace(re, `${scopeSelector(sel)} {`);
  }
  // The two remaining universal rules (*, *::before, *::after { ... }).
  out = out.replace(/^\*, \*::before, \*::after \{ box-sizing: border-box; \}$/m,
    ':where(.wiseup-home), :where(.wiseup-home) *, :where(.wiseup-home) *::before, :where(.wiseup-home) *::after { box-sizing: border-box; }');
  out = out.replace(/^\*, \*::before, \*::after \{ border: 0; background: none; box-shadow: none; \}$/m,
    ':where(.wiseup-home), :where(.wiseup-home) *, :where(.wiseup-home) *::before, :where(.wiseup-home) *::after { border: 0; background: none; box-shadow: none; }');
  return out;
};
base = scopeBase(base);
// tokens.css only defines custom-property values (no bare-tag selectors) — safe to keep as-is,
// except its two root blocks, which we also scope so page-specific tokens never leak site-wide.
// Tokens sit on our <html> (so the html background rule above can read var(--bg)), and on our body
// too as a fallback for the rare browser without :has().
tokens = tokens.replace(/^:root \{/m, `${OUR_HTML}, :where(.wiseup-home) {`).replace(/^\[data-mood='day'\] \{/m, ":where(.wiseup-home) [data-mood='day'] {");

const css = `/* ===== tokens ===== */\n${tokens}\n/* ===== base (scoped to .wiseup-home) ===== */\n${base}\n/* ===== components ===== */\n${site}`;

// ---------- 2. JS: the compiled module bundle, inlined verbatim. Identical on every page. ----------
const jsFile = readdirSync(path.join(DIST, '_astro')).find((f) => f.startsWith('Base.astro_astro_type_script'));
const js = readFileSync(path.join(DIST, '_astro', jsFile), 'utf8');

const ASSET_BASE = "<?php echo get_template_directory_uri(); ?>/wiseup-assets";
const rewriteAssetPaths = (body) => body
  .replace(/(src|srcset|data-seq-base)="\/(_astro|process|seq)\//g, (_, attr, dir) => `${attr}="${ASSET_BASE}/${dir}/`)
  .replace(/srcset="([^"]+)"/g, (m, val) => `srcset="${val.replace(/(?<=,\s*)\/(_astro|process|seq)\//g, (_, dir) => `${ASSET_BASE}/${dir}/`)}"`);

// ---------- 3. One PHP file per page. ----------
const PAGES = [
  {
    slug: 'home', distDir: '.', outFile: 'template-wiseup-home.php', templateName: 'WiseUp Home',
    title: 'Branding &amp; Marketing Agency in Kerala (Kozhikode) | WiseUp',
    description: 'WiseUp is a branding and digital marketing agency in Kozhikode (Calicut), Kerala, serving brands across India and the Middle East.',
  },
  {
    slug: 'about', distDir: 'about', outFile: 'template-wiseup-about.php', templateName: 'WiseUp About',
    // Page-only stylesheet, imported by about.astro alone. All class-based (no bare-tag rules), so
    // it is inlined as-is after the shared CSS, in the same order Astro loads it.
    extraCss: ['src/styles/about.css'],
    title: 'About Us | WiseUp',
    description: "We are a brand strategy agency and digital marketing agency in Kozhikode, Kerala: AI-integrated and technologically advanced, yet deeply human.",
  },
  {
    slug: 'contact', distDir: 'contact', outFile: 'template-wiseup-contact.php', templateName: 'WiseUp Contact',
    title: 'Contact Us | WiseUp',
    description: "Tell us where you want your brand to go. We'll send the plan before we talk numbers.",
  },
];

for (const page of PAGES) {
  const htmlPath = path.join(DIST, page.distDir, 'index.html');
  if (!existsSync(htmlPath)) { console.warn(`Skipping ${page.slug}: ${htmlPath} not found (run "npm run build" first)`); continue; }
  const html = readFileSync(htmlPath, 'utf8');
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  if (!bodyMatch) throw new Error(`Could not find <body> in ${htmlPath}`);
  let body = bodyMatch[1];
  // Drop the trailing module-script tag; we inline the JS ourselves below instead.
  body = body.replace(/<script type="module" src="[^"]+"><\/script>\s*$/, '');
  body = rewriteAssetPaths(body);
  const leftover = body.match(/(?:src|srcset|href)="\/(?!\/|#|about|contact|$)[^"]*\.(?:webp|jpe?g|png|svg|avif|js|css|woff2)"/g);
  if (leftover) console.warn(`  ${page.slug}: root-relative asset paths left unrewritten: ${[...new Set(leftover)].slice(0, 5).join(', ')}`);

  // Title and description come from the built page, so they always match the Astro source;
  // the PAGES values are only a fallback.
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || page.title;
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || page.description;
  const pageCss = (page.extraCss || []).map((f) => `/* ===== ${path.basename(f)} (this page only) ===== */\n${readFileSync(f, 'utf8')}`).join('\n');

  const php = `<?php
/**
 * Template Name: ${page.templateName}
 * Template Post Type: page
 *
 * Fully self-contained ${page.slug} page template, generated from the project's Astro build
 * (wiseup-site/) on ${new Date().toISOString().slice(0, 10)}. Deliberately does NOT call
 * get_header()/get_footer() so none of the active theme's markup, nav or styles leak into this
 * page — only wp_head() / wp_footer() are hooked in, for plugin/script compatibility (analytics,
 * SEO meta, admin bar, etc). No global/bare-tag CSS at all: every reset in the stylesheet below is
 * scoped to .wiseup-home AND wrapped in :where() (zero specificity), so it can neither apply
 * outside our own markup nor outrank one of our own component rules.
 *
 * Install:
 *  1. Copy this file into your active theme's root folder.
 *  2. Copy the whole "wiseup-assets" folder (found next to this file in the project: images,
 *     fonts, the flame sequence, process backgrounds) into your active theme's root folder too,
 *     so it sits right next to this template file (theme-root/wiseup-assets/...). One shared
 *     folder serves all three WiseUp templates (home/about/contact) — copy it once.
 *  3. In wp-admin, open the ${page.slug === 'home' ? 'homepage' : page.slug + ' page'}, set Page
 *     Attributes -> Template -> "${page.templateName}".
 *  4. Give the page the slug "${page.slug === 'home' ? '' : page.slug}"${page.slug === 'home' ? ' (the site root)' : ''}
 *     — the header nav and the in-page links (/#about, /#contact, /about, /contact) assume the
 *     WiseUp Home template is published at the site root and About/Contact at /about/ and
 *     /contact/. If your site structure differs, update those hrefs in the Astro source and
 *     regenerate.
 *
 * Regenerate: run "npm run build && node scripts/gen-wp-template.mjs" inside wiseup-site/ after
 * any change to the Astro site, then redo step 1 for every page that changed (all three share one
 * stylesheet/script, so a global CSS change touches all three output files) — step 2 only if asset
 * filenames changed (they're content-hashed, so most content edits don't touch them).
 *
 * Note: title/meta description below are hardcoded by design, and we remove WordPress core's own
 * default <title> (the title-tag theme-support hook) just before wp_head() runs, so there is only
 * ever one <title> on the page — ours. If an SEO plugin (Yoast/RankMath/etc) is active, it likely
 * hooks its own <title>/meta description onto wp_head() too; in that case remove the
 * remove_action() line and the two hardcoded tags below, and let the plugin manage them instead.
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<?php remove_action( 'wp_head', '_wp_render_title_tag', 1 ); wp_head(); ?>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="icon" href="<?php echo get_template_directory_uri(); ?>/wiseup-assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="<?php echo get_template_directory_uri(); ?>/wiseup-assets/fonts/inter-300_700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="<?php echo get_template_directory_uri(); ?>/wiseup-assets/fonts/outfit-200_500-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>
document.documentElement.classList.add('js');
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');
</script>
<style>
${(pageCss ? `${css}\n${pageCss}` : css).replace(/url\((['"]?)\/fonts\//g, (_, q) => `url(${q}<?php echo get_template_directory_uri(); ?>/wiseup-assets/fonts/`)}
</style>
</head>
<body <?php body_class( 'wiseup-home' ); ?>>
${body}
<script type="module">
${js}
</script>
<?php wp_footer(); ?>
</body>
</html>
`;

  const outPath = path.join(ROOT, page.outFile);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, php);
  console.log(`Wrote ${outPath} (${(php.length / 1024).toFixed(0)} KB)`);
}

// ---------- 4. Copy the static asset folders the rewritten paths point at (shared by all pages). --
mkdirSync(OUT_ASSETS, { recursive: true });
// _astro files are content-hashed, so every build leaves the previous ones behind; start clean so the
// folder only holds what the current templates reference.
rmSync(path.join(OUT_ASSETS, '_astro'), { recursive: true, force: true });
cpSync(path.join(DIST, '_astro'), path.join(OUT_ASSETS, '_astro'), { recursive: true });
cpSync(path.join(DIST, 'process'), path.join(OUT_ASSETS, 'process'), { recursive: true });
cpSync(path.join(DIST, 'seq'), path.join(OUT_ASSETS, 'seq'), { recursive: true });
mkdirSync(path.join(OUT_ASSETS, 'fonts'), { recursive: true });
cpSync('public/fonts', path.join(OUT_ASSETS, 'fonts'), { recursive: true });
cpSync('public/favicon.svg', path.join(OUT_ASSETS, 'favicon.svg'));
console.log(`Copied assets to ${OUT_ASSETS}`);
