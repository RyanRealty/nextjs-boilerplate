'use client'

import { useTransition, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/profile'
import type { NotificationPreferences } from '@/app/actions/profile'

type Props = { initialPrefs: NotificationPreferences }

export default function DashboardNotificationPrefs({ initialPrefs }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailEnabled: initialPrefs?.emailEnabled ?? true,
    savedSearchFrequency: initialPrefs?.savedSearchFrequency ?? 'daily',
    priceDropAlerts: initialPrefs?.priceDropAlerts ?? true,
    statusChangeAlerts: initialPrefs?.statusChangeAlerts ?? true,
    openHouseReminders: initialPrefs?.openHouseReminders ?? true,
    marketDigestFrequency: initialPrefs?.marketDigestFrequency ?? 'weekly',
    blogUpdates: initialPrefs?.blogUpdates ?? false,
  })

  const update = useCallback((patch: Partial<NotificationPreferences>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      startTransition(async () => {
        const err = await updateProfile({ notificationPreferences: next })
        if (!err.error) {
          setSaved(true)
          router.refresh()
          setTimeout(() => setSaved(false), 2000)
        }
      })
      return next
    })
  }, [router])

  return (
    <div className="mt-6 space-y-6 rounded-lg border border-border bg-white p-6 shadow-sm">
      {saved && (
        <p className="text-sm font-medium text-green-500" role="status">Saved</p>
      )}
      <div className="flex items-center justify-between gap-4">
        <label className="font-medium text-foreground">Email notifications</label>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.emailEnabled ?? true}
          onClick={() => update({ emailEnabled: !(prefs.emailEnabled ?? true) })}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
            prefs.emailEnabled ?? true
              ? 'border-accent bg-accent'
              : 'border-border bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              prefs.emailEnabled ?? true ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <div>
        <label className="font-medium text-foreground">Saved search matches</label>
        <select
          value={prefs.savedSearchFrequency ?? 'daily'}
          onChange={(e) => update({ savedSearchFrequency: e.target.value as 'instant' | 'daily' | 'weekly' })}
          className="mt-1 block w-full max-w-xs rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
        >
          <option value="instant">Instant</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground">Price drop alerts on saved homes</label>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.priceDropAlerts ?? true}
          onClick={() => update({ priceDropAlerts: !(prefs.priceDropAlerts ?? true) })}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
            prefs.priceDropAlerts ?? true ? 'border-accent bg-accent' : 'border-border bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              prefs.priceDropAlerts ?? true ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground">Status change alerts (pending/sold)</label>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.statusChangeAlerts ?? true}
          onClick={() => update({ statusChangeAlerts: !(prefs.statusChangeAlerts ?? true) })}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
            prefs.statusChangeAlerts ?? true ? 'border-accent bg-accent' : 'border-border bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              prefs.statusChangeAlerts ?? true ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground">Open house reminders</label>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.openHouseReminders ?? true}
          onClick={() => update({ openHouseReminders: !(prefs.openHouseReminders ?? true) })}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
            prefs.openHouseReminders ?? true ? 'border-accent bg-accent' : 'border-border bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              prefs.openHouseReminders ?? true ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <div>
        <label className="font-medium text-foreground">Market digest</label>
        <select
          value={prefs.marketDigestFrequency ?? 'weekly'}
          onChange={(e) => update({ marketDigestFrequency: e.target.value as 'weekly' | 'monthly' | 'off' })}
          className="mt-1 block w-full max-w-xs rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="off">Off</option>
        </select>
      </div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-muted-foreground">Blog / content updates</label>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.blogUpdates ?? false}
          onClick={() => update({ blogUpdates: !(prefs.blogUpdates ?? false) })}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
            prefs.blogUpdates ?? false ? 'border-accent bg-accent' : 'border-border bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              prefs.blogUpdates ?? false ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      {pending && <p className="text-sm text-muted-foreground">Saving…</p>}
    </div>
  )
}
