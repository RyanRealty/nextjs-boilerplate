import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

type ClusterLink = {
  label: string
  href: string
  /** Matches the `activePage` prop to highlight the current page */
  key: string
}

type CityClusterNavProps = {
  /** Display name for the city (e.g. "Bend") */
  cityName: string
  /** URL slug for the city (e.g. "bend") */
  citySlug: string
  /** Which page in the cluster is currently active */
  activePage:
    | 'city'
    | 'homes-for-sale'
    | 'housing-market'
    | 'report'
    | 'guide'
    | 'open-houses'
    | 'filter'
    | 'community'
  /** Slug of the city guide if one exists — omit to hide the guide link */
  guideSlug?: string | null
  /** Additional className for the outer wrapper */
  className?: string
}

/**
 * Topic-cluster internal-linking nav for a city.
 *
 * Renders a wrapped pill-link bar that connects every page in a city's
 * content cluster: city overview, homes for sale, market overview,
 * market report, guide, open houses, and key filter pages.
 *
 * The active page is visually highlighted so the user knows where they are.
 */
export default function CityClusterNav({
  cityName,
  citySlug,
  activePage,
  guideSlug,
  className,
}: CityClusterNavProps) {
  const links: ClusterLink[] = [
    { label: `${cityName} overview`, href: `/cities/${citySlug}`, key: 'city' },
    { label: 'Homes for sale', href: `/homes-for-sale/${citySlug}`, key: 'homes-for-sale' },
    { label: 'Market overview', href: `/housing-market/${citySlug}`, key: 'housing-market' },
    {
      label: 'Market report',
      href: `/reports/city/${encodeURIComponent(cityName)}`,
      key: 'report',
    },
    ...(guideSlug
      ? [{ label: 'Buying & selling guide', href: `/guides/${guideSlug}`, key: 'guide' }]
      : []),
    { label: 'Open houses', href: `/open-houses/${citySlug}`, key: 'open-houses' },
  ]

  const filterLinks: ClusterLink[] = [
    { label: 'Under $500K', href: `/homes-for-sale/${citySlug}/under-500k`, key: 'filter' },
    { label: 'Luxury homes', href: `/homes-for-sale/${citySlug}/luxury`, key: 'filter' },
    { label: 'New listings', href: `/homes-for-sale/${citySlug}/new-listings`, key: 'filter' },
  ]

  const headingId = `cluster-nav-${citySlug}`

  return (
    <nav
      aria-labelledby={headingId}
      className={cn(
        'rounded-lg border border-border bg-card p-5 shadow-sm',
        className,
      )}
    >
      <h3
        id={headingId}
        className="text-base font-semibold text-foreground"
      >
        Explore {cityName}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => {
          const isActive = link.key === activePage
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm font-medium transition',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-muted text-foreground hover:bg-background',
              )}
              {...(isActive ? { 'aria-current': 'page' as const } : {})}
            >
              {link.label}
            </Link>
          )
        })}
      </div>

      <Separator className="my-3" />

      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Browse by
      </p>
      <div className="flex flex-wrap gap-2">
        {filterLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
