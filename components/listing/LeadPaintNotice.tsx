'use client'

/**
 * Federal lead-based paint notice for properties built before 1978.
 * Display below property details when year_built < 1978.
 */

const EPA_URL = 'https://www.epa.gov/lead/protect-your-family-exposure-lead'

export interface LeadPaintNoticeProps {
  yearBuilt: number | null | undefined
}

export default function LeadPaintNotice({ yearBuilt }: LeadPaintNoticeProps) {
  if (yearBuilt == null || yearBuilt >= 1978) return null

  return (
    <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Homes built before 1978 may contain lead-based paint.{' '}
      <a
        href={EPA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline hover:no-underline"
      >
        Learn more
      </a>
    </p>
  )
}
