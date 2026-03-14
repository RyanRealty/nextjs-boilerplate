'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { unsaveCommunity } from '@/app/actions/saved-communities'

type Props = { entityKey: string }

export default function RemoveSavedCommunityButton({ entityKey }: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleRemove() {
    startTransition(async () => {
      await unsaveCommunity(entityKey)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={pending}
      className="text-sm font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      {pending ? 'Removing…' : 'Remove'}
    </button>
  )
}
