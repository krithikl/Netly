# Refactor notes

## Navigation simplification

Product-specific screens and nearby subcomponents now live in shallow feature folders:

```text
features/home/
features/transactions/
features/budgets/
features/card-fit/
features/connect/
features/settings/
```

`components/` is now for the app shell, layout, charts, and shared UI primitives. This keeps each app area easier to find without adding extra domain/service/view-model layers.

## Refresh behaviour fix

The app no longer refreshes Akahu automatically on browser focus or `visibilitychange`. Previously, switching tabs or returning to the app could trigger `refreshTransactions()`, which then cleared visible data before repopulating it.

Current behaviour:

- initial app load still loads data;
- manual refresh still works;
- Akahu manual refresh is only requested after account freshness is checked and the local cooldown allows it;
- same-mode refreshes keep current data visible while the new data loads;
- invalid local refresh timestamps are cleared instead of crashing the refresh check.

## Validation

Run locally:

```bash
npm install
npm run typecheck
npm run build
```

Both commands passed in this refactor environment.

## Mobile hydration fix

Fixed mobile-only hydration warnings caused by viewport-dependent state reading `window.matchMedia` during the initial client render.

Changed:
- `hooks/useIsBottomNavigation.ts` now starts from a server-safe default and updates after mount.
- `features/transactions/TransactionList.tsx` now starts from a server-safe desktop default and updates after mount.

This prevents the server-rendered desktop markup and first mobile client render from disagreeing during hydration.

## Page/router naming cleanup

Cleaned up the remaining conceptual overlap between routed views and feature screens.

Current pattern:

```text
features/dashboard/DashboardViewRouter.tsx   # chooses which active page to render
features/home/HomePage.tsx                   # top-level home page
features/transactions/TransactionsPage.tsx   # top-level transactions page
features/budgets/BudgetsPage.tsx             # top-level budgets page
features/card-fit/CardFitPage.tsx            # top-level Card Fit page
features/connect/ConnectPage.tsx             # top-level Akahu connect page
features/settings/SettingsPage.tsx           # top-level settings page
```

Removed the old `components/routing` layer and moved the router into `features/dashboard`, so dashboard page-selection logic now sits with the dashboard feature instead of beside generic components.

`components/` is now limited to app shell/layout, charts, and shared UI primitives. Feature pages live under `features/*`.
