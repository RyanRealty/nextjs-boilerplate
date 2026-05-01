/**
 * Citation builders for the YouTube market report pipeline.
 *
 * Every figure that lands in a VideoProps scene gets a matching Citation
 * entry so the rendered video is auditable. Spark cross-check fields are
 * optional here — the orchestrator fills them in once Spark queries return.
 */

import {
  type Citation,
  type Market,
  type MonthsOfSupplyCitation,
  type SupabaseCitation,
  type VideoPeriod,
} from '../../video/market-report/src/VideoProps';
import {
  formatDays,
  formatPercent,
  formatPriceCompact,
} from './aggregations';
import type { ClosedSfrRow } from './queries';
import { scopeForMarket } from './queries';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scopeFilter(market: Market): string {
  const scope = scopeForMarket(market);
  if (scope.cities) return `City IN (${scope.cities.map((c) => `'${c}'`).join(', ')})`;
  if (scope.countyOrParish) return `CountyOrParish='${scope.countyOrParish}'`;
  return 'unknown scope';
}

function commonClosedFilters(market: Market, period: VideoPeriod): string {
  return [
    "StandardStatus='Closed'",
    "PropertyType='A'",
    "property_sub_type='Single Family Residence'",
    scopeFilter(market),
    `CloseDate(PT) ${period.current.start}..${period.current.end}`,
    'ClosePrice >= 10000 (UF1)',
  ].join(', ');
}

function commonRatioFilters(market: Market, period: VideoPeriod): string {
  return commonClosedFilters(market, period) + ', sale_to_final_list_ratio in [0.5, 1.5] (UF2)';
}

// ---------------------------------------------------------------------------
// Public builders
// ---------------------------------------------------------------------------

export interface CitationContext {
  market: Market;
  period: VideoPeriod;
  fetchedAtIso: string;
}

export function citeMedianPrice(
  ctx: CitationContext,
  value: number,
  rowCount: number,
): SupabaseCitation {
  return {
    kind: 'supabase',
    metric: 'Median Sale Price',
    value,
    display: formatPriceCompact(value),
    source: 'Supabase listings',
    table: 'listings',
    filters: commonClosedFilters(ctx.market, ctx.period),
    rowCount,
    query: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "ClosePrice") [computed client-side]',
    fetchedAtIso: ctx.fetchedAtIso,
  };
}

export function citeMedianDaysToPending(
  ctx: CitationContext,
  value: number,
  rowCount: number,
): SupabaseCitation {
  return {
    kind: 'supabase',
    metric: 'Median Days to Pending',
    value,
    display: formatDays(value),
    source: 'Supabase listings',
    table: 'listings',
    filters: commonClosedFilters(ctx.market, ctx.period) + ', days_to_pending IS NOT NULL',
    rowCount,
    query: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_pending) [computed client-side, Beacon methodology]',
    fetchedAtIso: ctx.fetchedAtIso,
  };
}

export function citeMedianPpsf(
  ctx: CitationContext,
  value: number,
  rowCount: number,
  subType: string,
): SupabaseCitation {
  return {
    kind: 'supabase',
    metric: `Median $/SqFt (${subType})`,
    value,
    display: `$${Math.round(value)}`,
    source: 'Supabase listings',
    table: 'listings',
    filters: commonClosedFilters(ctx.market, ctx.period) + `, property_sub_type='${subType}', TotalLivingAreaSqFt > 0`,
    rowCount,
    query: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY close_price_per_sqft) [computed client-side]',
    fetchedAtIso: ctx.fetchedAtIso,
  };
}

export function citeYoyMedianPrice(
  ctx: CitationContext,
  yoyPct: number,
  current: number,
  prior: number,
  currentRows: number,
  priorRows: number,
): SupabaseCitation {
  return {
    kind: 'supabase',
    metric: 'YoY Median Sale Price %',
    value: yoyPct,
    display: formatPercent(yoyPct),
    source: 'Supabase listings',
    table: 'listings',
    filters: `current ${ctx.period.current.start}..${ctx.period.current.end} (n=${currentRows}, median=${formatPriceCompact(current)}) vs prior ${ctx.period.priorYear.start}..${ctx.period.priorYear.end} (n=${priorRows}, median=${formatPriceCompact(prior)})`,
    rowCount: currentRows + priorRows,
    query: 'YoY = (current - prior) / prior * 100, rounded to 1 decimal',
    fetchedAtIso: ctx.fetchedAtIso,
  };
}

export function citeMedianSaleToList(
  ctx: CitationContext,
  ratioPct: number,
  rowCount: number,
): SupabaseCitation {
  return {
    kind: 'supabase',
    metric: 'Median Sale-to-Final-List %',
    value: ratioPct,
    display: `${ratioPct.toFixed(1)}%`,
    source: 'Supabase listings',
    table: 'listings',
    filters: commonRatioFilters(ctx.market, ctx.period),
    rowCount,
    query: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_to_final_list_ratio) * 100 [computed client-side]',
    fetchedAtIso: ctx.fetchedAtIso,
  };
}

export function citeActiveCount(
  ctx: CitationContext,
  count: number,
): SupabaseCitation {
  return {
    kind: 'supabase',
    metric: 'Active SFR Inventory',
    value: count,
    display: `${count} active`,
    source: 'Supabase listings',
    table: 'listings',
    filters: [
      "StandardStatus='Active'",
      "PropertyType='A'",
      "property_sub_type='Single Family Residence'",
      scopeFilter(ctx.market),
      'ListPrice >= 10000 (UF1 list-side)',
    ].join(', '),
    rowCount: count,
    query: 'COUNT(*) [snapshot]',
    fetchedAtIso: ctx.fetchedAtIso,
  };
}

/**
 * Months of Supply citation. Uses the dedicated MonthsOfSupplyCitation type
 * because the audit trail must show the formula and both numerator/denominator
 * (per skills/youtube-market-reports/query-rules.md C3).
 */
export function citeMonthsOfSupply(
  ctx: CitationContext,
  result: { monthsOfSupply: number; active: number; closedLookback: number; lookbackDays: number },
): MonthsOfSupplyCitation {
  return {
    kind: 'months_of_supply',
    metric: 'Months of Supply',
    value: result.monthsOfSupply,
    display: Number.isFinite(result.monthsOfSupply) ? `${result.monthsOfSupply.toFixed(1)} mo` : '—',
    active: result.active,
    closedLookback: result.closedLookback,
    lookbackDays: result.lookbackDays,
    formula: `active / (closed_${result.lookbackDays}d / ${result.lookbackDays} * 30)`,
    source: 'Supabase listings (SFR-only manual)',
    fetchedAtIso: ctx.fetchedAtIso,
  };
}

/** Aggregate the set of citations the orchestrator typically produces. */
export interface CitationBundle {
  scene0: Citation[];
  scene2: Citation[];
  scene3: Citation[];
  scene4: Citation[];
  scene5: Citation[];
  scene6: Citation[];
  scene7: Citation[];
  all: Citation[];
}

/** Convenience: flatten all bundle entries into one ordered array. */
export function flattenBundle(bundle: Omit<CitationBundle, 'all'>): Citation[] {
  return [
    ...bundle.scene0,
    ...bundle.scene2,
    ...bundle.scene3,
    ...bundle.scene4,
    ...bundle.scene5,
    ...bundle.scene6,
    ...bundle.scene7,
  ];
}

// suppress unused-import warning when ClosedSfrRow is referenced via JSDoc only
export type _RowTypeOnly = ClosedSfrRow;
