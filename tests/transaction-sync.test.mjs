import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import {
  getIncrementalTransactionSyncRange,
  getNewestTransactionDate,
  incrementalTransactionOverlapDays
} from "../lib/app/transaction-sync.ts";

const visibleRange = {
  from: "2026-05-01",
  to: "2026-05-31"
};

test("incremental sync falls back to the visible range when no archive exists", () => {
  assert.deepEqual(getIncrementalTransactionSyncRange([], visibleRange, new Date("2026-05-21T12:00:00")), visibleRange);
});

test("incremental sync overlaps seven days from the newest archived transaction", () => {
  const range = getIncrementalTransactionSyncRange([
    getTransaction("txn-old", "2026-04-18"),
    getTransaction("txn-new", "2026-05-14")
  ], visibleRange, new Date("2026-05-21T12:00:00"));

  assert.equal(incrementalTransactionOverlapDays, 7);
  assert.deepEqual(range, {
    from: "2026-05-07",
    to: "2026-05-21"
  });
});

test("newest archived transaction date fails loud on malformed dates", () => {
  assert.throws(
    () => getNewestTransactionDate([getTransaction("txn-bad", "not-a-date")]),
    /Invalid archived transaction date/
  );
});

test("foreground refresh does not contain the retired automatic full-sync path", async () => {
  const source = await readFile(new URL("../hooks/useAkahuData.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /runBackgroundFullTransactionSync/);
  assert.doesNotMatch(source, /lastFullTransactionSync/);
  assert.match(source, /getIncrementalTransactionSyncRange/);
  assert.match(source, /getTransactionsUrl\("user", undefined, undefined, true\)/);
});

test("launch sync requests Akahu refresh before incremental transaction fetch", async () => {
  const source = await readFile(new URL("../hooks/useAkahuData.ts", import.meta.url), "utf8");

  assert.match(source, /requestManualRefresh: true/);
  assert.match(source, /console\.info\("Akahu refresh endpoint completed\."/);
  assert.doesNotMatch(source, /lastAkahuManualRefreshStorageKey|canRequestManualRefresh|recordManualRefreshRequestedAt/);
  assert.match(source, /await loadAndApplyAccountSnapshot\(mode, isCurrentRequest, accountSetters, \{ requestManualRefresh: true \}\)[\s\S]*?await syncVisibleAkahuTransactionsToArchive/);
});

test("Drive access token remains memory-only", async () => {
  const driveSource = await readFile(new URL("../lib/app/drive-backup.ts", import.meta.url), "utf8");
  const backupHookSource = await readFile(new URL("../hooks/useDriveBackup.ts", import.meta.url), "utf8");

  assert.doesNotMatch(driveSource, /localStorage\.setItem\([^)]*access/i);
  assert.doesNotMatch(backupHookSource, /access_token|cachedDriveAccessToken/);
  assert.match(backupHookSource, /driveBackupConnectionStorageKey/);
});

test("Home mobile preview shows ten recent transactions and a view-all action", async () => {
  const homeSource = await readFile(new URL("../features/home/HomePage.tsx", import.meta.url), "utf8");
  const heroSource = await readFile(new URL("../features/home/HeroBalanceCard.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const recentSource = await readFile(new URL("../features/home/RecentActivityStrip.tsx", import.meta.url), "utf8");

  assert.match(homeSource, /\.slice\(0, 10\)/);
  assert.match(homeSource, /insights=\{insights\}/);
  assert.match(homeSource, /mobile-home-insight-strip/);
  assert.match(heroSource, /hero-insight-preview/);
  assert.match(heroSource, /has-hero-insight/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.dashboard-grid > \.insights-panel,\s*\.hero-insight-preview[\s\S]*?display: none/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.mobile-home-insight-strip[\s\S]*?display: grid/);
  assert.match(recentSource, /View All Transactions/);
  assert.match(recentSource, /home-recent-transactions/);
});

test("mobile layout regressions are covered by fixed spacing and budget columns", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const appSource = await readFile(new URL("../hooks/useNetlyApp.ts", import.meta.url), "utf8");
  const routedViewSource = await readFile(new URL("../hooks/useRoutedView.ts", import.meta.url), "utf8");

  assert.match(css, /padding-top: 112px/);
  assert.match(css, /grid-template-columns: 52px minmax\(0, 1fr\) 58px/);
  assert.match(css, /width: min\(280px, calc\(100vw - 32px\)\) !important/);
  assert.match(css, /\[data-sonner-toaster\]\[data-x-position="center"\][\s\S]*?left: 50% !important/);
  assert.doesNotMatch(appSource, /window\.scrollTo|scrollTop/);
  assert.match(routedViewSource, /setLocalActiveView\(view\)/);
  assert.match(routedViewSource, /useEffect\(\(\) => \{[\s\S]*?setLocalActiveView\(getViewForPathname\(pathname\)\)/);
});

test("navigation does not remount pages or trigger transaction page fetches", async () => {
  const routerSource = await readFile(new URL("../features/dashboard/DashboardViewRouter.tsx", import.meta.url), "utf8");
  const appSource = await readFile(new URL("../hooks/useNetlyApp.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(routerSource, /key=\{props\.activeView\}/);
  assert.doesNotMatch(routerSource, /route-transition/);
  assert.doesNotMatch(css, /\.route-transition/);
  assert.doesNotMatch(css, /\.view-stack\s*>\s*\*/);
  assert.doesNotMatch(appSource, /previousActiveView/);
  assert.doesNotMatch(appSource, /activeView[\s\S]{0,240}refreshTransactionPage/);
});

test("Transactions page receives the dedicated date-range transaction set", async () => {
  const appSource = await readFile(new URL("../hooks/useNetlyApp.ts", import.meta.url), "utf8");
  const dataHookSource = await readFile(new URL("../hooks/useAkahuData.ts", import.meta.url), "utf8");
  const transactionsSource = await readFile(new URL("../features/transactions/TransactionsPage.tsx", import.meta.url), "utf8");

  assert.match(appSource, /transactionPageWorkingTransactions/);
  assert.match(appSource, /transactions: transactionPageWorkingTransactions/);
  assert.match(appSource, /setTransactionLoadNotice\("No transactions found for this period\."\)/);
  assert.match(dataHookSource, /transactionPageRequestIdRef/);
  assert.match(dataHookSource, /transactionPageLoadedDateRange/);
  assert.match(transactionsSource, /hasLoadedActiveDateRange/);
  assert.match(transactionsSource, /getDateRangesMatch/);
  assert.match(transactionsSource, /transactionLoadError/);
  assert.match(transactionsSource, /transaction-list-review-shortcut/);
});

test("transaction details include pending and booked lifecycle timing", async () => {
  const displaySource = await readFile(new URL("../lib/transaction-display.ts", import.meta.url), "utf8");
  const clientSource = await readFile(new URL("../lib/akahu/client.ts", import.meta.url), "utf8");

  assert.match(clientSource, /getPendingTransactions/);
  assert.match(clientSource, /markPendingTransactions/);
  assert.match(displaySource, /label: "Made"/);
  assert.match(displaySource, /label: "Pending since"/);
  assert.match(displaySource, /label: "Booked \/ resolved"/);
});

test("Drive startup restores metadata without silent auth or reconnect toast", async () => {
  const backupHookSource = await readFile(new URL("../hooks/useDriveBackup.ts", import.meta.url), "utf8");

  assert.match(backupHookSource, /readStoredDriveConnection/);
  assert.match(backupHookSource, /setStatus\("ready"\)/);
  assert.doesNotMatch(backupHookSource, /refreshBackupList\(\{ silent: true \}\)/);
  assert.doesNotMatch(backupHookSource, /toast\.warning\("Reconnect Google Drive backup"\)/);
});

test("app icons use only the provided SVG asset", async () => {
  const layoutSource = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const manifestSource = await readFile(new URL("../app/manifest.ts", import.meta.url), "utf8");
  const serviceWorkerSource = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const iconFiles = await readdir(new URL("../public/icons", import.meta.url));

  for (const source of [layoutSource, manifestSource, serviceWorkerSource]) {
    assert.match(source, /\/icons\/icon\.svg/);
    assert.doesNotMatch(source, /icon-\d+\.png|maskable-icon-\d+\.png|apple-touch-icon\.png/);
  }

  assert.deepEqual(iconFiles, ["icon.svg"]);
});

test("Home and budget visual regressions keep the compact mobile layout intact", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.topbar h1,\s*\.mobile-page-header h2[\s\S]*?color: var\(--accent-cream\)/);
  assert.match(css, /\.hero-payday-pill[\s\S]*?margin-top: 4px/);
  assert.match(css, /\.chart-panel,\s*\.category-panel,\s*\.chart-layout,\s*\.chart-visual,\s*\.donut-wrap[\s\S]*?overflow: visible/);
  assert.match(css, /\.chart-panel \.legend-row,\s*\.chart-panel \.legend-row\.selected[\s\S]*?border: 0/);
  assert.match(css, /\.budget-desktop-grid[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.budget-recurring-panel \.stack-list[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("development clears stale PWA caches so hot reload is not masked", async () => {
  const serviceWorkerSource = await readFile(new URL("../components/PwaServiceWorker.tsx", import.meta.url), "utf8");
  const publicServiceWorkerSource = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

  assert.match(serviceWorkerSource, /unregisterDevelopmentServiceWorkers/);
  assert.match(serviceWorkerSource, /registration\.unregister\(\)/);
  assert.match(serviceWorkerSource, /key\.startsWith\("netly-pwa-"\)/);
  assert.match(publicServiceWorkerSource, /LOCAL_HOSTNAMES/);
  assert.match(publicServiceWorkerSource, /self\.registration\.unregister\(\)/);
  assert.match(publicServiceWorkerSource, /clearNetlyCaches/);
});

test("selected mobile controls use the subtle selected chip treatment", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /--selected-chip-bg: rgba\(168, 139, 80, 0\.14\)/);
  assert.match(css, /\.mobile-nav \.nav-item\.active[\s\S]*?background: var\(--selected-chip-bg\)/);
  assert.match(css, /\.budget-category-selector button\.active[\s\S]*?background: var\(--selected-chip-bg\)/);
  assert.match(css, /\.calendar-range-start \.calendar-day-button[\s\S]*?background: var\(--selected-chip-bg\) !important/);
});

test("income category settings live in Categories and use the shared category selector", async () => {
  const settingsSource = await readFile(new URL("../features/settings/SettingsPage.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(settingsSource, /Include income categories|settings-income-exclusions|onIncomeIncludedCategoriesChange/);
  assert.doesNotMatch(settingsSource, /<SettingsSection title="Card Fit"/);
  assert.match(settingsSource, /title="Income categories"/);
  assert.match(settingsSource, /title="Card Fit categories"/);
  assert.doesNotMatch(settingsSource, /mobile-filter-description/);
  assert.match(settingsSource, /<div className="settings-category-selection">[\s\S]*?<h3>\{title\}<\/h3>[\s\S]*?<p>\{drawerDescription\}<\/p>[\s\S]*?<SettingsNavigationButton/);
  assert.match(settingsSource, /function CategorySelectionSettings/);
  assert.match(settingsSource, /function CardFitCategorySettings/);
});

test("settings default account uses the styled select component", async () => {
  const settingsSource = await readFile(new URL("../features/settings/SettingsPage.tsx", import.meta.url), "utf8");
  const selectFieldSource = await readFile(new URL("../components/ui/select-field.tsx", import.meta.url), "utf8");

  assert.match(settingsSource, /<SelectField[\s\S]*ariaLabel="Default account"/);
  assert.doesNotMatch(settingsSource, /<select[\s\S]*Default account/);
  assert.match(settingsSource, /__all_accounts__/);
  assert.doesNotMatch(settingsSource, /value: ""/);
  assert.match(selectFieldSource, /<SelectContent position="popper">/);
});

function getTransaction(id, date) {
  return {
    _id: id,
    amount: -10,
    date,
    description: id
  };
}
