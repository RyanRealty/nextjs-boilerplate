import { createClient } from '@supabase/supabase-js'
import ListingMap from '@/components/ListingMap'
import { getGeocodedListings } from '@/actions/geocode'

// 1. CONNECT TO DATABASE: This allows the page to talk to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function SearchPage({ params }: { params: { slug: string[] } }) {
  // 2. READ THE URL: We extract the City and Subdivision from the web address
  // Example: /search/bend/pronghorn -> city = 'bend', subdivision = 'pronghorn'
  const [city, subdivision] = params.slug;

  // 3. FETCH THE DATA: We ask Supabase for homes matching those specific words
  let query = supabase.from('listings').select('*');
  
  if (city) {
    query = query.ilike('City', city); 
  }
  
  if (subdivision) {
    // decodeURIComponent handles spaces in names like "Caldera Springs"
    query = query.ilike('SubdivisionName', decodeURIComponent(subdivision));
  }

  const { data: rawListings, error } = await query.limit(40);

  // 4. RUN THE ENGINE: We send the houses to our Geocoder to get Map Pins
  const listings = await getGeocodedListings(rawListings || []);

  return (
    <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* 5. DYNAMIC TITLE: The heading changes based on the page */}
      <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>
        Homes for sale in {subdivision ? decodeURIComponent(subdivision) : city}
      </h1>

      {/* 6. THE MAP: Shows all found listings on the Mapbox map */}
      <div style={{ marginBottom: '30px', border: '1px solid #eee', borderRadius: '12px' }}>
        <ListingMap listings={listings} />
      </div>

      {/* 7. THE GRID: Displays the actual house cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {listings?.map((h) => (
          <div key={h.ListNumber} style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <img 
               src={h.PhotoURL || 'https://via.placeholder.com/400x250?text=No+Photo'} 
               style={{ width: '100%', height: '180px', objectFit: 'cover' }} 
            />
            <div style={{ padding: '15px' }}>
              <h2 style={{ margin: '0', color: '#0070f3' }}>${Number(h.ListPrice).toLocaleString()}</h2>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>{h.BedroomsTotal} Bed | {h.BathroomsTotal} Bath</p>
              <p style={{ fontSize: '0.9rem', color: '#666' }}>{h.StreetNumber} {h.StreetName}</p>
              <p style={{ fontSize: '0.8rem', color: '#999' }}>{h.SubdivisionName}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 8. SEO FOOTER: This helps the Google Robot find the other pages */}
      <footer style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
         <p>Search more areas: <a href="/search/bend">Bend</a> | <a href="/search/sunriver">Sunriver</a></p>
      </footer>
    </main>
  );
}
