import { describe, expect, it } from 'vitest'
import { parseVideoListingRowsFromCacheJson } from './video-tours-listing-videos-join'

describe('parseVideoListingRowsFromCacheJson', () => {
  it('parses valid cache rows', () => {
    const rows = parseVideoListingRowsFromCacheJson([
      {
        listing_key: 'abc',
        list_number: '1',
        list_price: 500000,
        video_url: 'https://example.com/v',
        video_source: 'listing_video',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.listing_key).toBe('abc')
    expect(rows[0]?.list_price).toBe(500000)
  })

  it('drops invalid video_source', () => {
    expect(parseVideoListingRowsFromCacheJson([{ listing_key: 'a', video_url: 'u', video_source: 'bad' }])).toHaveLength(0)
  })
})
