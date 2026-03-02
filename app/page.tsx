import { createClient } from '@supabase/supabase-js'

// 1. Connect to your Database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function Home() {
  // 2. Ask the database for the first 10 houses
  const { data: listings } = await supabase
    .from('listings')
    .select('ListingKey, ListPrice, City, BedroomsTotal, StandardStatus')
    .limit(10)

  return (
    <main style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>Current Listings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {listings?.map((house) => (
          <div key={house.ListingKey} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ margin: '0 0 10px 0' }}>{house.City}</h2>
            <p><strong>Price:</strong> ${Number(house.ListPrice).toLocaleString()}</p>
            <p><strong>Beds:</strong> {house.BedroomsTotal}</p>
            <p><strong>Status:</strong> {house.StandardStatus}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
