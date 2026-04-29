// Render 15 quality-test stills (5 locations × 3 altitudes) of Google
// Photorealistic 3D Tiles around Bend, OR plus a high-coverage reference.
//
// Bundles once, then loops `renderStill` against the same bundle so each
// frame only pays the tile-streaming cost (the bundle build is ~30s).
//
// Output: video/cascade-peaks/out/quality-test/<slug>__<altitude>m.png

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';

const require = createRequire(import.meta.url);

// Resolve env from local .env (Maps key) — Remotion bundler reads
// process.env.REMOTION_* automatically when --env-file is passed; here we just
// load both keys into process.env before bundling.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, '.env');
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const eq = s.indexOf('=');
    if (eq < 1) continue;
    const k = s.slice(0, eq).trim();
    let v = s.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}
if (!process.env.REMOTION_GOOGLE_MAPS_KEY) {
  process.env.REMOTION_GOOGLE_MAPS_KEY =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
}

// Ground elevation (meters above WGS84 ellipsoid) per location. Without this
// the EastNorthUpFrame origin sits at sea level and any camera below the
// terrain elevation renders a blank frame (camera is underground).
// Bend, OR sits ~1100m, varying by 10–40m within town. SF Embarcadero ~3m.
const LOCATIONS = [
  {
    slug: 'downtown_bend_drake_park',
    label: 'Downtown Bend — Drake Park / Mirror Pond',
    lat: 44.0588,
    lon: -121.3153,
    azimuthDeg: 0,
    groundElevationM: 1104,
  },
  {
    slug: 'old_mill_district',
    label: 'Old Mill District',
    lat: 44.0498,
    lon: -121.3163,
    azimuthDeg: 0,
    groundElevationM: 1105,
  },
  {
    slug: 'century_west',
    label: 'Century West (off Century Dr.)',
    lat: 44.0567,
    lon: -121.3525,
    azimuthDeg: 90,
    groundElevationM: 1140,
  },
  {
    slug: 'north_point_ne_bend',
    label: 'North Point / NE Bend',
    lat: 44.095,
    lon: -121.287,
    azimuthDeg: 180,
    groundElevationM: 1113,
  },
  {
    slug: 'sf_ferry_building_reference',
    label: 'SF Ferry Building (high-coverage reference)',
    lat: 37.7955,
    lon: -122.3937,
    azimuthDeg: 270,
    groundElevationM: 3,
  },
];

const ALTITUDES = [
  { label: 'street', meters: 90 },
  { label: 'mid', meters: 500 },
  { label: 'high', meters: 1500 },
];

const OUT_DIR = path.join(__dirname, 'out', 'quality-test');
fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('[bundle] starting…');
const t0 = Date.now();
const serveUrl = await bundle({
  entryPoint: path.join(__dirname, 'src', 'index.ts'),
  webpackOverride: (config) => {
    const esbuildLoader = require.resolve(
      '@remotion/bundler/dist/esbuild-loader/index.js',
    );
    const esbuild = require('esbuild');
    return {
      ...config,
      module: {
        ...config.module,
        rules: [
          ...(config.module?.rules ?? []),
          {
            test: /\.jsx$/,
            include: /node_modules\/3d-tiles-renderer/,
            use: [
              {
                loader: esbuildLoader,
                options: {
                  target: 'chrome85',
                  loader: 'jsx',
                  implementation: esbuild,
                  remotionRoot: __dirname,
                },
              },
            ],
          },
        ],
      },
    };
  },
});
console.log(`[bundle] done in ${(Date.now() - t0) / 1000}s — ${serveUrl}`);

let renderedCount = 0;
let failedCount = 0;
const totalCount = LOCATIONS.length * ALTITUDES.length;

for (const loc of LOCATIONS) {
  for (const alt of ALTITUDES) {
    const outFile = path.join(
      OUT_DIR,
      `${loc.slug}__${String(alt.meters).padStart(4, '0')}m.png`,
    );
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 50_000) {
      console.log(
        `[skip] ${loc.slug} ${alt.label} (${alt.meters}m) — already rendered`,
      );
      renderedCount += 1;
      continue;
    }
    console.log(
      `\n[render ${renderedCount + 1}/${totalCount}] ${loc.label} @ ${alt.meters}m (${alt.label})`,
    );
    const tStart = Date.now();
    try {
      const envVariables = {
        REMOTION_GOOGLE_MAPS_KEY: process.env.REMOTION_GOOGLE_MAPS_KEY ?? '',
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      };
      const composition = await selectComposition({
        serveUrl,
        id: 'TilesStill',
        envVariables,
        inputProps: {
          lat: loc.lat,
          lon: loc.lon,
          altitudeM: alt.meters,
          groundElevationM: loc.groundElevationM,
          azimuthDeg: loc.azimuthDeg,
          fov: 45,
          pitchDeg: 30,
        },
      });
      await renderStill({
        composition,
        serveUrl,
        output: outFile,
        envVariables,
        inputProps: {
          lat: loc.lat,
          lon: loc.lon,
          altitudeM: alt.meters,
          groundElevationM: loc.groundElevationM,
          azimuthDeg: loc.azimuthDeg,
          fov: 45,
          pitchDeg: 30,
        },
        imageFormat: 'png',
        chromiumOptions: { gl: 'angle' },
        timeoutInMilliseconds: 240_000,
        overwrite: true,
      });
      const dt = ((Date.now() - tStart) / 1000).toFixed(1);
      const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(0);
      console.log(`  ✓ ${dt}s  ${sizeKb}KB  ${outFile}`);
      renderedCount += 1;
    } catch (err) {
      const dt = ((Date.now() - tStart) / 1000).toFixed(1);
      console.error(`  ✗ ${dt}s  FAILED: ${err.message ?? err}`);
      failedCount += 1;
    }
  }
}

console.log(
  `\n[done] ${renderedCount}/${totalCount} rendered (${failedCount} failed) in ${
    (Date.now() - t0) / 1000
  }s`,
);
process.exit(failedCount > 0 ? 1 : 0);
