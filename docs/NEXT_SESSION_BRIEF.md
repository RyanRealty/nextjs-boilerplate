# Next Session Brief — What to Do

## Priority 1: Verify Vercel Deploy
Several commits haven't deployed yet. First thing: verify all code is live on ryanrealty.vercel.app.
Changes pending deploy:
- Listing "No media available" → Central Oregon landscape fallback
- Search page curated hero images
- getCityFromSlug exact match fix
- Loading.tsx skeletons
- Hero video compression (7.3MB → 1.6MB)

## Priority 2: Full Interactive Feature Audit
Test EVERY interactive feature on production by actually clicking/submitting:
- [ ] Save a listing (signed out → prompt sign-in, signed in → saves)
- [ ] Share a listing (copy link, email, text, social)
- [ ] Schedule a Showing form (open modal, fill form, submit)
- [ ] Ask a Question form
- [ ] Contact page form submission
- [ ] Search autocomplete (type a city name)
- [ ] Search filters (price, beds, baths, property type)
- [ ] Map view (loads, clusters, click pin)
- [ ] Draw polygon search
- [ ] Sign in with Google OAuth
- [ ] Sign in with email/password
- [ ] Saved homes page (shows saved listings)
- [ ] Saved searches page
- [ ] Chat widget (opens, responds)
- [ ] Cookie consent (accept, manage preferences)
- [ ] Home valuation form
- [ ] Mortgage calculator (enter values, see payment)
- [ ] Print listing (if implemented)

## Priority 3: Video-First Tiles
When a listing has a video, show it FIRST:
- **In tiles/cards**: Show a poster frame from the video (not the photo), with a small play icon
- **On listing detail**: Video hero plays automatically, photo gallery secondary
- **Performance**: Don't load the full video in tiles — use poster frame + lazy load
- **Smart preview**: Consider 3-5 second autoplay preview on hover (like Netflix thumbnails)
- Implementation: check `listing.details.Videos` array, extract poster frame, update ListingTile and ShowcaseHero

## Priority 4: Sophisticated Imagery for Brokerage Pages
Two imagery tiers across the site:

### Listing-related pages (outdoor/lifestyle Central Oregon):
- City pages, neighborhood pages, community pages, search results, listing detail
- Mountain biking, fly fishing, hiking, skiing, Cascade Mountains
- Already implemented in `lib/central-oregon-images.ts`

### Brokerage/professional pages (luxury/sophisticated):
- About, Team, Contact, Reviews, Join
- Imagery: luxury homes, professional workspaces, tech (MacBooks, iPhones), 
  premium real estate interiors, modern architecture
- Think: Compass/Sotheby's aesthetic — clean, aspirational, tech-forward
- High-end lifestyle: wine, fine dining, modern kitchens, smart home tech
- Update `lib/content-page-hero-images.ts` for these pages

### Where to use each:
| Page | Imagery Style |
|------|--------------|
| Homepage hero | Central Oregon aerial/landscape |
| City pages | Central Oregon city-specific |
| Search/listings | Central Oregon lifestyle |
| Listing detail | Listing's own photos/video |
| Community pages | Central Oregon community-specific |
| **About** | **Luxury/professional — team in modern office or luxury home** |
| **Team** | **Professional headshots, luxury property backdrop** |
| **Contact** | **Sophisticated — modern workspace, tech, premium feel** |
| **Reviews** | **Luxury lifestyle — happy clients in beautiful home** |
| **Join** | **Professional growth — modern office, collaboration** |
| **Sell** | **Luxury home staging, professional photography** |
| **Buy** | **Aspirational — luxury home tour, smart home tech** |

## Priority 5: Community Pages — Deep Research & Beautiful Imagery

### Strategy
Every community/subdivision page must be researched and built out individually:

1. **Research each community** — Find real information about amenities, lifestyle, price points, lot sizes, HOA details, history
2. **Tier the communities**:
   - **Resort communities** (Tetherow, Pronghorn, Sunriver Resort, etc.) — premium treatment with resort amenities, golf, spa
   - **Luxury non-resort** (Broken Top, Awbrey Butte, etc.) — high-end treatment even if not flagged as resort
   - **Standard subdivisions** — clean, professional but simpler layout
3. **Real photos when possible** — search Unsplash for actual community/subdivision images. Owner has uploaded some already.
4. **Fallback hierarchy for hero images**:
   - First: actual community photo (from DB or Unsplash search for community name)
   - Second: a DIFFERENT Central Oregon lifestyle image (not the same as the parent city hero — keep things fresh)
   - Third: parent city image as last resort
5. **Outdoor activity variety** — rotate through mountain biking, fly fishing, hiking, skiing, camping, kayaking, etc.

### Content for each community page
- What makes this community unique
- Amenities (pool, golf, trails, clubhouse, etc.)
- Price range and typical lot sizes
- HOA information if available
- Lifestyle description (who lives here, what's the vibe)
- Nearby attractions and activities

## Priority 6: Every City & Subdivision Must Have an Image

### Requirements
- **Every city page** must have a hero image — even non-Central Oregon cities
- **Every subdivision/community page** must have a hero image
- **No generic "No media" or placeholder gray boxes anywhere**

### Implementation approach
Think about this smartly — there could be hundreds of cities and thousands of subdivisions:
- **Option A: Background process** — Script that iterates through all cities/subdivisions, searches Unsplash for relevant images, and stores the URLs in the DB
- **Option B: On-demand generation** — When a page loads and has no image, fetch one from Unsplash and cache it
- **Option C: Batch script** — Run once to populate all missing images
- The `getOrCreatePlaceBanner` function already does on-demand Unsplash fetching — may need to ensure it works for ALL entities, not just Central Oregon

### Image animation
- Apply a subtle Ken Burns effect (zoom/pan) to hero images — already implemented as `animate-hero-ken-burns` in `globals.css`
- Verify it's applied consistently on ALL hero sections (city, community, search, listing)
- Ensure animation doesn't cause CLS or performance issues

## What Was Already Done (Don't Redo)
- Homepage Performance 66 → 85, LCP 14s → 2.5s desktop
- Layout made non-blocking (header/footer stream independently)
- Curated Central Oregon images for 12 cities + 11 activities
- Footer contrast fixed (31 → 0 failures)
- WCAG AA compliance (muted-foreground darkened)
- City pages show real data (Bend 1002, Sisters 117, Redmond 372)
- Similar listings fallback (city-wide when community too few)
- Market pulse cache populated
- Sitemap index splitting
- Admin placeholder panels replaced
- ~130 lint warnings fixed
- Hero video compressed (7.3MB → 1.6MB)
- Search waterfalls consolidated (4 → 2)

## Lighthouse Scores (Current Production)
| Page | Perf | A11y | BP | SEO |
|------|------|------|-----|-----|
| Homepage | 85 | 93 | 100 | 100 |
| About | 96 | 100 | 100 | 100 |
| Contact | 93 | 100 | 100 | 100 |
| Team | 88 | 96 | 96 | 100 |
| Listing detail | 86 | 94 | 100 | 92 |
| Search/Bend | 75 | 100 | — | 92 |

## Rules to Follow
- `.cursor/rules/no-shortcuts.mdc` — maximum thoroughness, no bare minimum
- `.cursor/rules/definition-of-done.mdc` — screenshot proof before marking done
- `.cursor/rules/complete-scope-and-best-practices.mdc` — execute immediately, full scope
- Always test on production: `ryanrealty.vercel.app`
- Always verify with Playwright screenshots
- Always run Lighthouse after changes
