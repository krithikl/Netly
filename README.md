# Netly

Netly helps New Zealanders understand where their money is going, track repeat spending, and compare whether another card could provide better value based on real spending behaviour.

The app connects to Akahu for account and transaction data, uses Akahu merchant/category enrichment where available, and falls back to demo data during local development.

Main features:
- Spending dashboard with balances, safe-to-spend calculations, income tracking, and review signals
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

Open:

```text
http://localhost:3000
```

Copy `.env.example` to `.env.local` and add Akahu credentials if testing against real data.

The app also supports demo/local fallback data so most UI work can be done without connecting accounts.

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

