/**
 * Apply the place_content migration directly via the Supabase Management API.
 * Usage: npx tsx scripts/apply-place-content-migration.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 
 * If this doesn't work due to missing access tokens, copy the SQL from
 * supabase/migrations/20260421120000_place_content.sql and run it in
 * the Supabase Dashboard SQL editor.
 */
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const sb = createClient(url, key, {
    db: { schema: 'public' },
  })

  // First check if the table already exists
  const { data: existing, error: checkErr } = await sb
    .from('place_content')
    .select('id')
    .limit(1)

  if (!checkErr) {
    console.log('✓ place_content table already exists')
    return
  }

  if (checkErr && !checkErr.message.includes('place_content')) {
    console.log('✓ place_content table appears to exist (got non-table-missing error)')
    return
  }

  console.log('Table does not exist yet. It needs to be created.')
  console.log('')
  console.log('Please run the following SQL in the Supabase Dashboard SQL Editor:')
  console.log('  Project URL:', url)
  console.log('  SQL file: supabase/migrations/20260421120000_place_content.sql')
  console.log('')
  console.log('Or set SUPABASE_ACCESS_TOKEN and run: npm run db:push')
}

main().catch(console.error)
