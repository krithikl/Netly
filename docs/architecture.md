# Architecture

This covers how Netly is built. For what the app does and how to run it, see the main README.

## Akahu data shapes

The app works with Akahu-shaped data directly rather than its own schema:

- Accounts use Akahu fields such as `_id`, `name`, `formatted_account`, `balance`, `type`, and `meta`.
- Transactions use Akahu fields such as `_id`, `_account`, `date`, `description`, `amount`, `type`, `merchant`, `category`, and `meta`.
- Categories come from Akahu enrichment first, especially `category.groups.personal_finance.name`.

Where available, the app also uses `merchant.name` for merchant display, `category.name` for the more detailed Akahu category, and `meta.particulars`, `meta.code`, and `meta.reference` for payment details.

## Data storage

There is no server-side database. All transaction and account data is stored client-side:

- Transactions are cached in IndexedDB, encrypted with a key generated and stored in the browser.
- Settings such as category overrides, custom categories, colours, and budgets live in `localStorage`.
- The optional Google Drive backup uploads the encrypted local archive as-is to Drive's hidden app data folder. The server never sees decrypted transaction data.

Akahu and Google OAuth tokens are stored in encrypted httpOnly cookies, scoped to the browser session. Nothing is written to a database.

## App shell and routing

The dashboard uses a client-shell App Router pattern:

- `app/layout.tsx` wraps the whole app and global toast UI.
- `app/(dashboard)/layout.tsx` mounts `features/dashboard/AppShell.tsx` for all dashboard routes.
- `features/dashboard/AppShell.tsx` places the sidebar, topbar, status banner, and active view.
- `hooks/useNetlyApp.ts` is the central app state/composition hook.
- `features/dashboard/DashboardViewRouter.tsx` chooses which page view to render.

Route pages under `app/(dashboard)` return `null` and exist only to give stable URLs. `useRoutedView` maps those URLs to the active view.

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
lib/app/                 App routing, browser storage, transaction archive, and dashboard copy helpers
lib/akahu/               Akahu API client, provider, token, and normalisation logic
lib/google-drive/        Google Drive OAuth and encrypted backup upload/restore
lib/                     Product calculations, category rules, mock data, periods, types, utilities
docs/                    Architecture and Akahu integration notes
```

## Data flow

- `useAkahuData` fetches transactions, accounts, and balances from `/api/akahu/*`.
- `useNetlyApp` combines banking data with category settings, payday settings, period filters, and derived product metrics.
- `lib/insights.ts` calculates spend totals, recurring merchants, insights, and card-fit rankings.
- `lib/transaction-display.ts` centralises display-safe transaction values so UI files do not need to know every Akahu shape.
- `useNetlyApp` returns named shell/page prop groups, and `DashboardViewRouter` passes only the active page's group.

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
| Category auto-mapping rules | `lib/category-rules.ts` | A manual category override creates a rule that's applied to future transactions from the same merchant. |
| Local transaction archive | `lib/app/transaction-archive.ts` | Encrypted IndexedDB cache of synced transactions and settings. |
| Google Drive backup | `hooks/useDriveBackup.ts` and `lib/google-drive/*` | Uploads the encrypted local archive to Drive's app data folder. |
| Navigation/sidebar/bottom nav | `components/layout/AppSidebar.tsx` | View labels/icons and data mode toggle live here. |
| Topbar and period tabs | `components/layout/Topbar.tsx` and `components/layout/TimeRangeTabs.tsx` | Period control appears on Home and Budgets. |
| Route names/URL mapping | `lib/app/routes.ts` | Source of truth for view-to-route mapping. |
| Shared UI primitives | `components/ui/*` | Radix/shadcn-style building blocks. Prefer reusing these before adding new primitives. |
| Global styles/theme | `app/globals.css` | Main layout, responsive rules, and design tokens. Avoid broad changes. |
| Demo data/cards/budgets | `lib/mock-data.ts` and `lib/akahu/dummy-transactions.json` | Do not persist real user transaction data here. |

## Conventions

- Demo mode must keep working without Akahu credentials.
- Category overrides, custom categories, hidden categories, colours, and payday settings are local-only via `localStorage`.
- Transactions are cached locally in an encrypted IndexedDB archive, not on a server.
- Do not persist raw user transactions in source files.
- Check `components/ui/*` before adding another button, sheet, drawer, select, popover, or card primitive.
- Check `lib/transaction-display.ts` before adding transaction formatting inside a component.
- Check `lib/insights.ts` before adding spend, budget, recurring, or card-fit calculations.
- Keep API calls inside `app/api/*`, `lib/akahu/*`, or hooks. Avoid fetching directly in leaf UI components.