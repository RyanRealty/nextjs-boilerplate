# User Journey Specifications

**Purpose**: Every testable user interaction path through the product. Each journey is a Playwright E2E test scenario. When all journeys pass, the product works.

**Last Updated**: 2026-03-30

---

## How to Read This Document

Each journey has:
- **ID**: Unique identifier (UJ-XXX)
- **Actor**: Who performs the action (Anonymous, Signed-in User, Admin, Broker, System)
- **Preconditions**: What must be true before the journey starts
- **Steps**: Numbered sequence of actions
- **Expected Results**: What must be true after all steps
- **Priority**: Critical (launch blocker), High (competitive baseline), Medium (parity), Low (differentiator)

---

## SECTION A: Anonymous Visitor Journeys

### UJ-001: Land on Homepage from Google
**Actor**: Anonymous visitor
**Priority**: Critical
**Preconditions**: Site is deployed, listings exist in database
**Steps**:
1. Navigate to homepage URL
2. Page loads with hero section, search bar, and navigation
3. See sections: hero, market pulse, activity feed, communities, cities
4. Footer is visible with contact info and nav links
**Expected Results**:
- Page loads in under 3 seconds
- Title contains "Ryan Realty" and "Central Oregon"
- Meta description is present and >50 characters
- OG image tag is present
- No layout shift (CLS < 0.1)
- Navigation links (Home, About, Team, Listings) are clickable

### UJ-002: Search by City Name
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. From homepage, locate search bar
2. Type "Bend"
3. Autocomplete dropdown appears with "Bend, OR" suggestion
4. Click/select "Bend, OR"
5. Navigate to /search/bend (or /homes-for-sale/bend)
6. See listing grid with results
7. See listing count (e.g., "245 homes for sale in Bend")
8. See filter bar with price, beds, baths, more filters
**Expected Results**:
- Search page loads in under 3 seconds
- At least 1 listing visible (if data exists)
- Filter bar is functional
- Map view is available
- Page title contains "Bend" and "homes for sale"

### UJ-003: Apply Filters to Search
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. On search results page (/search/bend)
2. Set price range: $300K–$500K
3. Set bedrooms: 3+
4. Set bathrooms: 2+
5. Results update to show filtered listings
6. Result count changes to reflect filters
7. URL updates with filter parameters (shareable)
**Expected Results**:
- All visible listings match filter criteria
- Filter state persists in URL (can be shared/bookmarked)
- Result count is accurate
- Clearing filters restores all results

### UJ-004: Sort Search Results
**Actor**: Anonymous visitor
**Priority**: High
**Steps**:
1. On search results page
2. Click sort dropdown
3. Select "Price: High to Low"
4. Results reorder with highest price first
5. Change to "Newest"
6. Results reorder by list date
**Expected Results**:
- Sort is applied immediately (no page reload)
- All 8 sort options work
- Sort state persists in URL

### UJ-005: View Map and Switch to Map/List View
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. On search results page
2. Click "Map" or map toggle
3. Map view shows with listing pins/clusters
4. Zoom in on a cluster → individual pins appear
5. Click a pin → info popup shows address, price, photo
6. Click "View Details" in popup → navigate to listing
7. Return to search, switch back to list view
**Expected Results**:
- Map loads with Google Maps
- Pins correspond to search results
- Clustering works at zoom levels
- Info popup shows correct listing data
- List/map toggle preserves search state

### UJ-006: Draw Polygon on Map to Search
**Actor**: Anonymous visitor
**Priority**: High
**Steps**:
1. On search results page, switch to map view
2. Click "Draw" tool
3. Draw a polygon around a neighborhood
4. Release drawing → results filter to listings inside polygon
5. Result count updates
6. Clear polygon → results return to normal
**Expected Results**:
- Drawing tool is accessible and intuitive
- Only listings within polygon boundaries shown
- Can clear/redo drawing
- Works on mobile with touch

### UJ-007: View Listing Detail Page
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. From search results, click a listing card
2. Listing detail page loads
3. See photo gallery at top
4. See price, address, key facts (beds, baths, sqft)
5. Scroll to see: description, property details, map, payment estimate
6. See similar listings
7. See area market context
8. See activity feed (nearby)
9. See recently sold nearby
**Expected Results**:
- All sections render with data
- Photos load (first photo immediately, rest lazy)
- Price is formatted correctly
- Key facts are accurate
- Map shows property location
- Monthly payment estimate is reasonable

### UJ-008: Browse Photo Gallery
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. On listing detail page
2. Click main photo → lightbox opens
3. Navigate photos with left/right arrows
4. Photo count shows "3 of 25"
5. Press Escape → lightbox closes
6. On mobile: swipe left/right to navigate
**Expected Results**:
- Lightbox opens full-screen
- All photos load
- Keyboard navigation works (arrows + Escape)
- Touch/swipe works on mobile
- Photo count is accurate

### UJ-009: Try to Save a Listing (Anonymous)
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. On listing detail page, click "Save" button
2. Prompted to sign in
3. Sign-in dialog/redirect appears
**Expected Results**:
- Save button is visible and clickable
- Sign-in prompt appears (not an error)
- After signing in, user is returned to the listing

### UJ-010: Share a Listing
**Actor**: Anonymous visitor
**Priority**: High
**Steps**:
1. On listing detail page, click "Share" button
2. Share menu appears with options: Copy Link, Email, Text, Social
3. Click "Copy Link" → URL copied to clipboard
4. Click "Email" → email client opens with listing URL and summary
5. Click "Text" → SMS dialog opens with listing info
**Expected Results**:
- Share menu shows all options
- Copy Link works (toast confirms)
- Email includes listing title, price, photo URL
- Text message includes listing URL

### UJ-011: Contact Agent from Listing
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. On listing detail page, click "Schedule a Showing" or "Ask a Question"
2. Form/modal appears with name, email, phone, message fields
3. Fill out form and submit
4. Success confirmation shown
**Expected Results**:
- Form is accessible and validates input
- Submission succeeds (or shows meaningful error)
- Lead arrives in Follow Up Boss
- Confirmation is clear (toast or modal)

### UJ-012: Browse Team Page
**Actor**: Anonymous visitor
**Priority**: High
**Steps**:
1. Navigate to /team
2. See broker/agent cards with photos, names, titles
3. Click a broker card → navigate to broker profile
4. See broker bio, listings, contact info
5. Click "Contact" on broker profile → form/action
**Expected Results**:
- Team page shows all active brokers
- Each broker has a photo (or professional placeholder)
- Broker profile page has bio and contact option
- Links work

### UJ-013: Use Home Valuation Tool
**Actor**: Anonymous visitor
**Priority**: High
**Steps**:
1. Navigate to /sell/valuation (or click CTA on homepage)
2. Enter property address
3. Submit form
4. See estimated home value or CMA request confirmation
**Expected Results**:
- Form accepts address input
- Submission creates a lead in FUB
- User gets meaningful response (estimate or "we'll be in touch")

### UJ-014: Browse Market Reports
**Actor**: Anonymous visitor
**Priority**: High
**Steps**:
1. Navigate to /housing-market
2. See Central Oregon overview with city cards
3. Click a city (e.g., Bend)
4. See city-level market report with stats, charts, narrative
5. See median price, DOM, inventory, trends
**Expected Results**:
- Hub page loads with real data
- City report has non-zero statistics
- Charts render
- Narrative text is present and reads naturally
- Market health indicator visible

### UJ-015: Read a Guide/Blog Post
**Actor**: Anonymous visitor
**Priority**: Medium
**Steps**:
1. Navigate to /guides
2. See list of guides organized by category
3. Click a guide (e.g., "Moving to Bend, Oregon")
4. See full article with sections, headings, images
5. See related content links
6. See lead capture CTA within article
**Expected Results**:
- Guide index page lists published guides
- Guide detail page has substantial content (not thin/empty)
- Article has proper heading hierarchy
- FAQ schema markup present (check source)

### UJ-016: Browse Open Houses
**Actor**: Anonymous visitor
**Priority**: Medium
**Steps**:
1. Navigate to /open-houses
2. See upcoming open houses with dates/times
3. Filter by city
4. Click a listing → navigate to listing detail
5. See open house banner on listing detail
**Expected Results**:
- Open house page shows listings with valid future dates
- City filter works
- Open house times are correctly formatted

### UJ-017: Use Mortgage Calculator
**Actor**: Anonymous visitor
**Priority**: Medium
**Steps**:
1. Navigate to /tools/mortgage-calculator
2. Enter home price, down payment, interest rate, term
3. See monthly payment breakdown
4. Adjust inputs → payment updates
**Expected Results**:
- Calculator renders with sensible defaults
- Inputs accept user values
- Payment calculation is mathematically correct
- Breakdown shows principal, interest, tax, insurance

### UJ-018: View Community Page
**Actor**: Anonymous visitor
**Priority**: High
**Steps**:
1. Navigate to /search/bend/tetherow (or any community)
2. See community overview, description, amenities
3. See community-specific listings
4. See market stats for the community
5. See activity feed for the community
6. See nearby communities
**Expected Results**:
- Community page has specific content (not generic)
- Listings are filtered to the community
- Market stats are community-specific
- Navigation to nearby communities works

### UJ-019: Navigate Between Pages
**Actor**: Anonymous visitor
**Priority**: Critical
**Steps**:
1. From homepage, click each main nav link
2. Home → loads homepage
3. About → loads about page
4. Team → loads team page
5. Listings → loads listings browse
6. Navigate back with browser back button
7. Check footer links
**Expected Results**:
- All nav links work (no 404s)
- Back button works correctly
- No flash of unstyled content
- Active page indicated in nav

### UJ-020: Mobile Experience
**Actor**: Anonymous visitor on phone (375px viewport)
**Priority**: Critical
**Steps**:
1. Open homepage on mobile
2. No horizontal overflow
3. Navigation is accessible (hamburger menu or equivalent)
4. Search bar is usable on mobile
5. Listing cards are readable (single column)
6. Listing detail sections stack properly
7. Photo gallery works with touch
8. Contact forms are usable on mobile
9. Filters accessible on mobile (sheet/drawer)
**Expected Results**:
- No horizontal scrolling on any page
- Touch targets are minimum 44x44px
- Text is readable without zooming
- All features accessible on mobile

---

## SECTION B: Signed-In User Journeys

### UJ-030: Sign In with Google
**Actor**: Visitor
**Priority**: Critical
**Steps**:
1. Click "Sign In" in header
2. Google OAuth dialog appears
3. Select Google account and authorize
4. Redirected back to site
5. Header shows user avatar/name
6. Account dropdown shows: Saved Homes, Saved Searches, Profile
**Expected Results**:
- OAuth flow completes without error
- User is registered in Supabase Auth
- FUB Registration event sent
- User can access account pages

### UJ-031: Save a Listing
**Actor**: Signed-in user
**Priority**: Critical
**Steps**:
1. Navigate to a listing detail page
2. Click "Save" button
3. Button state changes to "Saved" (filled heart)
4. Navigate to Account → Saved Homes
5. See the saved listing in the list
6. Click "Unsave" → listing removed from saved
**Expected Results**:
- Save action succeeds immediately (optimistic UI)
- Saved state persists across page loads
- Saved homes page shows all saved listings
- Unsave works correctly

### UJ-032: Save a Search
**Actor**: Signed-in user
**Priority**: Critical
**Steps**:
1. Navigate to /search/bend
2. Apply filters (e.g., 3+ beds, $300K–$500K)
3. Click "Save Search" button
4. Search saved confirmation
5. Navigate to Account → Saved Searches
6. See the saved search with filter criteria
7. Click saved search → returns to search with filters applied
**Expected Results**:
- Search criteria captured accurately
- Saved search page shows all searches
- Clicking a saved search restores exact filter state
- Can delete saved searches

### UJ-033: Receive Email Alert for Saved Search
**Actor**: Signed-in user (with saved search)
**Priority**: High
**Steps**:
1. User has a saved search for "Bend, 3+ beds, under $500K"
2. New listing matching criteria is synced
3. Saved search alert cron runs
4. User receives email with matching listing(s)
5. Email contains listing photo, price, link to listing
6. Clicking link in email opens listing detail page
**Expected Results**:
- Email is sent to user's registered email
- Email content is accurate (correct listing data)
- Links in email work correctly
- Unsubscribe option available

### UJ-034: View Browsing History
**Actor**: Signed-in user
**Priority**: High
**Steps**:
1. View 3 different listings
2. Navigate to Dashboard → History
3. See all 3 viewed listings in chronological order
4. Click a listing in history → navigate to listing detail
**Expected Results**:
- History shows all viewed listings
- Most recent at top
- Listing data (photo, price, address) is correct
- Links work

### UJ-035: Set Buying Preferences
**Actor**: Signed-in user
**Priority**: Medium
**Steps**:
1. Navigate to Account → Buying Preferences
2. Set price range, preferred cities, property types, beds/baths
3. Save preferences
4. Navigate to homepage → see personalized recommendations
**Expected Results**:
- Preferences form is intuitive
- Save succeeds
- Preferences influence homepage content (or at minimum, saved for future use)

### UJ-036: Edit Profile
**Actor**: Signed-in user
**Priority**: Medium
**Steps**:
1. Navigate to Account → Profile
2. See current name, email, avatar
3. Edit name
4. Save changes
5. Header reflects updated name
**Expected Results**:
- Profile page shows current info
- Edit form works
- Changes persist after save

### UJ-037: Share a Listing via All Channels
**Actor**: Signed-in user
**Priority**: High
**Steps**:
1. On listing detail, click Share
2. Share via Copy Link → link in clipboard
3. Share via Email → email client opens with listing details
4. Share via Text/SMS → SMS dialog with listing link
5. Share via WhatsApp → WhatsApp with listing preview
6. Share via Instagram → appropriate share action
**Expected Results**:
- All share channels work
- Shared content includes listing title, price, photo, and link
- OG image renders correctly in share previews

### UJ-038: Export Personal Data
**Actor**: Signed-in user
**Priority**: Low
**Steps**:
1. Navigate to Account → Settings or Profile
2. Click "Export My Data"
3. Download file with saved homes, searches, preferences, history
**Expected Results**:
- Export completes
- File contains all user data
- GDPR/CCPA compliance

---

## SECTION C: Admin Journeys

### UJ-050: Admin Login
**Actor**: Admin
**Priority**: Critical
**Steps**:
1. Navigate to /admin/login
2. Enter credentials
3. Redirected to admin dashboard
4. See system health, sync status, leads, analytics
**Expected Results**:
- Login succeeds for admin users
- Non-admin users redirected to access denied
- Dashboard loads with real data (not placeholders)

### UJ-051: Trigger Listing Sync
**Actor**: Admin
**Priority**: High
**Steps**:
1. Navigate to Admin → Sync
2. See sync status (last run, cursor position, cron status)
3. Click "Trigger Sync" button
4. Sync runs, progress updates
5. See sync results (listings added/updated/removed)
**Expected Results**:
- Sync UI shows accurate status
- Trigger button works
- Sync completes without error
- New/updated listings appear on the site

### UJ-052: Manage Brokers
**Actor**: Admin
**Priority**: High
**Steps**:
1. Navigate to Admin → Brokers
2. See list of all brokers
3. Click "Edit" on a broker
4. Update bio, photo, social links
5. Save changes
6. Visit /team/[slug] → see updated info
**Expected Results**:
- Broker list shows all brokers
- Edit form is functional
- Changes reflect on public broker page
- Photo upload works

### UJ-053: Create and Publish a Guide
**Actor**: Admin
**Priority**: Medium
**Steps**:
1. Navigate to Admin → Guides
2. Click "New Guide"
3. Enter title, slug, category, content
4. Save as draft
5. Preview the guide
6. Publish the guide
7. Visit /guides/[slug] → see published guide
**Expected Results**:
- Guide creation flow is intuitive
- Rich text editing works
- Draft/publish states work
- Published guide is accessible publicly
- Guide appears in /guides index

### UJ-054: View Lead/Inquiry Dashboard
**Actor**: Admin
**Priority**: High
**Steps**:
1. Navigate to Admin → Dashboard
2. See lead count panel with recent inquiries
3. See lead sources breakdown
4. Click into a specific lead → see details
**Expected Results**:
- Lead data is real (from listing inquiries table)
- Counts are accurate
- Source attribution visible

### UJ-055: Manage Site Content
**Actor**: Admin
**Priority**: Medium
**Steps**:
1. Navigate to Admin → Site Pages
2. Edit the About page content
3. Save changes
4. Visit /about → see updated content
**Expected Results**:
- Site pages editor works
- Changes reflect immediately on public pages

### UJ-056: View Analytics Dashboard
**Actor**: Admin
**Priority**: Medium
**Steps**:
1. Navigate to Admin → Dashboard → GA4 panel
2. See traffic metrics (page views, sessions, top pages)
3. See lead conversion metrics
4. See search console metrics (if configured)
**Expected Results**:
- GA4 data renders (requires GOOGLE_GA4_PROPERTY_ID)
- If not configured, shows clear "configure this" message (not blank)

---

## SECTION D: SEO & Crawler Journeys

### UJ-070: Google Crawls Sitemap
**Actor**: Googlebot
**Priority**: Critical
**Steps**:
1. Request /sitemap.xml
2. Parse sitemap index (or sitemap file)
3. Each URL in sitemap returns 200
4. No URLs return 404 or 500
**Expected Results**:
- /sitemap.xml returns valid XML
- All listed URLs are accessible
- URL count matches expected pages
- No duplicate URLs

### UJ-071: Every Public Page Has Meta Tags
**Actor**: Crawler
**Priority**: Critical
**Steps**:
1. Request each public page type
2. Check for: title, meta description, og:title, og:description, og:image, canonical
**Expected Results**:
- Every page has unique title
- Every page has description >50 chars
- Every page has og:image
- Canonical URL matches the page URL

### UJ-072: Structured Data Validates
**Actor**: Crawler
**Priority**: High
**Steps**:
1. Request listing detail page
2. Extract JSON-LD
3. Validate against schema.org
4. Check for Product/Offer (listing), Person (agent), BreadcrumbList
**Expected Results**:
- JSON-LD is valid JSON
- Schema types are correct
- Required properties are present

### UJ-073: AI Crawler Can Access Content
**Actor**: GPTBot / PerplexityBot / ClaudeBot
**Priority**: Critical
**Steps**:
1. Check robots.txt for AI crawler permissions
2. Request key pages as AI crawler
3. Extract meaningful content
**Expected Results**:
- robots.txt allows AI crawlers
- Pages return full HTML (not blocked)
- Content is extractable (clear headings, structured data)

### UJ-074: Page Performance Meets Core Web Vitals
**Actor**: Lighthouse
**Priority**: Critical
**Steps**:
1. Run Lighthouse on homepage, search page, listing detail
2. Check LCP < 2.5s, CLS < 0.1, FID < 100ms
3. Check Performance score > 80
4. Check SEO score > 90
5. Check Accessibility score > 95
**Expected Results**:
- All metrics within thresholds
- No critical performance regressions

---

## SECTION E: System Journeys

### UJ-080: Listing Sync Pipeline
**Actor**: System (Cron)
**Priority**: Critical
**Steps**:
1. Cron triggers /api/cron/sync-full
2. Sync fetches listings from Spark API
3. New listings inserted into Supabase
4. Updated listings merged
5. Removed/expired listings status updated
6. Post-sync hooks fire (market pulse refresh)
7. Activity feed updates with new/changed listings
**Expected Results**:
- Sync completes without error
- Listing counts match Spark source
- Market data refreshed after sync
- Admin sync status shows completion

### UJ-081: Saved Search Alert Pipeline
**Actor**: System (Cron)
**Priority**: High
**Steps**:
1. Cron triggers /api/cron/saved-search-alerts
2. System evaluates each saved search against new listings
3. For searches with matches, compose email
4. Send email via Resend
5. Track which alerts were sent (prevent duplicates)
**Expected Results**:
- Matching is accurate
- Emails send successfully
- No duplicate alerts
- Unsubscribed users don't receive emails

### UJ-082: Market Report Generation
**Actor**: System (Cron)
**Priority**: Medium
**Steps**:
1. Cron triggers /api/cron/market-report (weekly Saturday)
2. System computes market statistics for current period
3. Generates narrative via template engine
4. Creates/updates market report page
5. OG image generated for sharing
**Expected Results**:
- Report contains current data
- Narrative reads naturally
- Report is accessible at /housing-market/reports/[slug]

### UJ-083: Optimization Health Check
**Actor**: System (Cron)
**Priority**: Medium
**Steps**:
1. Cron triggers /api/cron/optimization-loop (weekly Monday)
2. System checks: sync freshness, listing counts, market data freshness, config completeness, lead pipeline health
3. Findings stored in optimization_runs table
4. Admin dashboard shows findings
**Expected Results**:
- Checks complete without error
- Findings are actionable
- Critical issues flagged prominently

### UJ-084: Lead Capture → CRM Pipeline
**Actor**: System
**Priority**: Critical
**Steps**:
1. User submits listing inquiry form
2. Inquiry stored in Supabase `listing_inquiries`
3. FUB event sent with correct type (Property Inquiry)
4. Agent attribution from cookie applied
5. UTM data from session applied
6. Lead appears in FUB with all data
**Expected Results**:
- No lead is lost (every submission reaches FUB)
- Attribution is correct
- Agent assignment works
- Event type matches the form type

---

## Journey Count Summary

| Section | Count | Priority Breakdown |
|---------|-------|--------------------|
| A: Anonymous Visitor | 20 | 8 Critical, 7 High, 5 Medium |
| B: Signed-In User | 9 | 3 Critical, 4 High, 1 Medium, 1 Low |
| C: Admin | 7 | 1 Critical, 3 High, 3 Medium |
| D: SEO/Crawler | 5 | 3 Critical, 2 High |
| E: System | 5 | 2 Critical, 2 High, 1 Medium |
| **Total** | **46** | **17 Critical, 18 High, 10 Medium, 1 Low** |

*Additional journeys will be added as new features are specified (draw-on-map, AI search, shared collections, etc.)*

---

*This document is maintained by the QA Engineer role. Each journey maps to one or more Playwright E2E tests in `e2e/`.*
