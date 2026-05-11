"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handleCallbackParams, readAuthResponseCookie } from "@/lib/app/browser-state";
import {
  applyCategoryOverrides,
  getCardFitSourceLabel,
  getCardFitWindowLabel,
  getConnectionCopy,
  getConnectionTitle,
  getDataSourceLabel,
  getLinkedAccountLabel,
  getLinkedUserName,
  getStatusBannerTitle,
  getVisibleTransactions
} from "@/lib/app/derived";
import type { DataMode, TransactionFilter, TransactionSort, View } from "@/lib/app/types";
import type { ActiveViewProps } from "@/lib/app/view-props";
import { budgets, cardProducts, payday } from "@/lib/mock-data";
import { calculateCardFit, debitTransactions, detectRecurring, generateInsights, safeToSpend, spendByCategory, sum } from "@/lib/insights";
import { filterTransactionsByDateRange, filterTransactionsByPeriod, getThisMonthDateRange } from "@/lib/periods";
import { getTransactionStatus, transactionNeedsReview } from "@/lib/transaction-display";
import { periods } from "@/lib/app/constants";
import { useCategorySettings } from "@/hooks/useCategorySettings";
import { useOpenBankingData } from "@/hooks/useOpenBankingData";
import { useRoutedView } from "@/hooks/useRoutedView";
import type { PeriodOption } from "@/lib/types";

const topCategoryLimit = 5;

// Connects banking data, category settings, routing, and screen props for the app
export function useNetlyApp() {
  const { activeView, setActiveView } = useRoutedView();
  const [period, setPeriod] = useState<PeriodOption>(periods[0]);
  const [query, setQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("All");
  const [transactionSort, setTransactionSort] = useState<TransactionSort>("Newest");
  const [transactionCategory, setTransactionCategory] = useState<string[]>([]);
  const [transactionDateRange, setTransactionDateRangeState] = useState(getThisMonthDateRange);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [connectionResponse, setConnectionResponse] = useState("");
  const [syncResult, setSyncResult] = useState("");
  const hasAutoCompletedRef = useRef(false);

  const banking = useOpenBankingData();
  const categorySourceTransactions = useMemo(
    () => [...banking.transactions, ...banking.transactionPageTransactions],
    [banking.transactionPageTransactions, banking.transactions]
  );
  const categories = useCategorySettings(categorySourceTransactions, []);
  const workingTransactions = useMemo(
    () => applyCategoryOverrides(banking.transactions, categories.categoryOverrides),
    [banking.transactions, categories.categoryOverrides]
  );
  const transactionPageWorkingTransactions = useMemo(
    () => applyCategoryOverrides(banking.transactionPageTransactions, categories.categoryOverrides),
    [banking.transactionPageTransactions, categories.categoryOverrides]
  );
  const periodTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, period), [workingTransactions, period]);
  const transactionRangeTransactions = useMemo(
    () => filterTransactionsByDateRange(transactionPageWorkingTransactions, transactionDateRange),
    [transactionDateRange, transactionPageWorkingTransactions]
  );
  const recurringTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, "90 days"), [workingTransactions]);
  const categoryTotals = useMemo(() => spendByCategory(periodTransactions), [periodTransactions]);

  // Saves a pasted or callback Akahu token, then reloads live Akahu data
  const completeOpenBankingConnection = useCallback(async (responseValue?: string) => {
    const response = await fetch("/api/open-banking/complete", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ response: responseValue || connectionResponse })
    });
    const payload = (await response.json()) as { error?: string; message?: string };

    setSyncResult(getCompletionMessage(response.ok, payload));

    if (response.ok) {
      setConnectionResponse("");
      banking.setDataMode("user");
      window.localStorage.setItem("netly_data_mode", "user");
      await banking.refreshTransactions("user", transactionDateRange);
    }
  }, [banking.refreshTransactions, banking.setDataMode, connectionResponse, transactionDateRange]);

  const updateConnectionResponse = useCallback((value: string) => {
    setConnectionResponse(value);
    hasAutoCompletedRef.current = false;
  }, []);

  // Loads saved settings and the first data source when the app starts
  useEffect(() => {
    categories.restoreCategorySettings();

    let initialDataMode = banking.restoreInitialDataMode();
    const callbackResult = handleCallbackParams({
      setSyncResult
    });

    if (callbackResult.forceUserMode) {
      initialDataMode = "user";
    }

    const authResponse = readAuthResponseCookie();
    if (authResponse) {
      setConnectionResponse(authResponse);
    }

    banking.refreshTransactions(initialDataMode, transactionDateRange).catch((error: unknown) => {
      banking.applyFallbackState(initialDataMode, error, "Could not load Akahu transactions.");
    });
  }, []);

  // Submits callback token data once, while still allowing manual token paste
  useEffect(() => {
    if (connectionResponse.trim() && !hasAutoCompletedRef.current) {
      hasAutoCompletedRef.current = true;
      setSyncResult("Completing Akahu connection...");
      completeOpenBankingConnection(connectionResponse);
    }
  }, [completeOpenBankingConnection, connectionResponse]);

  const recurring = useMemo(() => detectRecurring(recurringTransactions), [recurringTransactions]);
  const cardFit = useMemo(() => calculateCardFit(workingTransactions, cardProducts), [workingTransactions]);
  const insights = useMemo(
    () => generateInsights(periodTransactions, cardProducts, banking.availableBalance ?? 0),
    [banking.availableBalance, periodTransactions]
  );
  const expenses = useMemo(() => debitTransactions(periodTransactions), [periodTransactions]);
  const monthlySpend = useMemo(() => sum(expenses.map((transaction) => Math.abs(transaction.amount))), [expenses]);
  const income = useMemo(() => sum(periodTransactions.filter((transaction) => transaction.amount > 0).map((transaction) => transaction.amount)), [periodTransactions]);
  const upcoming = useMemo(() => periodTransactions.filter((transaction) => getTransactionStatus(transaction) === "Upcoming"), [periodTransactions]);
  const upcomingTotal = useMemo(() => sum(upcoming.map((transaction) => Math.abs(transaction.amount))), [upcoming]);
  const reviewCount = useMemo(() => periodTransactions.filter(transactionNeedsReview).length, [periodTransactions]);
  const chartCategories = useMemo(() => groupCategoriesForChart(categoryTotals, topCategoryLimit), [categoryTotals]);
  const chartTotal = useMemo(() => sum(chartCategories.map((item) => item.amount)), [chartCategories]);
  const visibleTransactions = useMemo(
    () => getVisibleTransactions(transactionRangeTransactions, query, transactionCategory, transactionFilter, transactionSort),
    [query, transactionCategory, transactionFilter, transactionRangeTransactions, transactionSort]
  );
  const refreshUserTransactions = useCallback(() => banking.refreshTransactions("user", transactionDateRange), [banking.refreshTransactions, transactionDateRange]);
  const loadMoreUserTransactions = useCallback(() => banking.loadMoreTransactions(transactionDateRange), [banking.loadMoreTransactions, transactionDateRange]);
  const setTransactionDateRange = useCallback((nextDateRange: typeof transactionDateRange) => {
    setTransactionDateRangeState(nextDateRange);
    setTransactionCategory([]);

    banking.refreshTransactionPage(banking.dataMode, nextDateRange).catch((error: unknown) => {
      banking.applyFallbackState(banking.dataMode, error, "Could not load transactions.");
    });
  }, [banking.applyFallbackState, banking.dataMode, banking.refreshTransactionPage]);
  const linkedUserName = getLinkedUserName(banking.primaryLinkedAccount, banking.dataMode);
  const safeToSpendAmount = useMemo(() => safeToSpend(periodTransactions, banking.availableBalance ?? 0), [banking.availableBalance, periodTransactions]);
  const shouldShowPeriodControl = activeView === "home" || activeView === "budgets";

  const viewProps: ActiveViewProps = {
    activeView,
    availableBalance: banking.availableBalance,
    budgets,
    cardBasis: cardFit.basis,
    cardFitSourceLabel: getCardFitSourceLabel(banking.dataMode, banking.isConnected),
    cardFitWindowLabel: getCardFitWindowLabel(cardFit.basis),
    cards: cardFit.cards,
    categories: categoryTotals,
    categoryColors: categories.categoryColors,
    chartCategories,
    chartTotal,
    completeOpenBankingConnection,
    connectionResponse,
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
    onConnectionResponseChange: updateConnectionResponse,
    onLoadMoreTransactions: loadMoreUserTransactions,
    onRefreshUserTransactions: refreshUserTransactions,
    query,
    recurring,
    reviewCount,
    safeToSpendAmount,
    setActiveView,
    setHoveredCategory,
    setQuery,
    setSyncResult,
    setTransactionCategory,
    setTransactionFilter,
    setTransactionSort,
    setTransactionDateRange,
    syncResult,
    transactionCategory,
    transactionCategoryOptions: categories.transactionCategoryOptions,
    transactionDateRange,
    transactionFilter,
    transactionsHasMore: Boolean(banking.transactionPageNextCursor),
    transactionPreview: periodTransactions,
    transactionSort,
    upcomingCount: upcoming.length,
    upcomingTotal,
    visibleTransactions,
    workingTransactions,
    updateCategoryColor: categories.updateCategoryColor,
    deleteCategory: categories.deleteCategory
  };

  return {
    activeView,
    changeDataMode: (mode: DataMode) => banking.changeDataMode(mode, transactionDateRange),
    connectionCopy: getConnectionCopy(banking.isLoadingTransactions, banking.dataMode, banking.isConnected),
    connectionTitle: getConnectionTitle(banking.isLoadingTransactions, banking.dataMode, banking.isConnected),
    dataMode: banking.dataMode,
    dataSourceLabel: getDataSourceLabel(banking.isLoadingTransactions, banking.dataMode, banking.isConnected),
    linkedAccountLabel: getLinkedAccountLabel(banking.primaryLinkedAccount, banking.linkedAccounts.length, banking.isConnected),
    linkedUserName,
    payday,
    period,
    setActiveView,
    setPeriod,
    shouldShowPeriodControl,
    statusBannerMessage: banking.transactionLoadError || banking.transactionLoadNotice,
    statusBannerTitle: getStatusBannerTitle(banking.transactionLoadError, banking.dataMode),
    viewProps
  };
}

function getCompletionMessage(isComplete: boolean, payload: { error?: string; message?: string }) {
  if (!isComplete) {
    return payload.error || "Could not complete authorization.";
  }

  return payload.message || "Connected.";
}

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
