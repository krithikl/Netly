"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handleCallbackParams } from "@/lib/app/browser-state";
import {
  applyCategoryOverrides,
  getCardFitSourceLabel,
  getCardFitWindowLabel,
  getConnectionCopy,
  getConnectionTitle,
  getDataSourceLabel,
  getLinkedAccountLabel,
  getLinkedUserName,
  getStatusBannerTitle
} from "@/lib/app/derived";
import type { DataMode } from "@/lib/app/types";
import type { ActiveViewProps } from "@/lib/app/view-props";
import { budgets, cardProducts, payday as defaultPayday } from "@/lib/mock-data";
import { calculateCardFit, debitTransactions, detectRecurring, generateInsights, safeToSpend, spendByCategory, sum } from "@/lib/insights";
import { filterTransactionsByPeriod, getTransactionPeriodDateRange } from "@/lib/periods";
import { getTransactionDate, transactionNeedsReview } from "@/lib/transaction-display";
import { periods } from "@/lib/app/constants";
import { useAkahuConnection } from "@/hooks/useAkahuConnection";
import { useCategorySettings } from "@/hooks/useCategorySettings";
import { useAkahuData } from "@/hooks/useAkahuData";
import { useDashboardPeriodSettings } from "@/hooks/useDashboardPeriodSettings";
import { useIsBottomNavigation } from "@/hooks/useIsBottomNavigation";
import { usePaydaySettings } from "@/hooks/usePaydaySettings";
import { useRoutedView } from "@/hooks/useRoutedView";
import { useTransactionControls } from "@/hooks/useTransactionControls";
import type { PeriodOption } from "@/lib/types";

const topCategoryLimit = 5;

// Connects banking data, category settings, routing, and screen props for the app
export function useNetlyApp() {
  const { activeView, setActiveView } = useRoutedView();
  const [period, setPeriod] = useState<PeriodOption>(periods[0]);
  const isBottomNavigation = useIsBottomNavigation();
  const previousActiveViewRef = useRef(activeView);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const banking = useAkahuData();
  // Use all loaded transaction sets so category options stay consistent across pages.
  const categorySourceTransactions = useMemo(
    () => [...banking.transactions, ...banking.transactionPageTransactions],
    [banking.transactionPageTransactions, banking.transactions]
  );
  const categories = useCategorySettings(categorySourceTransactions, []);
  // Apply saved category overrides before deriving dashboard metrics.
  const workingTransactions = useMemo(
    () => applyCategoryOverrides(banking.transactions, categories.categoryOverrides),
    [banking.transactions, categories.categoryOverrides]
  );
  const transactionPageWorkingTransactions = useMemo(
    () => applyCategoryOverrides(banking.transactionPageTransactions, categories.categoryOverrides),
    [banking.transactionPageTransactions, categories.categoryOverrides]
  );
  // Transactions page owns its own search/filter/date state but receives app data here.
  const transactionControls = useTransactionControls({
    applyFallbackState: banking.applyFallbackState,
    dataMode: banking.dataMode,
    refreshTransactionPage: banking.refreshTransactionPage,
    transactions: transactionPageWorkingTransactions
  });
  const connection = useAkahuConnection({
    refreshTransactions: banking.refreshTransactions,
    setDataMode: banking.setDataMode,
    transactionDateRange: transactionControls.transactionDateRange
  });
  const paydaySettings = usePaydaySettings(defaultPayday);
  const dashboardPeriodSettings = useDashboardPeriodSettings(periods[0]);
  const activeDashboardPeriod = isBottomNavigation ? dashboardPeriodSettings.dashboardPeriod : period;
  const periodTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, activeDashboardPeriod), [activeDashboardPeriod, workingTransactions]);
  const recurringTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, "90 days"), [workingTransactions]);
  const categoryTotals = useMemo(() => spendByCategory(periodTransactions), [periodTransactions]);

  // Loads saved settings and the first data source when the app starts
  useEffect(() => {
    categories.restoreCategorySettings();

    let initialDataMode = banking.restoreInitialDataMode();
    const callbackResult = handleCallbackParams({
      setSyncResult: connection.setSyncResult
    });

    if (callbackResult.forceUserMode) {
      initialDataMode = "user";
    }

    paydaySettings.restorePaydaySettings();
    dashboardPeriodSettings.restoreDashboardPeriod();

    banking.refreshTransactions(initialDataMode, transactionControls.transactionDateRange).catch((error: unknown) => {
      banking.applyFallbackState(initialDataMode, error, "Could not load Akahu transactions.");
    });
  }, []);

  useEffect(() => {
    const previousActiveView = previousActiveViewRef.current;

    if (previousActiveView === "transactions" && activeView !== "transactions") {
      transactionControls.resetTransactionControls();
    }

    previousActiveViewRef.current = activeView;
  }, [activeView, transactionControls.resetTransactionControls]);

  const recurring = useMemo(() => detectRecurring(recurringTransactions), [recurringTransactions]);
  const cardFit = useMemo(() => calculateCardFit(workingTransactions, cardProducts), [workingTransactions]);
  const insights = useMemo(
    () => generateInsights(periodTransactions, cardProducts, banking.availableBalance ?? 0),
    [banking.availableBalance, periodTransactions]
  );
  const expenses = useMemo(() => debitTransactions(periodTransactions), [periodTransactions]);
  const monthlySpend = useMemo(() => sum(expenses.map((transaction) => Math.abs(transaction.amount))), [expenses]);
  const averageDailySpend = useMemo(() => getAverageDailySpend(expenses, monthlySpend), [expenses, monthlySpend]);
  const income = useMemo(() => sum(periodTransactions.filter((transaction) => transaction.amount > 0).map((transaction) => transaction.amount)), [periodTransactions]);
  const reviewCount = useMemo(() => periodTransactions.filter(transactionNeedsReview).length, [periodTransactions]);
  const chartCategories = useMemo(() => groupCategoriesForChart(categoryTotals, topCategoryLimit), [categoryTotals]);
  const chartTotal = useMemo(() => sum(chartCategories.map((item) => item.amount)), [chartCategories]);
  const refreshUserTransactions = useCallback(() => banking.refreshTransactions("user", transactionControls.transactionDateRange), [banking.refreshTransactions, transactionControls.transactionDateRange]);
  const loadMoreUserTransactions = useCallback(() => banking.loadMoreTransactions(transactionControls.transactionDateRange), [banking.loadMoreTransactions, transactionControls.transactionDateRange]);
  const openNeedsReviewTransactions = useCallback(() => {
    transactionControls.setQuery("");
    transactionControls.setTransactionCategory(["Needs review"]);
    transactionControls.setTransactionFilter("All");
    setActiveView("transactions");
  }, [setActiveView, transactionControls]);
  const openRecurringTransactions = useCallback((merchant: string) => {
    const recurringDateRange = getTransactionPeriodDateRange(workingTransactions, "90 days");

    transactionControls.setQuery(merchant);
    transactionControls.setTransactionCategory([]);
    transactionControls.setTransactionFilter("All");
    transactionControls.setTransactionDateRange(recurringDateRange);
    setActiveView("transactions");
  }, [setActiveView, transactionControls, workingTransactions]);
  const linkedUserName = getLinkedUserName(banking.primaryLinkedAccount, banking.dataMode);
  const safeToSpendAmount = useMemo(() => safeToSpend(periodTransactions, banking.availableBalance ?? 0), [banking.availableBalance, periodTransactions]);
  const shouldShowPeriodControl = (activeView === "home" || activeView === "budgets") && !isBottomNavigation;

  // Single prop bundle passed into ActiveView, then split into each screen component.
  const viewProps: ActiveViewProps = {
    activeView,
    averageDailySpend,
    availableBalance: banking.availableBalance,
    budgets,
    cardBasis: cardFit.basis,
    cardFitExplanation: cardFit.explanation,
    cardFitSourceLabel: getCardFitSourceLabel(banking.dataMode, banking.isConnected),
    cardFitWindowLabel: getCardFitWindowLabel(cardFit.basis),
    cards: cardFit.cards,
    categories: categoryTotals,
    categoryColors: categories.categoryColors,
    chartCategories,
    chartTotal,
    completeAkahuConnection: connection.completeAkahuConnection,
    connectionResponse: connection.connectionResponse,
    expensesCount: expenses.length,
    hasCardEligibleSpend: cardFit.basis.eligibleTransactionCount > 0 && cardFit.basis.eligibleAnnualSpend > 0,
    hoveredCategory,
    income,
    insights,
    isConnected: banking.isConnected,
    isLoadingMoreTransactions: banking.isLoadingMoreTransactions,
    isLoadingTransactions: banking.isLoadingTransactions,
    monthlySpend,
    onCategoryChange: categories.updateTransactionCategory,
    onCreateCategory: categories.createCustomCategory,
    onConnectionResponseChange: connection.updateConnectionResponse,
    onLoadMoreTransactions: loadMoreUserTransactions,
    onRefreshUserTransactions: refreshUserTransactions,
    onRecurringClick: openRecurringTransactions,
    onReviewNeedsReview: openNeedsReviewTransactions,
    payday: paydaySettings.payday,
    paydayPatternDate: paydaySettings.paydayPatternDate,
    query: transactionControls.query,
    recurring,
    reviewCount,
    safeToSpendAmount,
    setActiveView,
    setHoveredCategory,
    setPayday: paydaySettings.updatePayday,
    setQuery: transactionControls.setQuery,
    setSyncResult: connection.setSyncResult,
    setTransactionCategory: transactionControls.setTransactionCategory,
    setTransactionFilter: transactionControls.setTransactionFilter,
    setTransactionSort: transactionControls.setTransactionSort,
    setTransactionDateRange: transactionControls.setTransactionDateRange,
    syncResult: connection.syncResult,
    transactionCategory: transactionControls.transactionCategory,
    transactionCategoryOptions: categories.transactionCategoryOptions,
    transactionDateRange: transactionControls.transactionDateRange,
    transactionFilter: transactionControls.transactionFilter,
    transactionsHasMore: Boolean(banking.transactionPageNextCursor),
    transactionPreview: periodTransactions,
    transactionSort: transactionControls.transactionSort,
    visibleTransactions: transactionControls.visibleTransactions,
    workingTransactions,
    dashboardPeriod: dashboardPeriodSettings.dashboardPeriod,
    showDashboardPeriodSetting: isBottomNavigation,
    setDashboardPeriod: dashboardPeriodSettings.updateDashboardPeriod,
    updateCategoryColor: categories.updateCategoryColor,
    deleteCategory: categories.deleteCategory
  };

  return {
    activeView,
    changeDataMode: (mode: DataMode) => banking.changeDataMode(mode, transactionControls.transactionDateRange),
    connectionCopy: getConnectionCopy(banking.isLoadingTransactions, banking.dataMode, banking.isConnected),
    connectionTitle: getConnectionTitle(banking.isLoadingTransactions, banking.dataMode, banking.isConnected),
    dataMode: banking.dataMode,
    dataSourceLabel: getDataSourceLabel(banking.isLoadingTransactions, banking.dataMode, banking.isConnected),
    linkedAccountLabel: getLinkedAccountLabel(banking.primaryLinkedAccount, banking.linkedAccounts.length, banking.isConnected),
    linkedUserName,
    payday: paydaySettings.payday,
    period,
    setActiveView,
    setPeriod,
    shouldShowPeriodControl,
    statusBannerMessage: banking.transactionLoadError || banking.transactionLoadNotice,
    statusBannerTitle: getStatusBannerTitle(banking.transactionLoadError, banking.dataMode),
    viewProps
  };
}

function getAverageDailySpend(expenses: ReturnType<typeof debitTransactions>, totalSpend: number) {
  if (expenses.length === 0 || totalSpend <= 0) {
    return 0;
  }

  const timestamps = expenses
    .map((transaction) => Date.parse(getTransactionDate(transaction)))
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return 0;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const firstDay = Math.min(...timestamps);
  const lastDay = Math.max(...timestamps);
  const dayCount = Math.max(1, Math.round((lastDay - firstDay) / dayMs) + 1);

  return totalSpend / dayCount;
}

// Keeps the donut chart readable by grouping small categories into “Other”.
function groupCategoriesForChart(categories: { category: string; amount: number }[], limit: number) {
  const sortedCategories = categories
    .filter((item) => item.category !== "Income")
    .sort((first, second) => second.amount - first.amount);

  if (sortedCategories.length <= limit) {
    return sortedCategories;
  }

  const visibleCategories = sortedCategories.slice(0, limit);
  const otherAmount = sum(sortedCategories.slice(limit).map((item) => item.amount));

  return [...visibleCategories, { category: "Other", amount: otherAmount }];
}
