# Google Setup — IDs, API access, and verification checklist

This file absorbed `GOOGLE_APIS_WHERE_TO_GET.md` and `GOOGLE_VERIFICATION.md` (2026-04-24 governance merge).

---

## Where to get each Google ID

Everything in one place. URLs are written out so you can see and copy them.

### Main place for API access: Google Cloud Console

For any Google API (Analytics reporting, Tag Manager API, AdSense API, etc.) you enable the API and create credentials here:

**Google Cloud Console**
https://console.cloud.google.com

Steps (same for any API):
1. Create or select a project (top bar).
2. Go to: APIs & Services → Library. Search for the API name (e.g. "Google Analytics Data API") and click Enable.
3. Go to: APIs & Services → Credentials. Click Create credentials. Choose API key or Service account (or OAuth client ID if the API needs user login).

---

### Google Analytics 4 (GA4)

**Get your Measurement ID** (the one you put in .env as `NEXT_PUBLIC_GA4_MEASUREMENT_ID`):

**Google Analytics**
https://analytics.google.com

Then: Admin (gear icon) → Data streams → click your web stream → copy "Measurement ID" (looks like G-XXXXXXXXXX).

**Get API access** (to pull reports or data from GA4 in code):

**Cloud Console**
https://console.cloud.google.com

Then: APIs & Services → Library → search "Google Analytics Data API" → Enable. Then APIs & Services → Credentials → Create credentials → Service account. Give that service account "Viewer" on your GA4 property (in GA4: Admin → Property access management).

---

### Google Tag Manager (GTM)

**Get your Container ID** (the one you put in .env as `NEXT_PUBLIC_GTM_CONTAINER_ID`):

**Google Tag Manager**
https://tagmanager.google.com

Then: open your container. The Container ID is at the top (looks like GTM-XXXXXXX).

**Get API access** (to create or edit tags via code):

**Cloud Console**
https://console.cloud.google.com

Then: APIs & Services → Library → search "Tag Manager API" → Enable. Then APIs & Services → Credentials → Create credentials → OAuth 2.0 Client ID (or Service account, depending on how you want to call the API).

---

### Google AdSense

**Get your Publisher ID** (the one you put in .env as `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, looks like ca-pub-XXXXXXXXXXXXXXXX):

**Google AdSense**
https://adsense.google.com

Then: Account → Settings (or Account info) → Publisher ID.

**Get API access** (to pull earnings or reports in code):

**Cloud Console**
https://console.cloud.google.com

Then: APIs & Services → Library → search "AdSense Management API" → Enable. Then APIs & Services → Credentials → Create credentials → OAuth 2.0 Client ID. You also need to complete the OAuth consent screen and add test users if needed.

---

### Google Ads (if you use it later)

**Get your Customer ID:**
https://ads.google.com

Then: open your account. Customer ID is in the top bar or under Tools & settings → Setup → Account (format like 123-456-7890).

**Get API access:**
https://console.cloud.google.com

Enable "Google Ads API", then create OAuth 2.0 Client ID under Credentials. You may also need a Developer token from the Google Ads UI: Tools → API Center.

---

### Quick copy-paste URL list

**Cloud Console (for all API access):**
https://console.cloud.google.com

**Analytics (Measurement ID):**
https://analytics.google.com

**Tag Manager (Container ID):**
https://tagmanager.google.com

**AdSense (Publisher ID):**
https://adsense.google.com

**Google Ads (Customer ID):**
https://ads.google.com

---

### Where you put values in this project

- For the website (tracking, ads script): add to `.env.local` and Vercel Environment Variables. Examples: `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_CONTAINER_ID`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`.

- For server-side or API keys: add to `.env.local` and Vercel without the `NEXT_PUBLIC_` prefix. Use those only in server code or API routes, never in the browser.

- **Google OAuth client (from the client_secret_xxx.json file):** Use the "web" section: put `client_id` in `GOOGLE_OAUTH_CLIENT_ID` and `client_secret` in `GOOGLE_OAUTH_CLIENT_SECRET` in `.env.local` (and in Vercel for production). Do not commit the JSON file or the secret. The app uses these for server-side Google API calls (e.g. GA4 Data API, AdSense Management API).

---

## Verification checklist — do you have these set?

Use this to confirm you have everything. **Where to find it** = where you get the value. **Where it goes** = where you put it (file or UI).

### Required for tracking and analytics (you have these)

| Item | Status | Where to find it | Where it goes |
|------|--------|------------------|---------------|
| **GA4 Measurement ID** | Set | Google Analytics: https://analytics.google.com → Admin → Data streams → your web stream → **Measurement ID** | `.env.local`: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-ST40W4WM6T` (and same in Vercel → Project → Settings → Environment Variables for production) |
| **GTM Container ID** | Set | Google Tag Manager: https://tagmanager.google.com → your container → **Container ID** at top | `.env.local`: `NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-WV6R4NZ5` (and Vercel env for production) |

**How the app uses them:** `components/GoogleAnalytics.tsx` reads these env vars and loads GA4 (gtag.js) and GTM on every page. No GTM UI setup required for basic Analytics.

---

### Required for server-side Google API access (you have these)

| Item | Status | Where to find it | Where it goes |
|------|--------|------------------|---------------|
| **Google OAuth Client ID** | Set | Google Cloud Console: https://console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client ID (type Web). Same as in your `client_secret_*.json` file: `web.client_id` | `.env.local`: `GOOGLE_OAUTH_CLIENT_ID=725620954432-...` (and Vercel env; do **not** use `NEXT_PUBLIC_` — server only) |
| **Google OAuth Client Secret** | Set | Same credentials as above: `web.client_secret` in the JSON file | `.env.local`: `GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...` (and Vercel env; server only) |

**How the app uses them:** Reserved for future server-side calls (e.g. GA4 Data API, AdSense Management API, Tag Manager API). The app does not yet call those APIs; when you add that code, it will use these env vars.

---

### Optional (not set — add only if you use them)

| Item | Status | Where to find it | Where it goes |
|------|--------|------------------|---------------|
| **AdSense Publisher ID** | Not set | AdSense: https://adsense.google.com → Account → Settings (or Account info) → **Publisher ID** (e.g. `ca-pub-XXXXXXXXXXXXXXXX`) | `.env.local`: `NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX` (and Vercel env). The app will then load the AdSense script automatically. |

---

### Not in env — configured elsewhere

| Item | Where to find it | Where it goes |
|------|------------------|---------------|
| **GA4 custom events / audiences / conversions** | GA4 and GTM UIs | In **Google Analytics**: Admin → Events, Conversions, Audiences. In **GTM**: create tags and triggers that fire on your data layer events. The app can push events to `window.dataLayer`; GTM sends them to GA4. |
| **Google Search Console** | https://search.google.com/search-console | Add your property (site URL), verify ownership, submit sitemap (`/sitemap.xml`). Not an env var. |
| **Sign-in with Google (Supabase)** | Google Cloud Console → Credentials → OAuth 2.0 Client ID (can be same or different from above) | **Supabase Dashboard** → Authentication → Providers → Google → paste Client ID and Client Secret. Ensures "Sign in with Google" works on your site. |

---

### Summary

- **You have:** GA4 Measurement ID, GTM Container ID, Google OAuth Client ID, Google OAuth Client Secret. All are in `.env.local` and are used (or ready for use) by the app.
- **Optional:** AdSense — add `NEXT_PUBLIC_ADSENSE_CLIENT_ID` only if you want to show ads.
- **For production:** Add the same four vars (GA4, GTM, OAuth ID, OAuth Secret) to **Vercel** → your project → **Settings** → **Environment Variables**, for the Production (and optionally Preview) environment.

No Google items required by the master instruction set are missing from your current setup for basic tracking and future API use.
