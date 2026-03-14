'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { unsaveListing } from '@/app/actions/saved-listings'

type Props = { listingKey: string }

export default function DashboardSavedActions({ listingKey }: Props) {
  const [pending, startTransition] = useTransition()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const router = useRouter()

  function handleRemove() {
    if (!confirmRemove) {
      setConfirmRemove(true)
      return
    }
    startTransition(async () => {
      await unsaveListing(listingKey)
      setConfirmRemove(false)
      router.refresh()
    })
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {confirmRemove ? (
        <>
          <span className="text-sm text-muted-foreground">Remove from saved?</span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
          >
            {pending ? 'Removing…' : 'Yes, remove'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmRemove(false)}
            className="text-sm font-medium text-muted-foreground hover:text-muted-foreground"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleRemove}
          className="text-sm font-medium text-muted-foreground hover:text-destructive"
        >
          Remove
        </button>
      )}
    </div>
  )
}
