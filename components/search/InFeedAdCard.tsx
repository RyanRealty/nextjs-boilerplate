import AdUnit from '@/components/AdUnit'

type Props = {
  slot: string
}

export default function InFeedAdCard({ slot }: Props) {
  return <AdUnit slot={slot} format="rectangle" className="h-full" />
}
