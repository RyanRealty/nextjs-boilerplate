/**
 * Supabase `.select()` column lists for listing cards and sliders.
 * Keep in sync with `ListingTile` / `HomeTileCard` (no map coordinates).
 * Do not add `details` JSONB here; use `has_virtual_tour` and dedicated video queries for media.
 */
export const HOME_TILE_SELECT =
  'ListingKey, ListNumber, ListPrice, BedroomsTotal, BathroomsTotal, StreetNumber, StreetName, City, State, PostalCode, SubdivisionName, PhotoURL, StandardStatus, TotalLivingAreaSqFt, ListOfficeName, ListAgentName, OnMarketDate, OpenHouses, CloseDate, has_virtual_tour'

/** Community pages: base tile + map coords + HOA columns (no `details` JSONB). */
export const COMMUNITY_LISTING_TILE_SELECT = `${HOME_TILE_SELECT}, Latitude, Longitude, AssociationYN, AssociationFee, AssociationFeeFrequency`

/** City / geo pages: base tile + map coordinates + lot size columns. */
export const CITY_LISTING_TILE_SELECT = `${HOME_TILE_SELECT}, Latitude, Longitude, lot_size_acres, lot_size_sqft`
