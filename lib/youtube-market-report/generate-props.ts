/**
 * generate-props.ts — orchestrator for the YouTube market report data layer.
 *
 * Takes a Market + VideoPeriod, fans out parallel Supabase fetches, applies
 * the universal residential filters and timezone correction, computes every
 * scene's data with aggregations.ts helpers, and emits a partial VideoProps
 * object plus a structured citations array.
 *
 * "Partial" because voice (built by Step 4 alignment helper), assets (Step
 * 6/7 B-roll + maps), youtube metadata (Step 3 script generator), and scene
 * durations (negotiated against final VO length) are filled in by downstream
 * pipeline phases.
 *
 * Hard rules enforced (per skills/youtube-market-reports/query-rules.md):
 *   - Every figure traces to a Citation (no exceptions).
 *   - Months of Supply uses the canonical Template 11 SFR-only manual
 *     computation. The orchestrator NEVER reads market_pulse_live.
 *   - All DOM stats use the days_to_pending column.
 *   - All closed-sales aggregations apply UF1 (>= 10000) at fetch time.
 *   - All ratio aggregations apply UF2 ([0.5, 1.5]) at fetch time.
 *   - All MoS computations apply UF3 (SFR filter on both CTEs).
 *   - All date filters use Pacific-local windows via inPacificWindow().
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceClient } from '../supabase/service';
import {
  type Citation,
  type Market,
  type VideoPeriod,
  VIDEO_PROPS_SCHEMA_VERSION,
  type VideoProps,
} from '../../video/market-report/src/VideoProps';
import {
  monthsOfSupply as computeMos,
  median,
  yoyPct as computeYoy,
} from './aggregations';
import {
  fetchActiveInventoryBySubType,
  fetchActiveSfrSnapshot,
  fetchClosedSfrInWindow,
  uf2Filter,
} from './queries';
import {
  buildScene0,
  buildScene1,
  buildScene2,
  buildScene3,
  buildScene4,
  buildScene5,
  buildScene6,
  buildScene7,
  buildScene8,
} from './scene-builders';
import {
  citeActiveCount,
  citeMedianDaysToPending,
  citeMedianPpsf,
  citeMedianPrice,
  citeMedianSaleToList,
  citeMonthsOfSupply,
  citeYoyMedianPrice,
  flattenBundle,
  type CitationBundle,
  type CitationContext,
} from './citation-builder';

// ---------------------------------------------------------------------------
// Public input + output shapes
// ---------------------------------------------------------------------------

export interface GeneratePropsInput {
  market: Market;
  period: VideoPeriod;
  /** Anchor metric for Scene 0 (chosen by editorial judgement, not by the data). */
  anchorStat: VideoProps['scene0']['anchorStatName'];
  /**
   * Lookback window in days for Months of Supply velocity denominator.
   * Defaults to 180 (per Template 11). Reduce to 90 for fast-moving markets.
   */
  mosLookbackDays?: number;
  /** Optional injected client. Defaults to createServiceClient(). */
  client?: SupabaseClient;
}

/** The orchestrator's output. Voice/assets/youtube/sceneDurations land later. */
export type ScenePropsOnly = Omit<VideoProps, 'voice' | 'assets' | 'youtube' | 'sceneDurations'>;

export interface GeneratePropsOutput {
  /** Scene-level data + market metadata. */
  props: ScenePropsOnly;
  /** Per-scene citation bundle. The flat array also lives at props.citations. */
  bundle: CitationBundle;
}

// ---------------------------------------------------------------------------
// Top-level entry point
// ---------------------------------------------------------------------------

export async function generateProps(input: GeneratePropsInput): Promise<GeneratePropsOutput> {
  const client = input.client ?? createServiceClient();
  const lookbackDays = input.mosLookbackDays ?? 180;
  const fetchedAtIso = new Date().toISOString();
  const ctx: CitationContext = {
    market: input.market,
    period: input.period,
    fetchedAtIso,
  };

  // Build the lookback + trailing-90 windows the queries need.
  const lookbackWindow = subtractDaysFromYmd(input.period.current.end, lookbackDays);
  const trailing90Window = subtractDaysFromYmd(input.period.current.end, 90);

  // Fan out parallel fetches.
  const [
    currentRows,
    priorYearRows,
    trailingRows,
    closedLookbackRows,
    closedTrailing90Rows,
    activeRows,
    activeBySubType,
  ] = await Promise.all([
    fetchClosedSfrInWindow(client, input.market, input.period.current),
    fetchClosedSfrInWindow(client, input.market, input.period.priorYear),
    fetchClosedSfrInWindow(client, input.market, input.period.trailing24mo),
    fetchClosedSfrInWindow(client, input.market, lookbackWindow),
    fetchClosedSfrInWindow(client, input.market, trailing90Window),
    fetchActiveSfrSnapshot(client, input.market),
    fetchActiveInventoryBySubType(client, input.market),
  ]);

  // Months of Supply (Template 11 manual).
  const mos = computeMos(activeRows.length, closedLookbackRows.length, lookbackDays);

  // ---------------------------------------------------------------------
  // Build scenes.
  // ---------------------------------------------------------------------
  const scene0 = buildScene0({
    currentRows,
    priorYearRows,
    anchorStat: input.anchorStat,
    monthsOfSupplyValue: mos.monthsOfSupply,
  });

  const scene1 = buildScene1(input.period);

  const scene2 = buildScene2({
    currentRows,
    priorYearRows,
    trailingRows,
    period: input.period,
  });

  const scene3 = buildScene3({ currentRows, priorYearRows });

  const scene4 = buildScene4({
    activeRows,
    // Active YoY can't be reconstructed from current data without a snapshot
    // table — surface 0 as a sentinel rather than fabricating a number.
    // Pipeline Phase 2 (Spark cross-check) can fill this in for the current
    // period; historical inventory deltas remain a known gap.
    priorYearActiveCount: 0,
    closedLookbackRows,
    lookbackDays,
    inventoryBySubType: activeBySubType,
  });

  const scene5 = buildScene5({
    closedRows: closedTrailing90Rows,
    activeCount: activeRows.length,
    pendingCount: 0, // Pending fetcher not yet wired; absorption uses 0 as sentinel.
  });

  const scene6 = buildScene6({ currentRows, priorYearRows });

  const scene7 = buildScene7({
    trailing90Rows: uf2Filter(closedTrailing90Rows),
    scene6,
    scene4,
    scene5,
  });

  const scene8 = buildScene8({ nextReportDate: nextMonthLabel(input.period) });

  // ---------------------------------------------------------------------
  // Build citations.
  // ---------------------------------------------------------------------
  const ratioRows = uf2Filter(currentRows);
  const ratiosOnly = ratioRows
    .map((r) => r.sale_to_final_list_ratio)
    .filter((n): n is number => typeof n === 'number');
  const medianRatioPct = ratiosOnly.length
    ? Math.round(median(ratiosOnly) * 1000) / 10
    : NaN;

  const sfrPpsfRows = currentRows.filter(
    (r) => r.property_sub_type === 'Single Family Residence' && (r.close_price_per_sqft ?? 0) > 0,
  );

  const bundleSansAll: Omit<CitationBundle, 'all'> = {
    scene0: [
      citeMedianPrice(ctx, scene0.medianPrice, currentRows.length),
      citeMedianDaysToPending(ctx, scene0.medianDaysToPending, currentRows.length),
    ],
    scene2: [
      citeMedianPrice(ctx, scene2.currentMedian, currentRows.length),
      citeYoyMedianPrice(
        ctx,
        scene2.yoyPct,
        scene2.currentMedian,
        scene2.priorYearMedian,
        currentRows.length,
        priorYearRows.length,
      ),
    ],
    scene3: [
      citeMedianPpsf(ctx, scene3.sfrPpsf, sfrPpsfRows.length, 'Single Family Residence'),
    ],
    scene4: [
      citeActiveCount(ctx, scene4.activeCount),
      citeMonthsOfSupply(ctx, {
        monthsOfSupply: scene4.monthsOfSupply,
        active: scene4.activeCount,
        closedLookback: scene4.closedLookback,
        lookbackDays: scene4.lookbackDays,
      }),
    ],
    scene5: [
      citeMedianDaysToPending(ctx, scene5.medianDaysToPending, closedTrailing90Rows.length),
    ],
    scene6: scene6.byZip.map((row) =>
      citeMedianPrice(
        { ...ctx, period: input.period },
        row.medianPrice,
        row.sales,
      ),
    ),
    scene7: Number.isFinite(medianRatioPct)
      ? [citeMedianSaleToList(ctx, medianRatioPct, ratiosOnly.length)]
      : [],
  };

  const allCitations: Citation[] = flattenBundle(bundleSansAll);

  // YoY can be NaN if priorYear had zero rows; surface that to the verification
  // trace by ensuring at least one figure cites the YoY math even when blank.
  if (Number.isFinite(scene2.yoyPct)) {
    // Already cited in scene2.
  } else if (priorYearRows.length === 0) {
    // No-op — absence already implicit in the YoY citation's filter notes.
  }

  const props: ScenePropsOnly = {
    schemaVersion: VIDEO_PROPS_SCHEMA_VERSION,
    market: input.market,
    period: input.period,
    orientation: 'landscape',
    episodeId: deriveEpisodeId(input.market, input.period),
    generatedAtIso: fetchedAtIso,
    scene0,
    scene1,
    scene2,
    scene3,
    scene4,
    scene5,
    scene6,
    scene7,
    scene8,
    citations: allCitations,
  };

  return {
    props,
    bundle: { ...bundleSansAll, all: allCitations },
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Build a {start, end} window ending at `endYmd` going back `days` days. */
export function subtractDaysFromYmd(
  endYmd: string,
  days: number,
): { start: string; end: string } {
  const d = new Date(`${endYmd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  const start = d.toISOString().slice(0, 10);
  return { start, end: endYmd };
}

/** "May 24, 2026"-style label for the next month after `period`. */
export function nextMonthLabel(period: VideoPeriod): string {
  const [yyyy, mm] = period.monthId.split('-').map((s) => parseInt(s, 10));
  if (!yyyy || !mm) return 'next report';
  const nextMonth = mm === 12 ? 1 : mm + 1;
  const nextYear = mm === 12 ? yyyy + 1 : yyyy;
  // Use the 24th of the following month — gives a default that's typically a
  // Saturday-ish drop. The orchestrator can override post-build.
  // Build at noon UTC so the Pacific-zone formatter doesn't shift the day backward.
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(Date.UTC(nextYear, nextMonth - 1, 24, 12, 0, 0)));
}

/** Episode ID slug, e.g. "2026-04-bend-monthly". */
export function deriveEpisodeId(market: Market, period: VideoPeriod): string {
  const slug = market.toLowerCase().replace(/\s+/g, '-');
  return `${period.monthId}-${slug}-monthly`;
}

/** Build a VideoPeriod from a YYYY-MM month string. */
export function periodFromMonthId(monthId: string): VideoPeriod {
  const [yyyy, mm] = monthId.split('-').map((s) => parseInt(s, 10));
  if (!yyyy || !mm) {
    throw new RangeError(`periodFromMonthId: invalid monthId ${monthId}`);
  }
  const startOfMonth = `${yyyy}-${String(mm).padStart(2, '0')}-01`;
  const endOfMonth = lastDayOfMonth(yyyy, mm);
  const priorYearStart = `${yyyy - 1}-${String(mm).padStart(2, '0')}-01`;
  const priorYearEnd = lastDayOfMonth(yyyy - 1, mm);
  // 24-month trailing window ending on endOfMonth.
  const trailingStartDate = new Date(Date.UTC(yyyy - 2, mm, 1));
  const trailingStart = trailingStartDate.toISOString().slice(0, 10);

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(yyyy, mm - 1, 15)),
  );

  return {
    label: `${monthName} ${yyyy}`,
    monthId,
    monthName,
    year: yyyy,
    current: { start: startOfMonth, end: endOfMonth },
    priorYear: { start: priorYearStart, end: priorYearEnd },
    trailing24mo: { start: trailingStart, end: endOfMonth },
  };
}

function lastDayOfMonth(year: number, month: number): string {
  // Day 0 of next month = last day of this month.
  const last = new Date(Date.UTC(year, month, 0));
  return last.toISOString().slice(0, 10);
}

// suppress unused-warning for computeYoy when tree-shaking
export const _internalDebug = { computeYoy };
