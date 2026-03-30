import ListingMap from '@/components/listing/ListingMap'

type Props = {
  latitude?: number
  longitude?: number
  price?: number
  address?: string
}

export default function ShowcaseMap({ latitude, longitude, price, address }: Props) {
  if (latitude == null || longitude == null) return null
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <ListingMap
        latitude={latitude}
        longitude={longitude}
        price={price}
        address={address}
      />
    </div>
  )
}
