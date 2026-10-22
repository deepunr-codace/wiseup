// Pushes the generated WordPress templates + assets straight to the live site via the CodeAce
// Deploy plugin's REST endpoint, skipping manual FTP / File Manager copying.
// Requires the "codeace-deploy" plugin (wordpress-plugin/codeace-deploy/) installed + activated,
// and CODEACE_DEPLOY_KEY defined in wp-config.php (see that plugin's header comment).
// Usage:
//   npm run build && node scripts/gen-wp-template.mjs && node scripts/deploy-wp.mjs
// Env vars required:
//   WISEUP_WP_URL        e.g. https://wordpress-1316473-6573883.cloudwaysapps.com
//   CODEACE_DEPLOY_KEY    the same secret defined as CODEACE_DEPLOY_KEY in wp-config.php
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('..'); // the project folder one level above wiseup-site/
const ZIP = path.join(ROOT, 'wiseup-deploy.zip');
const SITE_URL = process.env.WISEUP_WP_URL;
const KEY = process.env.CODEACE_DEPLOY_KEY;

if (!SITE_URL || !KEY) {
  console.error('Set WISEUP_WP_URL and CODEACE_DEPLOY_KEY environment variables first (see this file\'s header comment).');
  process.exit(1);
}

const candidates = ['template-wiseup-home.php', 'template-wiseup-about.php', 'template-wiseup-contact.php', 'wiseup-assets'];
const files = candidates.filter((f) => existsSync(path.join(ROOT, f)));
if (!files.length) {
  console.error('Nothing to deploy — run "npm run build && node scripts/gen-wp-template.mjs" first.');
  process.exit(1);
}

if (existsSync(ZIP)) rmSync(ZIP);

// Zip with PowerShell (Windows-native, no extra npm deps needed).
const psFiles = files.map((f) => `"${path.join(ROOT, f)}"`).join(',');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${psFiles} -DestinationPath '${ZIP}' -Force"`, { stdio: 'inherit' });

const zipBytes = readFileSync(ZIP);
console.log(`Zipped ${files.length} item(s) -> ${ZIP} (${(zipBytes.length / 1024).toFixed(0)} KB)`);

const form = new FormData();
form.append('file', new Blob([zipBytes], { type: 'application/zip' }), 'wiseup-deploy.zip');

const endpoint = `${SITE_URL.replace(/\/$/, '')}/wp-json/codeace-deploy/v1/deploy`;
console.log(`POSTing to ${endpoint} ...`);
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'X-CodeAce-Key': KEY },
  body: form,
});
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Deploy failed:', res.status, JSON.stringify(json, null, 2));
  process.exit(1);
}
console.log('Deployed:');
console.log('  written:', json.written?.length ?? 0, 'file(s)');
console.log('  skipped:', json.skipped?.length ?? 0, 'entries (blocked by the plugin\'s whitelist)');
if (json.skipped?.length) console.log('    ', json.skipped.join(', '));
rmSync(ZIP);
