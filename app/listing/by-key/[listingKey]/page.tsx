import ListingDetailPage from '@/app/listing/[listingKey]/page'
import { generateMetadata as generateListingMetadata } from '@/app/listing/[listingKey]/page'
import type { Metadata } from 'next'

type PageProps = {
  params: Promise<{ listingKey: string }>
}

export default async function ListingByKeyPage({ params }: PageProps) {
  const { listingKey } = await params
  return <ListingDetailPage params={Promise.resolve({ listingKey })} />
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listingKey } = await params
  return generateListingMetadata({ params: Promise.resolve({ listingKey }) })
}
