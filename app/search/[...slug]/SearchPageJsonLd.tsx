import { homesForSalePath, listingDetailPath } from '../../../lib/slug'

/**
 * Structured data for city/subdivision search pages: WebPage, BreadcrumbList, Place, ItemList.
 * Helps search engines and LLMs understand the page and listings.
 */
type ListingRow = {
  ListingKey?: string | null
  ListNumber?: string | null
  StreetNumber?: string | null
  StreetName?: string | null
  City?: string | null
  State?: string | null
  PostalCode?: string | null
  SubdivisionName?: string | null
  [key: string]: unknown
}

type Props = {
  displayName: string
  city: string | undefined
  subdivision: string | undefined
  subdivisionBlurb: string | null
  cityMetaDescription: string | undefined
  bannerUrl: string | null
  siteUrl: string
  listings: ListingRow[]
}

export default function SearchPageJsonLd({
  displayName,
  city,
  subdivision,
  subdivisionBlurb,
  cityMetaDescription,
  bannerUrl,
  siteUrl,
  listings,
}: Props) {
  const pagePath = city ? homesForSalePath(city, subdivision ?? null) : '/homes-for-sale'
  const pageUrl = siteUrl ? `${siteUrl}${pagePath}` : undefined
  const description = subdivisionBlurb ?? cityMetaDescription ?? `Browse homes for sale in ${displayName}, Central Oregon.`

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Homes for Sale in ${displayName}`,
    description,
    ...(bannerUrl && { primaryImageOfPage: { '@type': 'ImageObject', url: bannerUrl, width: 1200, height: 336 } }),
    ...(pageUrl && { url: pageUrl }),
  }

  const breadcrumbItems: { name: string; item?: string }[] = [
    { name: 'Ryan Realty', item: siteUrl || undefined },
    { name: 'Homes for Sale', item: siteUrl ? `${siteUrl}/homes-for-sale` : undefined },
  ]
  if (city) {
    breadcrumbItems.push({
      name: city,
      item: siteUrl ? `${siteUrl}${homesForSalePath(city)}` : undefined,
    })
  }
  if (subdivision) {
    breadcrumbItems.push({
      name: subdivision,
      item: pageUrl,
    })
  }

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.item && { item: item.item }),
    })),
  }

  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: displayName,
    description: description.slice(0, 500),
    ...(pageUrl && { url: pageUrl }),
    address: {
      '@type': 'PostalAddress',
      addressLocality: city || displayName,
      addressRegion: 'OR',
      addressCountry: 'US',
    },
  }

  const listingUrls = listings
    .slice(0, 20)
    .map((l) => {
      const key = l.ListNumber ?? l.ListingKey
      if (!key || !siteUrl) return null
      const href = listingDetailPath(
        String(key),
        {
          streetNumber: l.StreetNumber ?? null,
          streetName: l.StreetName ?? null,
          city: l.City ?? city ?? null,
          state: l.State ?? null,
          postalCode: l.PostalCode ?? null,
        },
        {
          city: l.City ?? city ?? null,
          subdivision: l.SubdivisionName ?? subdivision ?? null,
        },
        {
          mlsNumber: l.ListNumber ?? null,
        }
      )
      return `${siteUrl}${href}`
    })
    .filter(Boolean) as string[]

  const itemList =
    listingUrls.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          numberOfItems: listings.length,
          itemListElement: listingUrls.slice(0, 10).map((url, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url,
          })),
        }
      : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(place) }} />
      {itemList && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      )}
    </>
  )
}
