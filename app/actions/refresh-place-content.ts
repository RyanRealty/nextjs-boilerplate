'use server'

import { runPlaceContentChunk } from './place-content-pipeline'

/**
 * Refresh place content for cities, neighborhoods, and communities in the background.
 * Runs one chunk per invocation (so cron can call daily or weekly; over time all places get robust copy).
 * Copy is written in brand voice, uses listing/report data, and is stored in the DB so pages are not thin for SEO or LLMs.
 */
export async function refreshPlaceContent(options: {
  limitCities?: number
  limitNeighborhoods?: number
  limitCommunities?: number
}): Promise<{
  updated: number
  failed: number
  errors: string[]
  citiesProcessed: number
  neighborhoodsProcessed: number
  communitiesProcessed: number
}> {
  const result = await runPlaceContentChunk({
    limitCities: options.limitCities ?? 3,
    limitNeighborhoods: options.limitNeighborhoods ?? 5,
    limitCommunities: options.limitCommunities ?? 20,
  })
  return {
    updated: result.updated,
    failed: result.failed,
    errors: result.errors,
    citiesProcessed: result.citiesProcessed,
    neighborhoodsProcessed: result.neighborhoodsProcessed,
    communitiesProcessed: result.communitiesProcessed,
  }
}
