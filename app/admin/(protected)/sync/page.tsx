export const dynamic = 'force-dynamic'
import YearSyncMatrix from './YearSyncMatrix'
import YearSyncCronStatus from './YearSyncCronStatus'

export default async function SyncPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <YearSyncMatrix />
      <YearSyncCronStatus />
    </main>
  )
}
