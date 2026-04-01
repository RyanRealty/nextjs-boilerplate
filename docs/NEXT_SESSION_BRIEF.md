# Launch Readiness Audit — Session Report

**Date:** April 1, 2026
**Site:** ryanrealty.vercel.app
**Status:** Launch-ready. All 5 blocking issues fixed, all routes returning 200, lead capture flows audited and hardened.

---

## WHAT WAS DONE IN THIS SESSION

### 5 Pre-Launch Issues — All Fixed

#### 1. ✅ Sitemap 404 → Fixed
**Root cause:** Next.js 16 with `generateSitemaps()` creates chunked sitemaps at `/sitemap/[id].xml` but does NOT auto-generate a `/sitemap.xml` index. This is a known Next.js bug (#77304).

**Fix:** Removed `generateSitemaps()` from `app/sitemap.ts`. For a Central Oregon regional site, total URLs are well under Google's 50,000 limit per sitemap file, so a single sitemap works perfectly. Next.js now serves it directly at `/sitemap.xml`.

**Verified:** `curl /sitemap.xml` returns 200 with valid XML containing all pages, listings, cities, communities, and more.

#### 2. ✅ /sign-in 404 → Fixed
**Fix:** Added permanent redirect in `next.config.ts`: `/sign-in` → `/login` (also handles `/sign-in/:path*` → `/login/:path*` for query params).

**Verified:** `curl -I /sign-in` returns 308 redirect to `/login`.

#### 3. ✅ Site URL Consistency → Fixed
**Fix:**
- `app/robots.ts` now uses `getCanonicalSiteUrl()` instead of hardcoded `ryanrealty.vercel.app` fallback
- `app/videos/page.tsx` fallback changed from `ryanrealty.vercel.app` to `ryan-realty.com`
- All fallback domains now consistently use `ryan-realty.com`

**⚠️ Owner action required:** Set `NEXT_PUBLIC_SITE_URL` in Vercel production env to your actual production domain (e.g. `https://ryan-realty.com`). See `docs/LAUNCH_CHECKLIST.md`.

#### 4. ✅ Communities Prerender → Fixed
**Fix:** Added `export const dynamic = 'force-dynamic'` to `app/communities/page.tsx`. The page was already rendering dynamically (calls `getSession()` → `cookies()`), but the explicit declaration prevents CI build edge cases.

#### 5. ✅ Google Maps Key → Fixed
**Fix:** Changed `components/compare/CompareClient.tsx` from `NEXT_PUBLIC_GOOGLE_MAPS_KEY` to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (matching all other files and `.env.example`).

---

### Lead Capture & Tracking Audit — Bugs Found and Fixed

Performed a complete code-path audit of all lead capture flows. Found and fixed critical bugs:

1. **FUB API calls lacked try/catch** — `sendEvent()`, `findPersonByEmail()`, and `findUserByEmail()` in `lib/followupboss.ts` had no error handling around `fetch()`. A network error (DNS failure, timeout, etc.) would crash the entire lead flow. Fixed: all three functions now have try/catch with console.error logging.

2. **CMA PDF download blocked by FUB** — The `/api/pdf/cma` route was `await`-ing `sendEvent()` before returning the PDF. If FUB was slow or down, the user would get a timeout or 500 instead of their CMA. Fixed: FUB tracking is now fire-and-forget (`.catch()` logged, response returned immediately).

3. **Listing inquiry error after successful save** — `submitListingInquiry()` was `await`-ing FUB tracking after a successful database insert. If FUB failed, the user would see an error even though their inquiry was saved. Fixed: FUB tracking is now fire-and-forget.

Full audit report: `docs/audits/lead-capture-tracking-audit.md`

---

### End-to-End Testing Results

**All 35+ routes tested and returning 200:**
- Homepage, all city pages, community pages, listing detail pages
- About, Team, Contact, Reviews, Buy, Sell, Join
- Home Valuation, Mortgage Calculator, Appreciation Tool
- Market Reports, Housing Market hub, Explore, Central Oregon
- Communities, Open Houses, Compare, Videos, Activity Feed
- Blog, Guides, Resources, Our Homes
- Login, Signup, Dashboard pages (auth-gated)
- Legal pages (Privacy, Terms, Accessibility, Fair Housing, DMCA)
- Admin pages (auth-gated, superuser-only)

**All redirects working:**
- `/sign-in` → `/login` (308)
- `/search` → `/homes-for-sale` (308)
- `/agents` → `/team` (308)
- `/reports` → `/housing-market/reports` (308)
- `/home-valuation` → `/sell/valuation` (308)

**Visual verification (browser):**
- Homepage: Hero with real aerial photo, search bar, Google reviews, listing activity feed with real prices
- Home Valuation: Form renders with all fields (address, name, email, phone)
- Contact: Form with inquiry type dropdown, office info
- Market Reports: Live data table with real MLS metrics (sold count, median price, DOM, inventory)
- Login: Google OAuth, Facebook OAuth, email/password options
- Sitemap.xml: Valid XML with all page URLs
- Robots.txt: Correct disallows, AI bot user agents, correct sitemap URL
- Communities: Resort and master-planned communities with cards
- Listing detail: Photo gallery, breadcrumbs, price, key facts, demand indicators, agent CTA
- Compare: Clean empty state with "Browse Homes" CTA

---

### Build & Test Results

- `npm run build` ✅ (passes clean)
- `npm run test` ✅ (251 tests, all passing)
- All routes marked as `ƒ (Dynamic)` or `○ (Static)` — correct rendering modes

---

## LAUNCH CHECKLIST

A complete, step-by-step launch checklist has been created at:

**`docs/LAUNCH_CHECKLIST.md`**

Covers:
1. Domain & DNS setup
2. All Vercel environment variables (what each one does, where to get it)
3. Supabase Auth configuration (redirect URLs, Google OAuth)
4. Vercel Cron Jobs (current schedules + recommended changes)
5. Google Services (Maps, GA4, Search Console)
6. Resend email domain verification
7. Rate limiting setup (Upstash Redis)
8. Post-launch verification steps
9. Ongoing monitoring

---

## KNOWN ITEMS (Not Bugs — Design Decisions)

1. **Contact form has no database persistence.** Other lead flows (valuation, listing inquiry, RSVP) write to DB tables first, then send to FUB. Contact form goes directly to FUB. If FUB is down, the contact notification email is the only backup. This is low risk since FUB has 99.9%+ uptime, but if you want belt-and-suspenders, a `contact_submissions` table could be added.

2. **Cron schedule mismatch.** `vercel.json` has `sync-full` weekly and `sync-delta` daily. For a live site with active listings, you may want more frequent sync. See the launch checklist for recommended schedules.

3. **Domain ambiguity.** The codebase defaults to `ryan-realty.com` (with hyphen). The session brief mentions `ryanrealty.com` (no hyphen). Make sure `NEXT_PUBLIC_SITE_URL` matches your actual domain.

---

## FILES CHANGED THIS SESSION

### Pre-Launch Fixes
- `app/sitemap.ts` — Removed `generateSitemaps()`, switched to single sitemap served at `/sitemap.xml`
- `next.config.ts` — Added `/sign-in` → `/login` redirect
- `app/robots.ts` — Uses `getCanonicalSiteUrl()` instead of hardcoded fallback
- `app/videos/page.tsx` — Fixed fallback domain to `ryan-realty.com`
- `app/communities/page.tsx` — Added `export const dynamic = 'force-dynamic'`
- `components/compare/CompareClient.tsx` — Fixed env var name `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Bug Fixes
- `lib/followupboss.ts` — Added try/catch to `sendEvent()`, `findPersonByEmail()`, `findUserByEmail()`
- `app/api/pdf/cma/route.ts` — Made FUB tracking fire-and-forget
- `app/actions/track-contact-agent.ts` — Made FUB tracking fire-and-forget in `submitListingInquiry()`

### Documentation
- `docs/LAUNCH_CHECKLIST.md` — New: comprehensive launch checklist
- `docs/audits/lead-capture-tracking-audit.md` — New: detailed audit of all lead flows
