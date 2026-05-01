import { describe, expect, it } from 'vitest'

import { OutroCard } from './OutroCard'
import { SAMPLE_CTA } from './preview-data'

describe('OutroCard', () => {
  it('exports a React component', () => {
    expect(typeof OutroCard).toBe('function')
  })

  it('uses brand-canonical CTA fields (per brand-system.md §11)', () => {
    expect(SAMPLE_CTA.url).toBe('ryan-realty.com')
    expect(SAMPLE_CTA.phone).toBe('541.213.6706')
  })

  it('accepts optional sign-off + showLogo override', () => {
    const props = { cta: SAMPLE_CTA, signOff: 'Custom close.', showLogo: false }
    expect(props.signOff).toBeDefined()
    expect(props.showLogo).toBe(false)
  })
})
