import { describe, expect, it } from 'vitest'
import {
  pickFirstVideoFromDetails,
  pickFirstVideoFromListingRow,
  listingRowShowsVideoTile,
} from './pick-video-from-details'

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

  it('reads lowercase videos array', () => {
    expect(pickFirstVideoFromDetails({ videos: [{ uri: 'https://x.com/a.mp4' }] })).toEqual({
      url: 'https://x.com/a.mp4',
      source: 'listing_video',
    })
  })

  it('parses JSON string details', () => {
    const json = JSON.stringify({ VirtualTourURL: 'https://tour.example/1' })
    expect(pickFirstVideoFromDetails(json)).toEqual({
      url: 'https://tour.example/1',
      source: 'virtual_tour',
    })
  })

  it('pickFirstVideoFromListingRow uses virtual_tour_url column', () => {
    expect(
      pickFirstVideoFromListingRow({
        details: {},
        virtual_tour_url: 'https://matterport.com/x',
      })
    ).toEqual({ url: 'https://matterport.com/x', source: 'virtual_tour' })
  })

  it('listingRowShowsVideoTile respects has_virtual_tour', () => {
    expect(listingRowShowsVideoTile({ has_virtual_tour: true, details: null })).toBe(true)
    expect(listingRowShowsVideoTile({ has_virtual_tour: false, details: {} })).toBe(false)
  })

  it('listingRowShowsVideoTile true when virtual_tour_url set', () => {
    expect(listingRowShowsVideoTile({ has_virtual_tour: false, details: {}, virtual_tour_url: 'https://x.com' })).toBe(
      true
    )
  })
})
