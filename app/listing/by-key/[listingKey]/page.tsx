import { generateMetadata as generateListingMetadata } from '@/app/listing/[listingKey]/page'
import { getListingDetailData } from '@/app/actions/listing-detail'
import { getListingByKey } from '@/app/actions/listings'
import { listingDetailPath } from '@/lib/slug'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

type PageProps = {
  params: Promise<{ listingKey: string }>
}

export default async function ListingByKeyPage({ params }: PageProps) {
  const { listingKey } = await params
  const lookup = await getListingByKey(listingKey)
  const resolvedKey =
    (lookup?.ListingKey ?? lookup?.listing_key ?? lookup?.ListNumber ?? lookup?.list_number ?? listingKey)
      ?.toString()
      .trim() || listingKey
  const data = await getListingDetailData(resolvedKey)
  if (!data) notFound()
  const canonicalPath = listingDetailPath(
    data.listing.listing_key,
    {
      streetNumber: data.property?.street_number ?? null,
      streetName: data.property?.street_name ?? null,
      city: data.property?.city ?? null,
      state: data.property?.state ?? null,
      postalCode: data.property?.postal_code ?? null,
    },
    {
      city: data.property?.city ?? null,
      neighborhood: data.community?.neighborhood_name ?? null,
      subdivision: data.listing.subdivision_name ?? null,
    },
    { mlsNumber: data.listing.list_number ?? null }
  )
  permanentRedirect(canonicalPath)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listingKey } = await params
  return generateListingMetadata({ params: Promise.resolve({ listingKey }) })
}
