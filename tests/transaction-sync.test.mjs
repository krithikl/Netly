import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import {
  getIncrementalTransactionSyncRange,
  getNewestTransactionDate,
  incrementalTransactionOverlapDays
} from "../lib/app/transaction-sync.ts";
import {
  formatTransactionDateHeading,
  groupTransactionsByDate
} from "../lib/transaction-date-groups.ts";
import {
  getTransactionRangeState
} from "../features/transactions/transactionRangeLogic.ts";

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

test("transaction date headings include the year only outside the current year", () => {
  const now = new Date("2026-05-22T12:00:00");

  assert.equal(formatTransactionDateHeading("2026-05-22", now), "Friday, 22 May");
  assert.equal(formatTransactionDateHeading("2025-10-31", now), "Friday, 31 October 2025");
  assert.throws(() => formatTransactionDateHeading("2026-02-31", now), /Invalid transaction date/);
  assert.throws(() => formatTransactionDateHeading("not-a-date", now), /Expected YYYY-MM-DD/);
});

test("transaction date grouping preserves the incoming transaction order", () => {
  assert.deepEqual(groupTransactionsByDate([
    getTransaction("txn-a", "2026-05-22"),
    getTransaction("txn-b", "2026-05-22"),
    getTransaction("txn-c", "2026-05-21"),
    getTransaction("txn-d", "2026-05-22")
  ]), [
    {
      date: "2026-05-22",
      transactions: [getTransaction("txn-a", "2026-05-22"), getTransaction("txn-b", "2026-05-22")]
    },
    {
      date: "2026-05-21",
      transactions: [getTransaction("txn-c", "2026-05-21")]
    },
    {
      date: "2026-05-22",
      transactions: [getTransaction("txn-d", "2026-05-22")]
    }
  ]);
});

test("transaction range state uses exact page transactions when the active range is loaded", () => {
  const state = getTransactionRangeState({
    activeDateRange: visibleRange,
    hasMoreTransactions: true,
    isLoadingTransactionPageRange: true,
    isLoadingTransactions: false,
    loadedDateRange: visibleRange,
    pageTransactions: [getTransaction("txn-page", "2026-05-12")],
    sourceTransactions: [getTransaction("txn-source", "2026-05-13")]
  });

  assert.equal(state.hasLoadedActiveDateRange, true);
  assert.equal(state.hasMoreTransactions, true);
  assert.equal(state.shouldShowListLoading, false);
  assert.equal(state.shouldShowMonthSummaryLoading, false);
  assert.deepEqual(state.transactions.map((transaction) => transaction._id), ["txn-page"]);
});

test("transaction range state falls back to local source transactions while range refresh is pending", () => {
  const state = getTransactionRangeState({
    activeDateRange: visibleRange,
    hasMoreTransactions: true,
    isLoadingTransactionPageRange: true,
    isLoadingTransactions: false,
    loadedDateRange: {
      from: "2026-04-01",
      to: "2026-04-30"
    },
    pageTransactions: [getTransaction("txn-old-page", "2026-04-12")],
    sourceTransactions: [
      getTransaction("txn-april", "2026-04-18"),
      getTransaction("txn-may", "2026-05-14"),
      getTransaction("txn-june", "2026-06-01")
    ]
  });

  assert.equal(state.hasLoadedActiveDateRange, false);
  assert.equal(state.hasMoreTransactions, false);
  assert.equal(state.shouldShowListLoading, false);
  assert.equal(state.shouldShowMonthSummaryLoading, false);
  assert.deepEqual(state.transactions.map((transaction) => transaction._id), ["txn-may"]);
});

test("transaction range state keeps archived rows visible when the exact page is still empty", () => {
  const state = getTransactionRangeState({
    activeDateRange: visibleRange,
    hasMoreTransactions: true,
    isLoadingTransactionPageRange: false,
    isLoadingTransactions: true,
    loadedDateRange: visibleRange,
    pageTransactions: [],
    sourceTransactions: [
      getTransaction("txn-archived-range", "2026-05-14"),
      getTransaction("txn-archived-outside", "2026-04-14")
    ]
  });

  assert.equal(state.hasLoadedActiveDateRange, true);
  assert.equal(state.hasMoreTransactions, false);
  assert.equal(state.shouldShowListLoading, false);
  assert.equal(state.shouldShowMonthSummaryLoading, false);
  assert.deepEqual(state.transactions.map((transaction) => transaction._id), ["txn-archived-range"]);
});

test("transaction range state only shows loading when no local rows can cover the selected range", () => {
  const loadingWithRows = getTransactionRangeState({
    activeDateRange: visibleRange,
    hasMoreTransactions: false,
    isLoadingTransactionPageRange: true,
    isLoadingTransactions: false,
    loadedDateRange: null,
    pageTransactions: [],
    sourceTransactions: [getTransaction("txn-local", "2026-05-20")]
  });
  const loadingWithoutRows = getTransactionRangeState({
    activeDateRange: visibleRange,
    hasMoreTransactions: false,
    isLoadingTransactionPageRange: true,
    isLoadingTransactions: false,
    loadedDateRange: null,
    pageTransactions: [],
    sourceTransactions: [getTransaction("txn-outside", "2026-04-20")]
  });

  assert.equal(loadingWithRows.shouldShowListLoading, false);
  assert.equal(loadingWithRows.shouldShowMonthSummaryLoading, false);
  assert.equal(loadingWithoutRows.shouldShowListLoading, true);
  assert.equal(loadingWithoutRows.shouldShowMonthSummaryLoading, true);
});

test("lifecycle refresh runs on launch only", async () => {
  const dataSource = await readFile(new URL("../hooks/useAkahuData.ts", import.meta.url), "utf8");
  const appSource = await readFile(new URL("../hooks/useNetlyApp.ts", import.meta.url), "utf8");

  assert.doesNotMatch(dataSource, /runBackgroundFullTransactionSync/);
  assert.doesNotMatch(dataSource, /lastFullTransactionSync/);
  assert.match(dataSource, /getIncrementalTransactionSyncRange/);
  assert.match(dataSource, /getTransactionsUrl\("user", undefined, undefined, true\)/);
  assert.doesNotMatch(appSource, /visibilitychange|addEventListener\("focus"|foregroundRefreshCooldownMs|lastForegroundRefreshRef/);
  assert.match(appSource, /banking\.refreshTransactions\(initialDataMode, transactionPageDateRange\)/);
});

test("launch sync starts account freshness and transaction fetch in parallel", async () => {
  const source = await readFile(new URL("../hooks/useAkahuData.ts", import.meta.url), "utf8");
  const accountsRouteSource = await readFile(new URL("../app/api/akahu/accounts/route.ts", import.meta.url), "utf8");
  const providerSource = await readFile(new URL("../lib/akahu/provider.ts", import.meta.url), "utf8");

  assert.match(source, /requestManualRefresh: true/);
  assert.match(source, /!accountsPayload\.isStale/);
  assert.match(source, /console\.info\("Akahu refresh endpoint completed\."/);
  assert.match(source, /pollAccountsUntilFresh/);
  assert.match(source, /pollAndResyncAfterAkahuRefresh/);
  assert.match(source, /akahuRefreshStillProcessingNotice/);
  assert.doesNotMatch(source, /setTransactionLoadNotice\(refreshPayload\.notice|Akahu refresh requested\. Loading updated transactions/);
  assert.doesNotMatch(source, /lastAkahuManualRefreshStorageKey|canRequestManualRefresh|recordManualRefreshRequestedAt/);
  assert.match(source, /void loadAndApplyAccountSnapshot\(mode, isCurrentRequest, accountSetters, \{ requestManualRefresh: true \}\)/);
  assert.match(source, /const syncResult = shouldSyncFullHistory[\s\S]*?await syncVisibleAkahuTransactionsToArchive/);
  assert.match(source, /archivedTransactions\.length === 0 \|\| Boolean\(options\.forceFullSync\)/);
  assert.match(source, /void pollAndResyncAfterAkahuRefresh\(/);
  assert.match(source, /applyTransactionSyncResult\(syncResult, dateRange/);
  assert.match(source, /shouldPollForFreshness/);
  assert.doesNotMatch(source, /shouldPollForTransactionFreshness|pollAccountsUntilTransactionsRefresh|hasRefreshTimestampAdvanced|haveRefreshTimestampsAdvanced/);
  assert.match(source, /applyAccountSnapshot\(mode, refreshedAccountsPayload, refreshedAccountsPayload\.isStale \? "refreshing" : "refreshed", setters\)/);
  assert.match(source, /shouldPollForFreshness: refreshedAccountsPayload\.isStale/);
  assert.match(source, /if \(!payload\.isStale\)/);
  assert.match(accountsRouteSource, /const manualRefreshCooldownMs = getManualRefreshCooldownMs\(\)/);
  assert.match(accountsRouteSource, /isStale: hasStaleTimestamp\(accountFreshness, manualRefreshCooldownMs\)/);
  assert.doesNotMatch(accountsRouteSource, /12 \* 60 \* 60 \* 1000|staleDataThresholdMs =/);
  assert.match(providerSource, /Promise\.all\(\[[\s\S]*?this\.getRawAccounts\(token\)[\s\S]*?this\.client\.getTransactionsPage/);
  assert.doesNotMatch(providerSource, /getBalance\(token/);
  assert.match(source, /timedOut: true/);
});

test("direct credit titles use the raw bank description", async () => {
  const displaySource = await readFile(new URL("../lib/transaction-display.ts", import.meta.url), "utf8");

  assert.match(displaySource, /function getBankPaymentTitle\(transaction: Transaction\)/);
  assert.match(displaySource, /directCreditTypes\.has\(normalizeDisplayText\(transaction\.type\)\)[\s\S]*?transaction\.description\.trim\(\)/);
  assert.doesNotMatch(displaySource, /Transfer from|Transfer to|getTransferCounterparty|genericCounterpartyLabels|transferTypes/);
});

test("Akahu refresh polling keeps bounded timing constants", async () => {
  const source = await readFile(new URL("../hooks/useAkahuData.ts", import.meta.url), "utf8");

  assert.match(source, /const akahuRefreshPollingIntervalMs = 5 \* 1000/);
  assert.match(source, /const akahuRefreshPollingTimeoutMs = 60 \* 1000/);
});

test("Drive access token remains memory-only", async () => {
  const driveSource = await readFile(new URL("../lib/app/drive-backup.ts", import.meta.url), "utf8");
  const backupHookSource = await readFile(new URL("../hooks/useDriveBackup.ts", import.meta.url), "utf8");

  assert.doesNotMatch(driveSource, /localStorage\.setItem\([^)]*access/i);
  assert.doesNotMatch(driveSource, /accounts\.oauth2|initTokenClient|googleIdentityScriptUrl/);
  assert.match(driveSource, /\/api\/google-drive\/upload/);
  assert.match(driveSource, /\/api\/google-drive\/backups/);
  assert.doesNotMatch(backupHookSource, /access_token|cachedDriveAccessToken/);
  assert.match(backupHookSource, /driveBackupConnectionStorageKey/);
});

test("Google Drive backup uses server OAuth refresh-token routes", async () => {
  const serverSource = await readFile(new URL("../lib/google-drive/server.ts", import.meta.url), "utf8");
  const startSource = await readFile(new URL("../app/api/google-drive/start/route.ts", import.meta.url), "utf8");
  const callbackSource = await readFile(new URL("../app/api/google-drive/callback/route.ts", import.meta.url), "utf8");

  assert.match(serverSource, /access_type", "offline"/);
  assert.match(serverSource, /prompt", "consent"/);
  assert.match(serverSource, /refresh_token/);
  assert.match(serverSource, /NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
  assert.match(serverSource, /GOOGLE_CLIENT_SECRET/);
  assert.match(serverSource, /GOOGLE_REDIRECT_URI/);
  assert.match(serverSource, /GOOGLE_COOKIE_SECRET/);
  assert.match(serverSource, /thirtyDayCookieMaxAgeSeconds/);
  assert.match(startSource, /getGoogleDriveAuthorizationUrl/);
  assert.match(callbackSource, /saveGoogleDriveRefreshToken/);
});

test("Home mobile preview shows ten recent transactions and a view-all action", async () => {
  const homeSource = await readFile(new URL("../features/home/HomePage.tsx", import.meta.url), "utf8");
  const heroSource = await readFile(new URL("../features/home/HeroBalanceCard.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const recentSource = await readFile(new URL("../features/home/RecentActivityStrip.tsx", import.meta.url), "utf8");

  assert.match(homeSource, /\.slice\(0, 10\)/);
  assert.match(homeSource, /compareTransactionsNewestFirst/);
  assert.match(homeSource, /insights=\{insights\}/);
  assert.match(homeSource, /mobile-home-insight-strip/);
  assert.match(recentSource, /MoneyMovementCard/);
  assert.match(recentSource, /getTransactionAmountLabel\(transaction\)/);
  assert.match(heroSource, /hero-insight-preview/);
  assert.match(heroSource, /has-hero-insight/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.dashboard-grid > \.insights-panel,\s*\.hero-insight-preview[\s\S]*?display: none/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.mobile-home-insight-strip[\s\S]*?display: grid/);
  assert.match(recentSource, /View All Transactions/);
  assert.match(recentSource, /home-recent-transactions/);
  assert.match(recentSource, /transaction-date-group/);
  assert.match(recentSource, /transaction-date-group-heading/);
  assert.doesNotMatch(recentSource, /Recent activity/);
  assert.doesNotMatch(recentSource, /CardHeader|CardTitle|<Card/);
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

test("overlapping transaction sources are deduped before range fallbacks", async () => {
  const appSource = await readFile(new URL("../hooks/useNetlyApp.ts", import.meta.url), "utf8");

  assert.match(appSource, /mergeUniqueTransactions\(banking\.transactions, banking\.transactionPageTransactions\)/);
  assert.match(appSource, /function mergeUniqueTransactions\(baseTransactions: Transaction\[\], pageTransactions: Transaction\[\]\)/);
  assert.match(appSource, /byId\.set\(getTransactionId\(transaction\), transaction\)/);
  assert.doesNotMatch(appSource, /\[\.\.\.banking\.transactions,\s*\.\.\.banking\.transactionPageTransactions\]/);
});

test("Transactions page receives the dedicated date-range transaction set", async () => {
  const appSource = await readFile(new URL("../hooks/useNetlyApp.ts", import.meta.url), "utf8");
  const dataHookSource = await readFile(new URL("../hooks/useAkahuData.ts", import.meta.url), "utf8");
  const displaySource = await readFile(new URL("../lib/transaction-display.ts", import.meta.url), "utf8");
  const transactionsSource = await readFile(new URL("../features/transactions/TransactionsPage.tsx", import.meta.url), "utf8");
  const refreshTransactionPageSource = dataHookSource.match(/const refreshTransactionPage[\s\S]*?\n  \}, \[dataMode\]\);/)?.[0] || "";

  assert.match(appSource, /transactionPageWorkingTransactions/);
  assert.match(appSource, /transactions: transactionPageWorkingTransactions/);
  assert.match(appSource, /isLoadingTransactionPageRange: banking\.isLoadingTransactionPageRange/);
  assert.match(appSource, /setTransactionLoadNotice\("No transactions found for this period\."\)/);
  assert.match(dataHookSource, /transactionPageRequestIdRef/);
  assert.match(dataHookSource, /transactionPageLoadedDateRange/);
  assert.match(dataHookSource, /isLoadingTransactionPageRange/);
  assert.match(refreshTransactionPageSource, /setIsLoadingTransactionPageRange\(true\)/);
  assert.match(refreshTransactionPageSource, /setIsLoadingTransactionPageRange\(false\)/);
  assert.doesNotMatch(refreshTransactionPageSource, /setIsLoadingTransactions/);
  assert.match(dataHookSource, /isFutureTransactionRange\(dateRange\)/);
  assert.match(dataHookSource, /setTransactionLoadNotice\(archivedPageTransactions\.length === 0 \? "No transactions found for this period\." : ""\)/);
  assert.match(transactionsSource, /getTransactionRangeState/);
  assert.match(transactionsSource, /isLoadingTransactionPageRange/);
  assert.doesNotMatch(transactionsSource, /reviewShortcutTransactions|reviewShortcutAnalytics/);
  assert.match(transactionsSource, /shownTransactions = useMemo\([\s\S]*?getVisibleTransactions\(dateRangeTransactions[\s\S]*?transactionAccounts/);
  assert.match(transactionsSource, /analytics = useMemo\(\(\) => getTransactionAnalytics\(shownTransactions, dateRange\)/);
  assert.match(transactionsSource, /analytics\.needsReviewCount > 0/);
  assert.match(displaySource, /compareTransactionsNewestFirst/);
  assert.match(transactionsSource, /transactionLoadError/);
  assert.match(transactionsSource, /transaction-list-review-shortcut/);
});

test("transaction lists use date groups without chevrons for date-sorted views", async () => {
  const transactionListSource = await readFile(new URL("../features/transactions/TransactionList.tsx", import.meta.url), "utf8");
  const transactionsSource = await readFile(new URL("../features/transactions/TransactionsPage.tsx", import.meta.url), "utf8");
  const recentSource = await readFile(new URL("../features/home/RecentActivityStrip.tsx", import.meta.url), "utf8");
  const budgetsSource = await readFile(new URL("../features/budgets/BudgetsPage.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(transactionListSource, /ChevronRight|transaction-ledger-chevron/);
  assert.match(transactionListSource, /MoneyMovementCard/);
  assert.doesNotMatch(transactionListSource, /meta=\{row\.statusLabel\}/);
  assert.match(transactionListSource, /groupTransactionsByDate/);
  assert.match(transactionListSource, /formatTransactionDateHeading/);
  assert.match(transactionsSource, /shouldGroupTransactionsByDate = transactionSort === "Newest" \|\| transactionSort === "Oldest"/);
  assert.match(transactionsSource, /groupByDate=\{shouldGroupTransactionsByDate\}/);
  assert.match(recentSource, /groupTransactionsByDate/);
  assert.match(recentSource, /formatTransactionDateHeading/);
  assert.doesNotMatch(recentSource, /formatRelativeDate/);
  assert.match(budgetsSource, /MoneyMovementCard/);
  assert.match(budgetsSource, /amountDetail=\{getTransactionCountLabel\(item\.transactionCount\)\}/);
  assert.match(budgetsSource, /showCategoryChip=\{false\}/);
  assert.doesNotMatch(budgetsSource, /InfoRow|budget-breakdown-copy|budget-breakdown-value/);
  assert.match(css, /\.money-movement-card\s*{[\s\S]*?grid-template-columns: 38px minmax\(0, 1fr\) max-content/);
  assert.match(css, /\.money-movement-card\s*{[\s\S]*?align-items: start/);
  assert.match(css, /\.money-movement-value\s*{[\s\S]*?justify-items: end/);
  assert.match(css, /\.money-movement-value\s*{[\s\S]*?align-self: stretch/);
  assert.match(css, /\.money-movement-value\s*{[\s\S]*?align-content: center/);
  assert.match(css, /\.budget-breakdown-card\.has-amount-detail \.money-movement-value\s*{[\s\S]*?align-content: start/);
  assert.doesNotMatch(css, /transaction-ledger|budget-breakdown-copy|budget-breakdown-value/);
  assert.match(css, /\.transaction-date-group-heading/);
  assert.doesNotMatch(css, /\.home-recent-date-heading|\.home-recent-date-group/);
});

test("transaction month rail centers the active month and keeps mobile summary inset", async () => {
  const transactionsSource = await readFile(new URL("../features/transactions/TransactionsPage.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(transactionsSource, /align: "center"/);
  assert.match(transactionsSource, /activeMonthSnapIndex = activeMonthIndex < 0 \? 0 : activeMonthIndex/);
  assert.match(transactionsSource, /slides: "\.transaction-month-slide"/);
  assert.match(transactionsSource, /className="transaction-month-spacer"/);
  assert.doesNotMatch(transactionsSource, /monthCarouselDirection|monthCarouselPhase|month-carousel-/);
  assert.doesNotMatch(transactionsSource, /containScroll:\s*"trimSnaps"/);
  assert.doesNotMatch(transactionsSource, /activeMonthIndex - 1/);
  assert.doesNotMatch(transactionsSource, /optionCount - 4/);
  assert.match(css, /--transaction-month-slide-basis: 20%/);
  assert.match(css, /\.transaction-month-spacer \{[\s\S]*?flex: 0 0 var\(--transaction-month-edge-spacer\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-month-rail \{[\s\S]*?--transaction-month-slide-basis: 25%/);
  assert.match(css, /@media \(max-width: 1024px\) and \(min-width: 769px\)[\s\S]*?\.transaction-month-rail button,\s*\.transaction-month-rail button\.active[\s\S]*?font-size: 1\.04rem/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-month-rail button[\s\S]*?font-size: 0\.9rem/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-month-summary[\s\S]*?margin: 2px 22px 0;[\s\S]*?border-radius: 12px;[\s\S]*?background: var\(--surface-2\)/);
});

test("unavailable saved default accounts do not hide the active data source", async () => {
  const appSource = await readFile(new URL("../hooks/useNetlyApp.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(appSource, /getAvailableDefaultAccountId/);
  assert.match(appSource, /defaultAccountId: activeDefaultAccountId/);
  assert.match(appSource, /filterTransactionsByDefaultAccount\(workingTransactions, activeDefaultAccountId\)/);
  assert.match(appSource, /accountOptions\.some\(\(account\) => account\.value === defaultAccountId\)/);
  assert.match(css, /\.transaction-month-metric strong[\s\S]*?font-weight: 760/);
  assert.match(css, /\.transaction-month-metric-label[\s\S]*?font-weight: 760/);
});

test("transaction details and Akahu client exclude pending transaction paths", async () => {
  const displaySource = await readFile(new URL("../lib/transaction-display.ts", import.meta.url), "utf8");
  const clientSource = await readFile(new URL("../lib/akahu/client.ts", import.meta.url), "utf8");
  const normalizeSource = await readFile(new URL("../lib/akahu/normalize.ts", import.meta.url), "utf8");
  const typesSource = await readFile(new URL("../lib/types.ts", import.meta.url), "utf8");

  assert.doesNotMatch(clientSource, /getPendingTransactions|markPendingTransactions|transactions\/pending/);
  assert.doesNotMatch(normalizeSource, /pending/);
  assert.doesNotMatch(typesSource, /pending/);
  assert.match(displaySource, /label: "Made"/);
  assert.doesNotMatch(displaySource, /Pending|pending|Pending since/);
  assert.match(displaySource, /label: "Booked \/ resolved"/);
});

test("Drive startup restores metadata without silent auth or reconnect toast", async () => {
  const backupHookSource = await readFile(new URL("../hooks/useDriveBackup.ts", import.meta.url), "utf8");
  const settingsSource = await readFile(new URL("../features/settings/SettingsPage.tsx", import.meta.url), "utf8");

  assert.match(backupHookSource, /readStoredDriveConnection/);
  assert.match(backupHookSource, /setStatus\("disconnected"\)/);
  assert.match(backupHookSource, /getGoogleDriveConnectionStatus/);
  assert.match(backupHookSource, /ensureDriveAuthorized/);
  assert.match(backupHookSource, /Opening Google Drive authorization/);
  assert.match(backupHookSource, /Google Drive backup was used before/);
  assert.doesNotMatch(backupHookSource, /refreshBackupList\(\{ silent: true \}\)/);
  assert.doesNotMatch(backupHookSource, /toast\.warning\("Reconnect Google Drive backup"\)/);
  assert.doesNotMatch(settingsSource, /<em>Restore<\/em>|settings-backup-list em/);
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

  assert.match(css, /\.chart-layout[\s\S]*?grid-template-columns: minmax\(240px, 0\.95fr\) minmax\(0, 1\.05fr\)/);
  assert.match(css, /\.chart-panel \.legend-list[\s\S]*?overflow: hidden/);
  assert.match(css, /\.legend-row[\s\S]*?overflow: hidden/);
  assert.match(css, /\.legend-topline strong[\s\S]*?text-overflow: ellipsis/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-month-summary[\s\S]*?display: flex;[\s\S]*?justify-content: space-between/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-list-review-shortcut[\s\S]*?width: calc\(100% - 20px\);[\s\S]*?margin-inline: 10px/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-load-message,\s*\.transaction-workspace > \.empty-state[\s\S]*?width: calc\(100% - 20px\);[\s\S]*?margin-inline: 10px/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-month-metric strong[\s\S]*?font-size: clamp\(0\.8rem, 3\.6vw, 0\.9rem\);[\s\S]*?font-weight: 680/);
  assert.match(css, /\.topbar h1,\s*\.mobile-page-header h2[\s\S]*?color: var\(--accent-cream\)/);
  assert.match(css, /\.hero-payday-pill[\s\S]*?margin-top: 4px/);
  assert.match(css, /\.chart-panel,\s*\.chart-layout,\s*\.chart-visual,\s*\.donut-wrap[\s\S]*?overflow: visible/);
  assert.match(css, /\.category-panel,\s*\.category-panel \.chart-layout,\s*\.category-panel \.chart-visual,\s*\.category-panel \.donut-wrap[\s\S]*?overflow: visible/);
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
  const multiSelectSource = await readFile(new URL("../components/ui/multi-select-dropdown.tsx", import.meta.url), "utf8");

  assert.match(css, /--selected-chip-bg: rgba\(168, 139, 80, 0\.14\)/);
  assert.match(css, /\.mobile-nav \.nav-item\.active[\s\S]*?background: var\(--selected-chip-bg\)/);
  assert.match(css, /\.category-multi-select-content button\.active[\s\S]*?background: var\(--selected-chip-bg\)/);
  assert.match(css, /max-height: min\(420px, var\(--radix-popover-content-available-height, calc\(100vh - 80px\)\)\)/);
  assert.match(multiSelectSource, /function MultiSelectDropdown/);
  assert.match(multiSelectSource, /ArrowDown|ArrowUp|Home|End|Escape/);
  assert.match(css, /\.calendar-range-start \.calendar-day-button[\s\S]*?background: var\(--selected-chip-bg\) !important/);
});

test("transaction month rail keeps hover transparent and uses a fixed bottom underline", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /--transaction-month-active-line-width: min\(84px, calc\(100% - 10px\)\)/);
  assert.match(css, /\.transaction-month-rail \{[\s\S]*?border-bottom: 2px solid var\(--outline-soft\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-month-rail \{[\s\S]*?border-bottom: 2px solid var\(--outline-soft\)/);
  assert.doesNotMatch(css, /\.transaction-month-rail button:hover[^{]*\{[^}]*background:/);
  assert.match(css, /\.transaction-month-rail button\.active::after[\s\S]*?bottom: 0;[\s\S]*?width: var\(--transaction-month-active-line-width\);[\s\S]*?height: 4px;[\s\S]*?background: var\(--accent-cream\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.transaction-month-rail button\.active::after[\s\S]*?bottom: -2px/);
});

test("income category settings live in Categories and use the shared category selector", async () => {
  const settingsSource = await readFile(new URL("../features/settings/SettingsPage.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(settingsSource, /Include income categories|settings-income-exclusions|onIncomeIncludedCategoriesChange/);
  assert.doesNotMatch(settingsSource, /<SettingsSection title="Card Fit"/);
  assert.match(settingsSource, /title="Income categories"/);
  assert.match(settingsSource, /title="Card Fit categories"/);
  assert.doesNotMatch(settingsSource, /mobile-filter-description/);
  assert.doesNotMatch(settingsSource, /setMobileOpen|settings-card-fit-drawer/);
  assert.match(settingsSource, /<div className=\{cn\("settings-category-selection"[\s\S]*?<h3>\{title\}<\/h3>[\s\S]*?<p>\{drawerDescription\}<\/p>[\s\S]*?<CategoryMultiSelectDropdown/);
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

test("external service disconnect buttons share the danger action component", async () => {
  const connectSource = await readFile(new URL("../features/connect/ConnectPage.tsx", import.meta.url), "utf8");
  const settingsSource = await readFile(new URL("../features/settings/SettingsPage.tsx", import.meta.url), "utf8");
  const disconnectButtonSource = await readFile(new URL("../components/ui/disconnect-button.tsx", import.meta.url), "utf8");

  assert.match(connectSource, /<DisconnectButton[\s\S]*?Disconnect Akahu[\s\S]*?<\/DisconnectButton>/);
  assert.match(settingsSource, /<DisconnectButton[\s\S]*?Disconnect Google Drive[\s\S]*?<\/DisconnectButton>/);
  assert.match(disconnectButtonSource, /LogOut/);
  assert.match(disconnectButtonSource, /bg-\[rgba\(255,125,145,0\.14\)\]/);
  assert.match(disconnectButtonSource, /border-\[rgba\(255,125,145,0\.38\)\]/);
});

function getTransaction(id, date) {
  return {
    _id: id,
    amount: -10,
    date,
    description: id
  };
}
