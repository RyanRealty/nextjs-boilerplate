import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

function readRouteFile(relativePath: string): string {
  const filePath = path.resolve(__dirname, '..', relativePath)
  return fs.readFileSync(filePath, 'utf8')
}

describe('SEO route metadata contracts', () => {
  it('enforces canonical alternates on core dynamic route families', () => {
    const files = [
      'app/cities/[slug]/page.tsx',
      'app/cities/[slug]/[neighborhoodSlug]/page.tsx',
      'app/communities/[slug]/page.tsx',
      'app/listing/[listingKey]/page.tsx',
      'app/search/[...slug]/page.tsx',
      'app/blog/[slug]/page.tsx',
      'app/team/[slug]/page.tsx',
    ]

    for (const file of files) {
      const content = readRouteFile(file)
      expect(content).toMatch(/alternates:\s*\{[^}]*\bcanonical\b/m)
    }
  })

  it('enforces noindex policy helpers for variant routes', () => {
    const searchPage = readRouteFile('app/search/[...slug]/page.tsx')
    const blogIndex = readRouteFile('app/blog/page.tsx')

    expect(searchPage).toMatch(/shouldNoIndexSearchVariant\(/)
    expect(blogIndex).toMatch(/shouldNoIndexBlogIndex\(/)
  })
})
