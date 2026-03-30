const { createClient } = require('@supabase/supabase-js')

function cityEntityKey(city) {
  return city.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function buildGuideHtml(city, stats) {
  const median = stats?.median_sale_price ? `$${Math.round(stats.median_sale_price).toLocaleString()}` : 'Data unavailable'
  const supply = stats?.months_of_supply != null ? `${Number(stats.months_of_supply).toFixed(1)} months` : 'Data unavailable'
  const dom = stats?.avg_days_on_market != null ? `${Math.round(stats.avg_days_on_market)} days` : 'Data unavailable'
  return [
    `<p>${city} remains one of Central Oregon's most active markets. This guide gives buyers and sellers a practical snapshot of the market right now.</p>`,
    '<h2>Current market snapshot</h2>',
    `<ul><li>Median sale price: ${median}</li><li>Months of supply: ${supply}</li><li>Average days on market: ${dom}</li></ul>`,
    '<h2>Buying strategy</h2>',
    `<p>In ${city}, prepared financing and a clean offer package improve your odds in competitive price bands. Work from a clear budget and move quickly on homes that fit your must-have criteria.</p>`,
    '<h2>Selling strategy</h2>',
    '<p>Price to the current demand window, not last season. Homes that launch with complete media and accurate positioning tend to preserve negotiating leverage and reduce time on market.</p>',
    '<h2>Neighborhood fit checklist</h2>',
    `<p>Compare commute, schools, lot sizes, HOA expectations, and long-term resale trends before narrowing your shortlist in ${city}.</p>`,
  ].join('')
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return
  }
  const supabase = createClient(url, key)
  const { data: cityRows } = await supabase
    .from('listings')
    .select('City')
    .not('City', 'is', null)
    .limit(5000)

  const counts = new Map()
  for (const row of cityRows || []) {
    const city = (row.City || '').trim()
    if (!city) continue
    counts.set(city, (counts.get(city) || 0) + 1)
  }

  const topCities = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city]) => city)
  for (const city of topCities) {
    const { data: stat } = await supabase
      .from('market_stats_cache')
      .select('median_sale_price, months_of_supply, avg_days_on_market')
      .eq('geo_level', 'city')
      .eq('geo_name', city)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    const slug = `${cityEntityKey(city)}-housing-market-guide`
    const { error } = await supabase.from('guides').upsert(
      {
        slug,
        title: `${city} Housing Market Guide`,
        meta_description: `A practical market guide for buying and selling in ${city}, with local pricing and inventory context.`,
        content_html: buildGuideHtml(city, stat || null),
        category: 'Market Guides',
        city,
        status: 'published',
        published_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    if (error) console.log(`Failed guide for ${city}: ${error.message}`)
    else console.log(`Upserted guide: ${slug}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
