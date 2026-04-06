-- Fast property-type inventory counts for geo pages (replaces paginated full-table scans).
-- Matches lib/inventory-filters classifyInventoryPropertyType + isActiveForSaleStatus.

CREATE OR REPLACE FUNCTION public.inventory_breakdown_for_city(p_city text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'singleFamily', COUNT(*) FILTER (WHERE bucket = 'single_family'),
    'condoTownhome', COUNT(*) FILTER (WHERE bucket = 'condo_townhome'),
    'manufacturedMobile', COUNT(*) FILTER (WHERE bucket = 'manufactured_mobile'),
    'landLot', COUNT(*) FILTER (WHERE bucket = 'land_lot')
  )
  FROM (
    SELECT
      CASE
        WHEN length(pt) = 0 THEN 'other'
        WHEN pt LIKE '%single family%' OR pt LIKE '%single-family%' OR pt LIKE '%detached%' OR pt = 'residential' THEN 'single_family'
        WHEN pt LIKE '%condo%' OR pt LIKE '%townhome%' OR pt LIKE '%town house%' OR pt LIKE '%townhouse%' THEN 'condo_townhome'
        WHEN pt LIKE '%manufactured%' OR pt LIKE '%mobile%' THEN 'manufactured_mobile'
        WHEN pt LIKE '%land%' OR pt LIKE '%lot%' OR pt LIKE '%acreage%' OR pt LIKE '%vacant%' THEN 'land_lot'
        ELSE 'other'
      END AS bucket
    FROM (
      SELECT
        lower(trim(coalesce(l."PropertyType", l.property_type::text, ''))) AS pt
      FROM public.listings l
      WHERE
        length(trim(coalesce(l."City", ''))) > 0
        AND lower(trim(l."City")) = lower(trim(p_city))
        AND (
          coalesce(l."StandardStatus", l.standard_status, '') = ''
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%active%'
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%for sale%'
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%coming soon%'
        )
    ) raw
  ) classified;
$$;

CREATE OR REPLACE FUNCTION public.inventory_breakdown_for_community(p_city text, p_subdivision text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'singleFamily', COUNT(*) FILTER (WHERE bucket = 'single_family'),
    'condoTownhome', COUNT(*) FILTER (WHERE bucket = 'condo_townhome'),
    'manufacturedMobile', COUNT(*) FILTER (WHERE bucket = 'manufactured_mobile'),
    'landLot', COUNT(*) FILTER (WHERE bucket = 'land_lot')
  )
  FROM (
    SELECT
      CASE
        WHEN length(pt) = 0 THEN 'other'
        WHEN pt LIKE '%single family%' OR pt LIKE '%single-family%' OR pt LIKE '%detached%' OR pt = 'residential' THEN 'single_family'
        WHEN pt LIKE '%condo%' OR pt LIKE '%townhome%' OR pt LIKE '%town house%' OR pt LIKE '%townhouse%' THEN 'condo_townhome'
        WHEN pt LIKE '%manufactured%' OR pt LIKE '%mobile%' THEN 'manufactured_mobile'
        WHEN pt LIKE '%land%' OR pt LIKE '%lot%' OR pt LIKE '%acreage%' OR pt LIKE '%vacant%' THEN 'land_lot'
        ELSE 'other'
      END AS bucket
    FROM (
      SELECT
        lower(trim(coalesce(l."PropertyType", l.property_type::text, ''))) AS pt
      FROM public.listings l
      WHERE
        length(trim(coalesce(l."City", ''))) > 0
        AND lower(trim(l."City")) = lower(trim(p_city))
        AND coalesce(l."SubdivisionName", l.subdivision_name, '') <> ''
        AND coalesce(l."SubdivisionName", l.subdivision_name, '') ilike trim(p_subdivision)
        AND (
          coalesce(l."StandardStatus", l.standard_status, '') = ''
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%active%'
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%for sale%'
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%coming soon%'
        )
    ) raw
  ) classified;
$$;

CREATE OR REPLACE FUNCTION public.inventory_breakdown_for_neighborhood(p_neighborhood_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'singleFamily', COUNT(*) FILTER (WHERE bucket = 'single_family'),
    'condoTownhome', COUNT(*) FILTER (WHERE bucket = 'condo_townhome'),
    'manufacturedMobile', COUNT(*) FILTER (WHERE bucket = 'manufactured_mobile'),
    'landLot', COUNT(*) FILTER (WHERE bucket = 'land_lot')
  )
  FROM (
    SELECT
      CASE
        WHEN length(pt) = 0 THEN 'other'
        WHEN pt LIKE '%single family%' OR pt LIKE '%single-family%' OR pt LIKE '%detached%' OR pt = 'residential' THEN 'single_family'
        WHEN pt LIKE '%condo%' OR pt LIKE '%townhome%' OR pt LIKE '%town house%' OR pt LIKE '%townhouse%' THEN 'condo_townhome'
        WHEN pt LIKE '%manufactured%' OR pt LIKE '%mobile%' THEN 'manufactured_mobile'
        WHEN pt LIKE '%land%' OR pt LIKE '%lot%' OR pt LIKE '%acreage%' OR pt LIKE '%vacant%' THEN 'land_lot'
        ELSE 'other'
      END AS bucket
    FROM (
      SELECT
        lower(trim(coalesce(l."PropertyType", l.property_type::text, ''))) AS pt
      FROM public.listings l
      INNER JOIN public.properties p ON p.id = l.property_id
      WHERE
        p.neighborhood_id = p_neighborhood_id
        AND (
          coalesce(l."StandardStatus", l.standard_status, '') = ''
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%active%'
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%for sale%'
          OR lower(coalesce(l."StandardStatus", l.standard_status, '')) LIKE '%coming soon%'
        )
    ) raw
  ) classified;
$$;

GRANT EXECUTE ON FUNCTION public.inventory_breakdown_for_city(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_breakdown_for_community(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_breakdown_for_neighborhood(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.inventory_breakdown_for_city(text) IS 'Active listing counts by inventory bucket for a city (matches app inventory-filters).';
COMMENT ON FUNCTION public.inventory_breakdown_for_community(text, text) IS 'Active listing counts by inventory bucket for a subdivision within a city.';
COMMENT ON FUNCTION public.inventory_breakdown_for_neighborhood(uuid) IS 'Active listing counts by inventory bucket for listings linked to properties in a neighborhood.';
