# SEO Authoring Checklist

Use this checklist for every new or updated public page route.

## Metadata Contract
- Export `metadata` or `generateMetadata` in each public route page (`app/**/page.tsx`).
- For dynamic public routes (`[slug]`, `[...slug]`, `[id]`), define `alternates.canonical`.
- Keep canonical URLs on helper contracts:
  - Listings browse: `listingsBrowsePath()`
  - Team: `teamPath()`
  - Valuation: `valuationPath()`

## Indexation Policy
- Canonical pages should be indexable.
- Filtered and paginated variants must be `noindex,follow`.
  - Search variants: `shouldNoIndexSearchVariant(...)`
  - Blog index variants: `shouldNoIndexBlogIndex(...)`

## URL and Linking Rules
- Never hardcode legacy canonical paths in new code:
  - `/listings`
  - `/agents`
  - `/home-valuation`
- Use canonical helper paths in navigation, metadata, and JSON LD.

## Sitemap and Structured Data
- Include only canonical URLs in `app/sitemap.ts`.
- Structured data URLs must align with canonical helpers.

## Required Validation
- Run `npm run lint:seo-routes` before committing.
- Run `npm test` to keep SEO contracts green.
