import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  deriveEpisodeId,
  generateProps,
  nextMonthLabel,
  periodFromMonthId,
  subtractDaysFromYmd,
} from './generate-props';
import type { ClosedSfrRow } from './queries';

describe('subtractDaysFromYmd', () => {
  it('returns a window ending at endYmd, going back N days', () => {
    expect(subtractDaysFromYmd('2026-04-30', 90)).toEqual({
      start: '2026-01-30',
      end: '2026-04-30',
    });
    expect(subtractDaysFromYmd('2026-04-30', 180)).toEqual({
      start: '2025-11-01',
      end: '2026-04-30',
    });
  });
});

describe('periodFromMonthId', () => {
  it('builds matched current + priorYear + trailing24mo windows for April 2026', () => {
    const period = periodFromMonthId('2026-04');
    expect(period.label).toBe('April 2026');
    expect(period.monthName).toBe('April');
    expect(period.year).toBe(2026);
    expect(period.current).toEqual({ start: '2026-04-01', end: '2026-04-30' });
    expect(period.priorYear).toEqual({ start: '2025-04-01', end: '2025-04-30' });
    expect(period.trailing24mo.end).toBe('2026-04-30');
  });

  it('handles February (28-day) edge case', () => {
    const period = periodFromMonthId('2026-02');
    expect(period.current).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(period.priorYear).toEqual({ start: '2025-02-01', end: '2025-02-28' });
  });

  it('throws on bad input', () => {
    expect(() => periodFromMonthId('not-valid')).toThrow(RangeError);
  });
});

describe('nextMonthLabel', () => {
  it('returns a human-readable date for the month after period', () => {
    const p = periodFromMonthId('2026-04');
    expect(nextMonthLabel(p)).toBe('May 24, 2026');
  });

  it('rolls year over correctly', () => {
    const p = periodFromMonthId('2026-12');
    expect(nextMonthLabel(p)).toBe('January 24, 2027');
  });
});

describe('deriveEpisodeId', () => {
  it('produces a slug with market + month', () => {
    expect(deriveEpisodeId('Bend', periodFromMonthId('2026-04'))).toBe('2026-04-bend-monthly');
    expect(deriveEpisodeId('La Pine', periodFromMonthId('2026-04'))).toBe('2026-04-la-pine-monthly');
    expect(deriveEpisodeId('Crook County', periodFromMonthId('2026-04'))).toBe('2026-04-crook-county-monthly');
  });
});

// ---------------------------------------------------------------------------
// generateProps integration with a mocked Supabase client
// ---------------------------------------------------------------------------

function row(overrides: Partial<ClosedSfrRow> = {}): ClosedSfrRow {
  return {
    ListingKey: `key-${Math.random()}`,
    ClosePrice: 700_000,
    CloseDate: '2026-04-15T07:00:00Z',
    PostalCode: '97703',
    TotalLivingAreaSqFt: 1800,
    days_to_pending: 12,
    sale_to_final_list_ratio: 0.97,
    sale_to_list_ratio: 0.95,
    close_price_per_sqft: 388,
    property_sub_type: 'Single Family Residence',
    ...overrides,
  };
}

/**
 * Stage canned responses for the parallel fetches generateProps issues.
 * The mock returns rows from the queue in FIFO order — one queue entry per
 * fetcher call. Subsequent paginate iterations get an empty array.
 */
function makeMockClient(queue: unknown[][]): SupabaseClient {
  let callIdx = 0;
  const buildSelect = (): unknown => {
    const responses = queue[callIdx] ?? [];
    callIdx += 1;
    let pageCount = 0;
    const proxy: Record<string, unknown> = {
      then(onFulfilled: (v: unknown) => unknown) {
        const data = pageCount === 0 ? responses : [];
        pageCount += 1;
        return Promise.resolve(onFulfilled({ data, error: null }));
      },
    };
    const passthrough = () => proxy;
    proxy.eq = passthrough;
    proxy.in = passthrough;
    proxy.gte = passthrough;
    proxy.lte = passthrough;
    proxy.range = passthrough;
    return proxy;
  };
  return {
    from: () => ({ select: buildSelect }),
  } as unknown as SupabaseClient;
}

describe('generateProps (mocked client)', () => {
  it('produces a fully-populated ScenePropsOnly for Bend April 2026', async () => {
    const period = periodFromMonthId('2026-04');

    // Fetch order: current, priorYear, trailing24mo, lookback180, trailing90,
    // activeRows, activeBySubType.
    const queue: ClosedSfrRow[][] = [
      [row({ ClosePrice: 700_000 }), row({ ClosePrice: 750_000 }), row({ ClosePrice: 680_000 })],
      [row({ ClosePrice: 720_000 })],
      Array.from({ length: 24 }).map((_, i) =>
        row({ ClosePrice: 600_000 + i * 5_000, CloseDate: `2025-04-15T07:00:00Z` }),
      ),
      Array.from({ length: 588 }).map(() => row()),
      [row({ ClosePrice: 600_000 }), row({ ClosePrice: 1_200_000 })],
      [],
      [],
    ];
    const activeQueue: unknown[][] = [
      ...queue.slice(0, 5),
      // active SFR — 412 rows
      Array.from({ length: 412 }).map((_, i) => ({
        ListingKey: `a${i}`,
        ListPrice: 800_000,
        OnMarketDate: '2026-03-01T07:00:00Z',
        property_sub_type: 'Single Family Residence',
        PropertyType: 'A',
      })),
      // active by sub-type — empty
      [],
    ];

    const client = makeMockClient(activeQueue);
    const { props, bundle } = await generateProps({
      market: 'Bend',
      period,
      anchorStat: 'months_of_supply',
      client,
    });

    expect(props.market).toBe('Bend');
    expect(props.period.label).toBe('April 2026');
    expect(props.episodeId).toBe('2026-04-bend-monthly');
    expect(props.orientation).toBe('landscape');

    // Scene 0
    expect(props.scene0.closedCount).toBe(3);
    expect(props.scene0.medianPrice).toBe(700_000);
    expect(props.scene0.anchorStatName).toBe('months_of_supply');
    // mos = 412 / (588/180*30) = 412 / 98 = 4.20 -> Balanced (per documented threshold)
    expect(props.scene4.monthsOfSupply).toBe(4.2);
    expect(props.scene4.marketCondition).toBe('Balanced Market');
    expect(props.scene4.activeCount).toBe(412);
    expect(props.scene4.closedLookback).toBe(588);

    // Citations land
    expect(bundle.scene0.length).toBeGreaterThan(0);
    expect(bundle.scene4.length).toBeGreaterThan(0);
    expect(props.citations.length).toBeGreaterThan(0);

    // MoS citation is the special-typed one
    const mosCitation = bundle.scene4.find((c) => c.metric === 'Months of Supply');
    expect(mosCitation?.kind).toBe('months_of_supply');
    if (mosCitation && mosCitation.kind === 'months_of_supply') {
      expect(mosCitation.active).toBe(412);
      expect(mosCitation.closedLookback).toBe(588);
      expect(mosCitation.formula).toBe('active / (closed_180d / 180 * 30)');
      expect(mosCitation.source).toBe('Supabase listings (SFR-only manual)');
    }

    // No citation should reference market_pulse_live
    for (const c of props.citations) {
      const blob = JSON.stringify(c);
      expect(blob.includes('market_pulse_live')).toBe(false);
    }
  });
});
