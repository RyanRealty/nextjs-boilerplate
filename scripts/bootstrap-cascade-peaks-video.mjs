#!/usr/bin/env node
/**
 * One-shot setup so `video/cascade-peaks` matches the Cowork VM layout:
 * deps installed, `out/`, `.env` from repo-root `.env.local` (same keys as remotion.config.ts).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const VIDEO_ROOT = path.join(REPO_ROOT, 'video', 'cascade-peaks');
const ROOT_ENV = path.join(REPO_ROOT, '.env.local');
const VIDEO_ENV = path.join(VIDEO_ROOT, '.env');

/** Keep in sync with `video/cascade-peaks/remotion.config.ts` */
function syncGoogleMapsKeyIntoProjectEnv() {
  if (!fs.existsSync(ROOT_ENV)) {
    console.warn(`No ${path.relative(REPO_ROOT, ROOT_ENV)} — Maps tile scenes need it.`);
    return false;
  }
  let remotionKey = '';
  let nextPublicKey = '';
  for (const line of fs.readFileSync(ROOT_ENV, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const eq = s.indexOf('=');
    if (eq < 1) continue;
    const key = s.slice(0, eq).trim();
    let val = s.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key === 'REMOTION_GOOGLE_MAPS_KEY') remotionKey = val;
    if (key === 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY') nextPublicKey = val;
  }
  const key = (remotionKey || nextPublicKey).trim();
  if (!key) {
    console.warn(
      'No REMOTION_GOOGLE_MAPS_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local — 3D tiles may fail.',
    );
    return false;
  }
  fs.writeFileSync(VIDEO_ENV, `REMOTION_GOOGLE_MAPS_KEY=${key}\n`, 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, VIDEO_ENV)}`);
  return true;
}

const REQUIRED_FONTS = ['Amboqia_Boriango.otf', 'AzoSans-Medium.ttf'];

function checkFonts() {
  const missing = REQUIRED_FONTS.filter(
    (f) => !fs.existsSync(path.join(VIDEO_ROOT, 'public', f)),
  );
  if (missing.length) {
    console.warn('\nMissing brand fonts (not in git):');
    for (const f of missing) console.warn(`  - public/${f}`);
    console.warn(
      'Copy from your Cowork `work/cascade_peaks/public/` or brand pack into video/cascade-peaks/public/',
    );
    return false;
  }
  console.log('Brand fonts present in public/');
  return true;
}

function main() {
  if (!fs.existsSync(path.join(VIDEO_ROOT, 'package.json'))) {
    console.error(`Expected Remotion project at ${VIDEO_ROOT}`);
    process.exit(1);
  }

  console.log('== Cascade Peaks video — local environment ==\n');

  syncGoogleMapsKeyIntoProjectEnv();
  checkFonts();

  fs.mkdirSync(path.join(VIDEO_ROOT, 'out'), { recursive: true });

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log('\nInstalling dependencies (npm ci)…');
  const r = spawnSync(npm, ['ci'], { cwd: VIDEO_ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('npm ci failed — try: cd video/cascade-peaks && npm install');
    process.exit(r.status ?? 1);
  }

  console.log(`
Done. From repo root:

  npm run video:cascade-peaks:studio   # Remotion Studio
  npm run video:cascade-peaks:render # full MP4 → video/cascade-peaks/out/cascade_peaks_raw.mp4

See video/cascade-peaks/README.md for Cowork ↔ Mac parity.
`);
}

main();
