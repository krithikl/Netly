# Netly Developer Onboarding

This is the quick navigation guide for changing Netly without having to trace the whole app first. Use it as a "where do I edit this?" map.

## Project overview

Netly is a Next.js App Router MVP for NZ open-banking spend insights. The app loads transactions, balances, and accounts from Akahu when connected, or from local demo data when in demo mode.

The main app is rendered through a client shell:

- `app/layout.tsx` wraps the whole app and global toast UI.
- `app/(dashboard)/layout.tsx` mounts `features/dashboard/AppShell.tsx` for all dashboard routes.
- `features/dashboard/AppShell.tsx` places the sidebar, topbar, status banner, and active view.
- `hooks/useNetlyApp.ts` is the central app state/composition hook.
- `features/dashboard/DashboardViewRouter.tsx` chooses which page view to render.

## Local setup

```bash
npm install
npm run build
npm run typecheck
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` for Akahu testing. Demo mode works without real Akahu credentials.

## Where to edit what

| To update this | Go here first | Notes |
| --- | --- | --- |
| Home dashboard layout/content | `features/home/HomePage.tsx` | Composes hero balance, metric cards, donut chart, insights, and recent activity. |
| Home summary cards | `features/home/MetricCard.tsx` and `features/home/HomePage.tsx` | Values are calculated in `hooks/useNetlyApp.ts`. |
| Balance/payday hero | `features/home/HeroBalanceCard.tsx` | Payday state comes from `hooks/usePaydaySettings.ts`. |
| Category donut chart | `features/home/CategoryDonutCard.tsx` and `features/home/DonutChart.tsx` | Category totals come from `spendByCategory` in `lib/insights.ts`. |
| Insights panel copy/logic | `features/home/InsightsPanel.tsx` and `lib/insights.ts` | Generated insights are passed from `useNetlyApp`. |
| Transactions page | `features/transactions/TransactionsPage.tsx` | Main filter/search/date/category UI lives here. |
| Transaction rows/details | `features/transactions/TransactionList.tsx` | Uses helpers from `lib/transaction-display.ts`. |
| Transaction filtering/sorting | `features/transactions/transactionLogic.ts` | UI controls live in `TransactionsPage`; pure transaction logic stays nearby. |
| Budgets page | `features/budgets/BudgetsPage.tsx` | Budget seed data is in `lib/mock-data.ts`. |
| Recurring merchant detection | `lib/insights.ts` | Used by Budgets and the recurring transaction jump. |
| Card Fit page | `features/card-fit/CardFitPage.tsx` | Renders ranked card results and filters. |
| Card Fit detail panel | `features/card-fit/CardFitDetailPanel.tsx` | Explains individual card result details. |
| Card ranking logic | `lib/insights.ts` | Look for `calculateCardFit`. Card product data is in `lib/mock-data.ts`. |
| Connect Akahu screen | `features/connect/ConnectPage.tsx` | Calls connection handlers from `hooks/useAkahuConnection.ts`. |
| Akahu API routes | `app/api/akahu/*/route.ts` | Server endpoints for OAuth, tokens, accounts, balances, and transactions. |
| Akahu client/provider logic | `lib/akahu/client.ts` and `lib/akahu/provider.ts` | Keep raw API calls here, not in components. |
| Account/transaction normalisation | `lib/akahu/accounts.ts`, `lib/akahu/normalize.ts`, `lib/transaction-display.ts` | These turn Akahu-shaped data into UI-friendly values. |
| Settings page | `features/settings/SettingsPage.tsx` | Category colour and category removal UI. |
| Category settings persistence | `hooks/useCategorySettings.ts` | Stored in `localStorage`. |
| Navigation/sidebar/bottom nav | `components/layout/AppSidebar.tsx` | View labels/icons and data mode toggle live here. |
| Topbar and period tabs | `components/layout/Topbar.tsx` and `components/layout/TimeRangeTabs.tsx` | Period control appears on Home and Budgets. |
| Route names/URL mapping | `lib/app/routes.ts` | Source of truth for view-to-route mapping. |
| Shared UI primitives | `components/ui/*` | Radix/shadcn-style building blocks. Prefer reusing these before adding new primitives. |
| Global styles/theme | `app/globals.css` | Main layout, responsive rules, and design tokens. Avoid broad changes. |
| Demo data/cards/budgets | `lib/mock-data.ts` and `lib/akahu/dummy-transactions.json` | Do not persist real user transaction data here. |

## Main composition flow

1. Route enters `app/(dashboard)/layout.tsx`.
2. `features/dashboard/AppShell.tsx` calls `useNetlyApp()`.
3. `useNetlyApp()` loads Akahu/demo data, applies category settings, calculates metrics, and builds `viewProps`.
4. `features/dashboard/DashboardViewRouter.tsx` receives `viewProps` and renders the selected page.
5. Page components compose smaller components from nearby `features/*` files and generic primitives from `components/ui`.

If you are trying to find where a smaller component is passed in, start at the page component in `features/*/*Page.tsx`. Follow cross-page data back to that page's named prop group in `useNetlyApp.ts`; `DashboardViewRouter.tsx` should only choose the active page.

## Folder structure

```text
app/                     Next.js layouts, routed pages, and API routes
features/dashboard/      App shell and active-view selection
components/layout/       Sidebar, topbar, and global app navigation
features/home/           Home dashboard page, charts, and subcomponents
features/transactions/   Transaction page, list/detail UI, and transaction-local logic
features/card-fit/       Card Fit page and detail UI
features/budgets/        Budget page UI
features/connect/        Akahu connect page UI
features/settings/       Settings page UI
components/ui/           Shared low-level UI primitives
hooks/                   Cross-feature state and side-effect hooks
lib/app/                 App routing, browser storage, and dashboard copy helpers
lib/akahu/               Akahu API client, provider, token, and normalisation logic
lib/                     Product calculations, mock data, periods, types, utilities
docs/                    Durable architecture and onboarding notes
```

## Data flow

- `useAkahuData` fetches transactions, accounts, and balances from `/api/akahu/*`.
- `useNetlyApp` combines banking data with category settings, payday settings, period filters, and derived product metrics.
- `lib/insights.ts` calculates spend totals, recurring merchants, safe-to-spend, insights, and card-fit rankings.
- `lib/transaction-display.ts` centralises display-safe transaction values so UI files do not need to know every Akahu shape.
- `useNetlyApp` returns named shell/page prop groups, and `DashboardViewRouter` passes only the active page's group.

## Before adding new code

- Check `components/ui/*` before creating another button, sheet, drawer, select, popover, or card primitive.
- Check `lib/transaction-display.ts` before adding transaction formatting inside a component.
- Check `lib/insights.ts` before adding spend, budget, recurring, or card-fit calculations.
- Keep page-local state in the page file. Add a hook only when the state is genuinely reused across features or owns a real cross-feature side effect.
- Put feature-specific pure logic in a nearby `featureLogic.ts` file instead of `lib/app`.
- Keep API calls inside `app/api/*`, `lib/akahu/*`, or hooks. Avoid fetching directly in leaf UI components.
- Keep comments short in code. Put deeper explanations in this file or `docs/architecture.md`.

## Important conventions

- Demo mode must keep working without Akahu credentials.
- Category overrides, custom categories, hidden categories, colours, and payday settings are local-only via `localStorage`.
- Do not persist raw user transactions in source files or client storage by default.
- Prefer small derived values before JSX rather than long inline expressions.
- Avoid broad global CSS changes unless the layout system truly needs them.
- Keep new reusable UI in `components/ui` only when it is generic; product-specific UI belongs near its page area.
- Avoid pass-through files whose main job is to forward props or hide where behavior is actually defined.

## Areas to review later

- `hooks/useNetlyApp.ts` is the main orchestration point. If it grows, split by real domain boundaries while keeping named page prop groups easy to follow.
- `features/transactions/TransactionsPage.tsx` is large because it owns most transaction controls and responsive UI.
- Akahu token storage is currently cookie-based for MVP/dev usage and should move to encrypted server-side storage when auth exists.
