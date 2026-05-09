"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { TransactionFilter, TransactionSort, View } from "@/lib/app/types";
import type { ActiveViewProps } from "@/lib/app/view-props";
import { budgets, cardProducts, payday } from "@/lib/mock-data";
import { calculateCardFit, debitTransactions, detectRecurring, generateInsights, safeToSpend, spendByCategory, sum } from "@/lib/insights";
import { filterTransactionsByPeriod } from "@/lib/periods";
import { getTransactionStatus, transactionNeedsReview } from "@/lib/transaction-display";
import { periods } from "@/lib/app/constants";
import { useCategorySettings } from "@/hooks/useCategorySettings";
import { useOpenBankingData } from "@/hooks/useOpenBankingData";
import { useRoutedView } from "@/hooks/useRoutedView";
import type { PeriodOption } from "@/lib/types";

export function useMoneyFitApp() {
  const { activeView, setActiveView } = useRoutedView();
  const [period, setPeriod] = useState<PeriodOption>(periods[0]);
  const [query, setQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("All");
  const [transactionSort, setTransactionSort] = useState<TransactionSort>("Newest");
  const [transactionCategory, setTransactionCategory] = useState<string[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [connectionResponse, setConnectionResponse] = useState("");
  const [syncResult, setSyncResult] = useState("");
  const hasAutoCompletedRef = useRef(false);

  const banking = useOpenBankingData();
  const categories = useCategorySettings(banking.transactions, []);
  const workingTransactions = useMemo(
    () => applyCategoryOverrides(banking.transactions, categories.categoryOverrides),
    [banking.transactions, categories.categoryOverrides]
  );
  const periodTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, period), [workingTransactions, period]);
  const recurringTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, "90 days"), [workingTransactions]);
  const categoryTotals = useMemo(() => spendByCategory(periodTransactions), [periodTransactions]);

  async function completeOpenBankingConnection(responseValue?: string) {
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
      window.localStorage.setItem("moneyfit_data_mode", "user");
      await banking.refreshTransactions("user");
    }
  }

  function updateConnectionResponse(value: string) {
    setConnectionResponse(value);
    hasAutoCompletedRef.current = false;
  }

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

    banking.refreshTransactions(initialDataMode).catch((error: unknown) => {
      banking.applyFallbackState(initialDataMode, error, "Could not load Akahu transactions.");
    });
  }, []);

  useEffect(() => {
    if (connectionResponse.trim() && !hasAutoCompletedRef.current) {
      hasAutoCompletedRef.current = true;
      setSyncResult("Completing Akahu connection...");
      completeOpenBankingConnection(connectionResponse);
    }
  }, [connectionResponse]);

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
  const chartCategories = useMemo(() => categoryTotals.filter((item) => item.category !== "Income").slice(0, 8), [categoryTotals]);
  const chartTotal = useMemo(() => sum(chartCategories.map((item) => item.amount)), [chartCategories]);
  const visibleTransactions = useMemo(
    () => getVisibleTransactions(periodTransactions, query, transactionCategory, transactionFilter, transactionSort),
    [periodTransactions, query, transactionCategory, transactionFilter, transactionSort]
  );
  const linkedUserName = getLinkedUserName(banking.primaryLinkedAccount, banking.dataMode);
  const safeToSpendAmount = useMemo(() => safeToSpend(periodTransactions, banking.availableBalance ?? 0), [banking.availableBalance, periodTransactions]);
  const shouldShowPeriodControl = activeView === "home" || activeView === "transactions" || activeView === "budgets";

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
    isLoadingTransactions: banking.isLoadingTransactions,
    monthlySpend,
    onCategoryChange: categories.updateTransactionCategory,
    onCreateCategory: categories.createCustomCategory,
    onConnectionResponseChange: updateConnectionResponse,
    onRefreshUserTransactions: () => banking.refreshTransactions("user"),
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
    syncResult,
    transactionCategory,
    transactionCategoryOptions: categories.transactionCategoryOptions,
    transactionFilter,
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
    changeDataMode: banking.changeDataMode,
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
