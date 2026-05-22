# Netly

Netly helps New Zealanders understand where their money is going, track repeat spending, and compare whether another card could provide better value based on real spending behaviour.

The app connects to Akahu for account and transaction data, uses Akahu merchant/category enrichment where available, and falls back to demo data during local development.

Main features:
- Spending dashboard with balances, income tracking, spend rhythm, and review signals
- Transaction feed with merchant/category enrichment
- Budget and recurring payment tracking
- Card comparison and rewards-fit analysis
- Custom category overrides and colour settings
- Demo mode for local testing without live bank connections

Tech stack:
- Next.js App Router
- React
- TypeScript
- TailwindCSS
- Chart.js
- Akahu API

## Running Locally

```bash
npm install
npm run build
npm run dev
```

`app/globals.css` is intentionally lowercase because Next imports it from `app/layout.tsx` as `./globals.css`. If local styles look stale during development, the cause is usually the Next `.next` cache or an old browser/PWA cache, not CSS filename casing. Restart with a clean Next cache:

```bash
npm run dev:fresh
```

Open:

```text
http://localhost:3000
```

Copy `.env.example` to `.env.local` and add Akahu credentials if testing against real data.

The app also supports demo/local fallback data so most UI work can be done without connecting accounts.

---

## Environment Variables

Do not commit real secrets. Keep `.env.local` local, and configure deployment values in Vercel per environment.

### Core

| Variable | Required | Where | Notes |
|---|---:|---|---|
| `APP_BASE_URL` | Yes | Local, Preview, Production | Public app URL used after OAuth callbacks. |

Use one value per environment:

```env
# Local
APP_BASE_URL=http://localhost:3000

# Vercel Preview / dev domain
APP_BASE_URL=https://dev-netly.krithikl.com

# Vercel Production
APP_BASE_URL=https://netly.krithikl.com
```

### Akahu

| Variable | Required | Where | Notes |
|---|---:|---|---|
| `AKAHU_BASE_URL` | Yes | All | Usually `https://api.akahu.io/v1`. |
| `AKAHU_OAUTH_URL` | Yes | All | Usually `https://oauth.akahu.nz`. |
| `AKAHU_APP_TOKEN` | Yes for real Akahu data | All real-data envs | Akahu app token. Local UI token paste can be used instead for development. |
| `AKAHU_APP_SECRET` | Required for Akahu OAuth | All OAuth envs | Server-side only. Do not expose publicly. |
| `AKAHU_REDIRECT_URI` | Required for Akahu OAuth | All OAuth envs | Must exactly match the URI registered in Akahu. |
| `AKAHU_COOKIE_SECRET` | Yes when saving Akahu tokens | All real-data envs | At least 32 characters. Keep stable or saved Akahu cookies stop decrypting. |
| `AKAHU_REQUEST_TIMEOUT_MS` | Optional | All | Request timeout, e.g. `12000`. |
| `AKAHU_MANUAL_REFRESH_COOLDOWN_MINUTES` | Optional | All | Defaults to 60 minutes without `AKAHU_APP_SECRET`, 15 minutes with it. |
| `AKAHU_OAUTH_SCOPE` | Optional | All | Use `ENDURING_CONSENT` for normal enduring connections. |
| `AKAHU_USER_TOKEN` | Optional | Local only | Personal App token fallback. Prefer pasting through Connect during local testing. |

Akahu redirect examples:

```env
# Local
AKAHU_REDIRECT_URI=http://localhost:3000/api/akahu/callback

# Preview
AKAHU_REDIRECT_URI=https://dev-netly.krithikl.com/api/akahu/callback

# Production
AKAHU_REDIRECT_URI=https://netly.krithikl.com/api/akahu/callback
```

### Google Drive Backup

Netly uses Google Drive's hidden `appDataFolder` for encrypted archive backups. The current implementation uses server-side OAuth so Google can issue a refresh token. The refresh token is stored in an encrypted HttpOnly cookie.

| Variable | Required | Where | Notes |
|---|---:|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | All Drive-enabled envs | OAuth Web application client ID. Google client IDs are public; server Drive OAuth reads this same value. |
| `GOOGLE_CLIENT_SECRET` | Yes | All Drive-enabled envs | OAuth Web application client secret. Server-side only. |
| `GOOGLE_REDIRECT_URI` | Yes | All Drive-enabled envs | Must exactly match one authorized redirect URI in Google Cloud Console. |
| `GOOGLE_COOKIE_SECRET` | Yes | All Drive-enabled envs | At least 32 characters. Keep stable or Drive refresh-token cookies stop decrypting. |

Add these redirect URIs to the Google Cloud OAuth client:

```text
http://localhost:3000/api/google-drive/callback
https://dev-netly.krithikl.com/api/google-drive/callback
https://netly.krithikl.com/api/google-drive/callback
```

Use one `GOOGLE_REDIRECT_URI` per environment:

```env
# Local
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# Vercel Preview / dev domain
GOOGLE_REDIRECT_URI=https://dev-netly.krithikl.com/api/google-drive/callback

# Vercel Production
GOOGLE_REDIRECT_URI=https://netly.krithikl.com/api/google-drive/callback
```

Recommended Vercel setup:

- Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_COOKIE_SECRET` in both Preview and Production.
- Set `GOOGLE_REDIRECT_URI=https://dev-netly.krithikl.com/api/google-drive/callback` for Preview.
- Set `GOOGLE_REDIRECT_URI=https://netly.krithikl.com/api/google-drive/callback` for Production.
- Keep `GOOGLE_COOKIE_SECRET` stable within each environment.

---

## Project Structure

```text
app/
components/
features/
hooks/
lib/
public/
```

A simple way to think about the structure:

- `app/` → routes and layouts
- `components/` → app shell, layout, charts, and shared UI
- `hooks/` → state + orchestration
- `features/` → feature-owned screens and nearby subcomponents
- `lib/` → Akahu integration logic and shared helpers/utilities

Most pages are built by composing smaller components together.

Usually the flow is:

```text
Route/Page
  → AppShell/Layout
    → Feature Components
      → Shared Components
        → Hooks/Services
```

---

## Main Files Worth Understanding

| File | Purpose |
|---|---|
| `app/page.tsx` | Main dashboard/homepage entry |
| `app/layout.tsx` | Root layout and providers |
| `components/AppShell.tsx` and `components/layout/*` | Sidebar, navigation, app layout |
| `hooks/useNetlyApp.ts` | Main app orchestration/state layer |
| `lib/akahu/*` | Akahu integrations and API logic |
| `app/api/*` | Server-side API handlers |

If you are new to the project, these files give the quickest understanding of how the app fits together.

---

## Where To Edit Things

| If you want to... | Start here |
|---|---|
| Edit homepage/dashboard content | `features/home/HomePage.tsx` |
| Edit navigation/sidebar | `components/layout/` |
| Edit shared UI | `components/ui/` |
| Edit dashboard widgets | `features/home/` |
| Change app-wide behaviour | `hooks/useNetlyApp.ts` |
| Update Akahu/API logic | `lib/akahu/` or `app/api/akahu/` |
| Add a new route/page | `app/` |

A lot of the app is composed through imported sections/components, so the actual editable UI is usually one or two layers below the route itself.

## Current Frontend Structure

Netly now keeps product-specific UI in shallow feature folders:

```text
features/home/
features/transactions/
features/budgets/
features/card-fit/
features/connect/
features/settings/
```

`components/` is reserved for the app shell, layout pieces, charts, and shared UI primitives. This avoids the old pattern where screens and subcomponents were spread across several unrelated component folders.

---

## Akahu Notes

Akahu response shapes can vary depending on:
- permissions
- institution integrations
- account type
- enrichment availability

Keep local transaction/account types reasonably permissive.

Fields like these may not always exist:
- `merchant`
- `category`
- `meta`
- `balance`
- `refreshed`
- enrichment fields
- pending transaction flags

Useful docs:
- Transaction model: `https://developers.akahu.nz/docs/the-transaction-model`
- Account model: `https://developers.akahu.nz/me/docs/the-account-model`

---

## Shared Patterns

Before adding new code:
- check existing hooks/components first
- reuse shared UI where possible
- avoid duplicate fetch helpers/utilities
- keep API logic inside `app/api/*` and integration helpers in `lib/akahu/*`
- keep presentational components mostly UI-focused

Common pattern:

```text
app/api + lib/akahu → hooks → feature components → shared UI
```

---

## Config Files

| File | Purpose |
|---|---|
| `.env.local` | Environment variables |
| `next.config.*` | Next.js configuration |
| `tailwind.config.*` | Tailwind configuration |
| `tsconfig.json` | TypeScript config |
| `package.json` | Scripts and dependencies |

Do not commit secrets from `.env.local`.

---

## Development Notes

This MVP is intentionally designed to run cheaply during development.

Recommended approach:
- use demo mode for most UI work
- use Akahu personal app access for integration testing
- avoid introducing unnecessary paid infrastructure early

Most frontend work should still function without live banking connections.

---

## Recommended Onboarding Path

1. Read this file
2. Read `onboarding.md`
3. Open:
   - `app/page.tsx`
   - `app/layout.tsx`
   - `components/AppShell/*`
   - `hooks/useNetlyApp.ts`
4. Run the app locally
5. Trace one feature end-to-end

That is usually enough context to start making changes safely and understand how the app is structured.
