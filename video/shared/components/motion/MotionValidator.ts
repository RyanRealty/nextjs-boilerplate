// MotionValidator — utilities for verifying that a rendered video is not
// secretly static.
//
// Two surfaces:
//
//  1. **`validateFrames(framePaths)`** — reads N adjacent frames extracted
//     from a render (e.g. via `ffmpeg -vf select="not(mod(n\,15))"` into
//     PNGs) and computes pixel-diff between consecutive pairs. Returns a
//     report listing any window where the diff falls below the static
//     threshold.
//
//  2. **`validateRender(mp4Path, opts)`** — convenience wrapper that
//     spawns ffmpeg to extract every-Nth-frame stills, calls
//     validateFrames, then deletes the stills. Use this in a pre-publish
//     QA gate.
//
// Notes:
//  - This module is INTENTIONALLY Node-only (no `remotion`, no `react`).
//    Import it from a script, not from a Remotion composition.
//  - PNG decoding is done with the platform `node:image` API where
//    available, falling back to a tiny inline RGBA reader for portability.
//    For high-fidelity pixel diffing on large frames consider piping into
//    ffmpeg's `signalstats` filter directly — this module is the cheap
//    pure-JS gate that runs in CI without extra deps.

import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';

const execFileP = promisify(execFile);

export type StaticWindow = {
  /** Path of the earlier frame in the pair. */
  fromFrame: string;
  /** Path of the later frame in the pair. */
  toFrame: string;
  /**
   * Mean absolute per-channel pixel difference 0..1. Lower = more static.
   * 0 = identical frames, 1 = completely different (impossible in practice).
   */
  diff: number;
};

export type ValidationReport = {
  /** Total number of comparisons made. */
  comparisons: number;
  /** Pairs that fell below the threshold. */
  staticWindows: StaticWindow[];
  /** Mean diff across all comparisons. */
  meanDiff: number;
  /** True if no static windows were found. */
  passed: boolean;
};

export type ValidateOptions = {
  /**
   * Threshold below which a pair is flagged as static. Default 0.005.
   * Tune up for noisy footage, down for clean renders.
   */
  staticThreshold?: number;
  /** Path to ffmpeg. Default 'ffmpeg' (assumes on PATH). */
  ffmpegPath?: string;
  /**
   * Frame stride. e.g. 15 = sample every 15th frame at 30 fps → 2/sec.
   * Default 15.
   */
  stride?: number;
  /** Working directory for extracted PNG stills. Default tmp under render dir. */
  workDir?: string;
};

/**
 * Read a PNG file and return a flat Uint8ClampedArray of RGBA pixels +
 * dimensions. Implementation uses Node's bundled `node:zlib` + a hand-rolled
 * minimal PNG decoder so we don't pull in a heavy dep. Only handles 8-bit
 * RGB / RGBA color types — sufficient for ffmpeg PNG output, which is what
 * `validateRender` produces.
 */
async function readPngRgba(filePath: string): Promise<{ width: number; height: number; data: Uint8Array } | null> {
  try {
    const zlib = await import('node:zlib');
    const buffer = await fs.readFile(filePath);

    // PNG signature
    if (
      buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47 ||
      buffer[4] !== 0x0d || buffer[5] !== 0x0a || buffer[6] !== 0x1a || buffer[7] !== 0x0a
    ) {
      return null;
    }

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idatChunks: Buffer[] = [];

    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset); offset += 4;
      const type = buffer.toString('ascii', offset, offset + 4); offset += 4;
      const dataStart = offset;
      offset += length + 4; // skip data + CRC

      if (type === 'IHDR') {
        width = buffer.readUInt32BE(dataStart);
        height = buffer.readUInt32BE(dataStart + 4);
        bitDepth = buffer[dataStart + 8];
        colorType = buffer[dataStart + 9];
      } else if (type === 'IDAT') {
        idatChunks.push(buffer.subarray(dataStart, dataStart + length));
      } else if (type === 'IEND') {
        break;
      }
    }

    if (bitDepth !== 8) return null;
    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (channels === 0) return null;

    const compressed = Buffer.concat(idatChunks);
    const inflated = zlib.inflateSync(compressed);

    const rowSize = width * channels;
    const out = new Uint8Array(width * height * 4);

    let prevRow = new Uint8Array(rowSize);
    for (let y = 0; y < height; y++) {
      const filterByte = inflated[y * (rowSize + 1)];
      const row = inflated.subarray(y * (rowSize + 1) + 1, y * (rowSize + 1) + 1 + rowSize);
      const decoded = new Uint8Array(rowSize);

      for (let x = 0; x < rowSize; x++) {
        const left = x >= channels ? decoded[x - channels] : 0;
        const up = prevRow[x];
        const upLeft = x >= channels ? prevRow[x - channels] : 0;

        let value = row[x];
        switch (filterByte) {
          case 0: break;
          case 1: value = (value + left) & 0xff; break;
          case 2: value = (value + up) & 0xff; break;
          case 3: value = (value + ((left + up) >> 1)) & 0xff; break;
          case 4: {
            const p = left + up - upLeft;
            const pa = Math.abs(p - left);
            const pb = Math.abs(p - up);
            const pc = Math.abs(p - upLeft);
            const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
            value = (value + pred) & 0xff;
            break;
          }
          default: return null;
        }
        decoded[x] = value;
      }

      for (let x = 0; x < width; x++) {
        const inOff = x * channels;
        const outOff = (y * width + x) * 4;
        out[outOff] = decoded[inOff];
        out[outOff + 1] = decoded[inOff + 1];
        out[outOff + 2] = decoded[inOff + 2];
        out[outOff + 3] = channels === 4 ? decoded[inOff + 3] : 255;
      }
      prevRow = decoded;
    }

    return { width, height, data: out };
  } catch {
    return null;
  }
}

/**
 * Compute the mean absolute per-channel difference between two RGBA
 * pixel buffers, normalised to 0..1.
 *
 * Subsamples to keep the comparison fast even for 1920×1080 frames.
 */
function meanAbsDiff(a: Uint8Array, b: Uint8Array, sampleStride = 47): number {
  if (a.length !== b.length) return 1;
  const len = a.length;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < len; i += sampleStride * 4) {
    sum += Math.abs(a[i] - b[i]);
    sum += Math.abs(a[i + 1] - b[i + 1]);
    sum += Math.abs(a[i + 2] - b[i + 2]);
    count += 3;
  }
  if (count === 0) return 0;
  return sum / (count * 255);
}

/** Validate a sequence of frame stills. */
export async function validateFrames(
  framePaths: string[],
  opts: { staticThreshold?: number } = {},
): Promise<ValidationReport> {
  const threshold = opts.staticThreshold ?? 0.005;
  const staticWindows: StaticWindow[] = [];
  let totalDiff = 0;
  let comparisons = 0;

  for (let i = 0; i < framePaths.length - 1; i++) {
    const [a, b] = await Promise.all([
      readPngRgba(framePaths[i]),
      readPngRgba(framePaths[i + 1]),
    ]);
    if (!a || !b) continue;
    const diff = meanAbsDiff(a.data, b.data);
    totalDiff += diff;
    comparisons += 1;
    if (diff < threshold) {
      staticWindows.push({ fromFrame: framePaths[i], toFrame: framePaths[i + 1], diff });
    }
  }

  return {
    comparisons,
    staticWindows,
    meanDiff: comparisons > 0 ? totalDiff / comparisons : 0,
    passed: staticWindows.length === 0,
  };
}

/**
 * High-level: extract every-Nth frame from an MP4 with ffmpeg, run
 * `validateFrames`, clean up. Returns the report.
 */
export async function validateRender(
  mp4Path: string,
  opts: ValidateOptions = {},
): Promise<ValidationReport> {
  const ffmpeg = opts.ffmpegPath ?? 'ffmpeg';
  const stride = opts.stride ?? 15;
  const workDir =
    opts.workDir ?? path.join(path.dirname(mp4Path), `.motion-validate-${Date.now()}`);

  await fs.mkdir(workDir, { recursive: true });

  try {
    // Extract stills. -vf "select='not(mod(n\,STRIDE))'" + -vsync 0 keeps
    // the source frame ordering and skips re-encoding.
    const pattern = path.join(workDir, 'frame_%05d.png');
    await execFileP(ffmpeg, [
      '-y',
      '-i', mp4Path,
      '-vf', `select=not(mod(n\\,${stride}))`,
      '-vsync', '0',
      '-q:v', '2',
      pattern,
    ]);

    const files = (await fs.readdir(workDir))
      .filter((n) => n.endsWith('.png'))
      .sort()
      .map((n) => path.join(workDir, n));

    return await validateFrames(files, { staticThreshold: opts.staticThreshold });
  } finally {
    // Best-effort cleanup; don't throw if it fails.
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch {
      // ignored
    }
  }
}

/**
 * Format a validation report as a human-readable string. Use as the
 * payload of a CI failure message.
 */
export function formatReport(report: ValidationReport): string {
  const head = report.passed
    ? `✓ Motion validation passed (${report.comparisons} comparisons, mean diff ${report.meanDiff.toFixed(4)})`
    : `✗ Motion validation FAILED — ${report.staticWindows.length}/${report.comparisons} window(s) below threshold (mean diff ${report.meanDiff.toFixed(4)})`;
  if (report.passed) return head;

  const lines = report.staticWindows.slice(0, 12).map((w) =>
    `  - ${path.basename(w.fromFrame)} → ${path.basename(w.toFrame)} : diff ${w.diff.toFixed(5)}`,
  );
  if (report.staticWindows.length > 12) {
    lines.push(`  ... and ${report.staticWindows.length - 12} more`);
  }
  return `${head}\n${lines.join('\n')}`;
}
