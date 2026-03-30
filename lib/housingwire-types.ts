/**
 * Types for HousingWire Data (formerly Altos Research) market context.
 * Used to show national/regional metrics alongside local report data.
 * API docs: contact HousingWire Data for implementation details.
 */

export type HousingWireMarketContext = {
  /** As-of date for the data (YYYY-MM-DD). */
  asOf: string
  /** U.S. single-family active listing count (e.g. from Trends/Listings). */
  nationalInventory?: number | null
  /** 30-year fixed conforming mortgage rate (e.g. 6.17). */
  mortgageRate30Yr?: number | null
  /** 10-year Treasury yield (e.g. 4.27). */
  treasury10Y?: number | null
  /** National median list price (optional). */
  nationalMedianListPrice?: number | null
  /** Optional label for data source. */
  sourceLabel?: string
}
