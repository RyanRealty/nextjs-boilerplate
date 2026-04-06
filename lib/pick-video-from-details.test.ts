import { describe, expect, it } from 'vitest'
import { pickFirstVideoFromDetails, listingRowShowsVideoTile } from './pick-video-from-details'

describe('pickFirstVideoFromDetails', () => {
  it('reads VirtualTourURLUnbranded', () => {
    expect(pickFirstVideoFromDetails({ VirtualTourURLUnbranded: 'https://example.com/tour' })).toEqual({
      url: 'https://example.com/tour',
      source: 'virtual_tour',
    })
  })

  it('reads Videos.Uri and URL aliases', () => {
    expect(pickFirstVideoFromDetails({ Videos: [{ URL: 'https://x.com/v.mp4' }] })).toEqual({
      url: 'https://x.com/v.mp4',
      source: 'listing_video',
    })
  })

  it('listingRowShowsVideoTile respects has_virtual_tour', () => {
    expect(listingRowShowsVideoTile({ has_virtual_tour: true, details: null })).toBe(true)
    expect(listingRowShowsVideoTile({ has_virtual_tour: false, details: {} })).toBe(false)
  })
})
