import Link from 'next/link'
import {
  Breadcrumb as BreadcrumbNav,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

export type BreadcrumbItem = { label: string; href?: string }

type Props = { items: BreadcrumbItem[]; variant?: 'default' | 'onDark' }

/**
 * Location-based breadcrumb (Home > Listings > City > Subdivision > Listing).
 * Current page is plain text; earlier levels are links. Uses shadcn breadcrumb + design tokens.
 * variant="onDark" for use on the dark (navy) crumb bar (white text).
 */
export default function Breadcrumb({ items, variant = 'default' }: Props) {
  if (items.length === 0) return null
  const isOnDark = variant === 'onDark'
  const listClass = cn(
    'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-base',
    isOnDark ? 'text-primary-foreground' : 'text-muted-foreground'
  )
  const linkClass = isOnDark
    ? 'text-primary-foreground hover:text-primary-foreground/90 hover:underline'
    : 'transition-colors hover:text-foreground hover:underline'
  const pageClass = cn('font-normal', isOnDark ? 'text-primary-foreground' : 'text-foreground')
  const sepClass = isOnDark ? 'text-primary-foreground/80' : 'text-muted-foreground'

  return (
    <BreadcrumbNav aria-label="Breadcrumb" className="mb-0">
      <BreadcrumbList className={listClass}>
        {items.flatMap((item, i) => [
          i > 0 ? (
            <BreadcrumbSeparator key={`sep-${i}`} className={sepClass}>
              <span aria-hidden className="select-none">›</span>
            </BreadcrumbSeparator>
          ) : null,
          <BreadcrumbItem key={i}>
            {item.href ? (
              <BreadcrumbLink asChild>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className={pageClass}>{item.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>,
        ]).filter(Boolean)}
      </BreadcrumbList>
    </BreadcrumbNav>
  )
}
