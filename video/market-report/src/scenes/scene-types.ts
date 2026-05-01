/**
 * Re-export the per-scene prop shapes from VideoProps so scene components can
 * import a stable contract without reaching into the full VideoProps tree.
 *
 * Keeps the import surface tight ("Scene1Title from './scene-types'" instead
 * of 'from "../VideoProps"') and gives a single place to add scene-specific
 * derived helpers later.
 */

export type {
  Scene0Hook,
  Scene1Title,
  Scene2MedianPrice,
  Scene3PricePerSqFt,
  Scene4Inventory,
  Scene5DaysToPending,
  Scene6Neighborhoods,
  Scene7Takeaways,
  Scene8Cta,
  AnchorStatName,
  Direction,
  MarketCondition,
  Market,
} from '../VideoProps'
