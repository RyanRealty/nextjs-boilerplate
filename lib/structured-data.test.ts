import { describe, expect, it } from 'vitest'
import { generateBrokerSchema, generateListingSchema } from './structured-data'
import { listingDetailPath } from './slug'

describe('structured-data canonical URLs', () => {
  it('uses canonical /team URL for brokers', () => {
    const schema = generateBrokerSchema({
      display_name: 'Alex Broker',
      slug: 'alex-broker',
    })
    expect(schema.url).toMatch(/\/team\/alex-broker$/)
    expect(schema.url).not.toMatch(/\/agents\//)
  })

  it('uses canonical listing detail URL for listing schema', () => {
    const expectedPath = listingDetailPath(
      'abc123',
      {
        streetNumber: '1234',
        streetName: 'Pine St',
        city: 'Bend',
        state: 'OR',
        postalCode: '97701',
      },
      {
        city: 'Bend',
        subdivision: 'Northwest Crossing',
      }
    )
    const schema = generateListingSchema(
      {
        listing_key: 'abc123',
        subdivision_name: 'Northwest Crossing',
      },
      {
        street_number: '1234',
        street_name: 'Pine St',
        city: 'Bend',
        state: 'OR',
        postal_code: '97701',
      }
    )
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryan-realty.com').replace(/\/$/, '')
    expect(schema.url).toBe(`${base}${expectedPath}`)
    expect(schema.url).not.toMatch(/\/listings\//)
  })
})
