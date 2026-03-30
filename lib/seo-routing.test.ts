import { describe, expect, it } from 'vitest'
import { shouldNoIndexBlogIndex, shouldNoIndexSearchVariant } from './seo-routing'

describe('shouldNoIndexSearchVariant', () => {
  it('returns false for canonical search page', () => {
    expect(shouldNoIndexSearchVariant({})).toBe(false)
  })

  it('returns true for paginated search pages', () => {
    expect(shouldNoIndexSearchVariant({ page: '2' })).toBe(true)
  })

  it('returns true when any filter is present', () => {
    expect(shouldNoIndexSearchVariant({ minPrice: '800000' })).toBe(true)
    expect(shouldNoIndexSearchVariant({ statusFilter: 'pending' })).toBe(true)
    expect(shouldNoIndexSearchVariant({ view: 'map' })).toBe(true)
  })

  it('ignores empty filter values', () => {
    expect(shouldNoIndexSearchVariant({ minPrice: '' })).toBe(false)
  })
})

describe('shouldNoIndexBlogIndex', () => {
  it('returns false for canonical blog index', () => {
    expect(shouldNoIndexBlogIndex({})).toBe(false)
  })

  it('returns true for paginated blog index', () => {
    expect(shouldNoIndexBlogIndex({ page: '3' })).toBe(true)
  })

  it('returns true for category-filtered blog index', () => {
    expect(shouldNoIndexBlogIndex({ category: 'Market Updates' })).toBe(true)
  })

  it('keeps All category indexable', () => {
    expect(shouldNoIndexBlogIndex({ category: 'All' })).toBe(false)
  })
})
