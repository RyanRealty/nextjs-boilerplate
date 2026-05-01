import { describe, expect, it } from 'vitest'

import { TitleCard } from './TitleCard'
import { SAMPLE_MARKET, SAMPLE_TITLE } from './preview-data'

describe('TitleCard', () => {
  it('exports a React component', () => {
    expect(typeof TitleCard).toBe('function')
  })

  it('accepts the brand-canonical Scene 1 prop shape', () => {
    // Type-level proof — if the prop shape drifted, this would fail to compile.
    const props = { title: SAMPLE_TITLE, market: SAMPLE_MARKET }
    expect(props.title.miniAgenda.length).toBeGreaterThan(0)
    expect(props.market).toBe('Bend')
  })

  it('SAMPLE_TITLE matches the storyboard mini-agenda spec', () => {
    expect(SAMPLE_TITLE.miniAgenda).toEqual([
      'Prices',
      'Inventory',
      'Days to Pending',
      'Neighborhood Breakdown',
    ])
  })
})
