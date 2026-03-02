'use server'
import { createClient } from '@supabase/supabase-js'

// We use the SERVICE_ROLE_KEY here because this script needs permission to UPDATE rows in your database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
)

export async function getGeocodedListings(listings: any[]) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // This loops through the listings you send it
  const updatedListings = await Promise.all(listings.map(async (item) => {
    // If the house already has coordinates in Supabase, don't waste an API call
    if (item.Latitude && item.Longitude) return item;

    // Construct the full address string for Mapbox
    const address = `${item.StreetNumber} ${item.StreetName}, ${item.City}, ${item.State} ${item.PostalCode}`;
    
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}`
      );
      const data = await res.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        
        // SAVE the coordinates back to Supabase so we have them forever
        await supabase
          .from('listings')
          .update({ Latitude: lat, Longitude: lng })
          .eq('ListNumber', item.ListNumber);

        return { ...item, Latitude: lat, Longitude: lng };
      }
    } catch (e) {
      console.error("Geocoding failed for:", address);
    }
    return item;
  }));

  return updatedListings;
}
