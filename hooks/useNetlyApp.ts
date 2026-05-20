"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handleCallbackParams, readDefaultAccountId, readHideBalances, readIncomeIncludedCategories } from "@/lib/app/browser-state";
import { categoryRollupCategory } from "@/lib/categories";
import {
  getCardFitSourceLabel,
  getCardFitWindowLabel,
  getDataSourceLabel,
  getLinkedAccountLabel,
  getLinkedUserName
} from "@/lib/app/derived";
import { applyCategoryPreferences } from "@/lib/category-rules";
import type { DataMode } from "@/lib/app/types";
import { cardProducts, payday as defaultPayday } from "@/lib/mock-data";
import { calculateCardFit, debitTransactions, detectRecurring, generateInsights, getDefaultCardFitIncludedCategories, spendByCategory, sum } from "@/lib/insights";
import { filterTransactionsByDateRange, filterTransactionsByPeriod, getThisMonthDateRange, getTransactionPeriodDateRange } from "@/lib/periods";
import { isIncomeCategoryIncluded } from "@/lib/reporting";
import { getTransactionCategory, getTransactionDate, transactionNeedsReview } from "@/lib/transaction-display";
import { defaultAccountStorageKey, hideBalancesStorageKey, incomeIncludedCategoriesStorageKey, periods } from "@/lib/app/constants";
import { getTransactionAccountOptions } from "@/features/transactions/transactionLogic";
import { useAkahuConnection } from "@/hooks/useAkahuConnection";
import { useCategorySettings } from "@/hooks/useCategorySettings";
import { useAkahuData } from "@/hooks/useAkahuData";
import { useDashboardPeriodSettings } from "@/hooks/useDashboardPeriodSettings";
import { useDriveBackup } from "@/hooks/useDriveBackup";
import { useIsBottomNavigation } from "@/hooks/useIsBottomNavigation";
import { usePaydaySettings } from "@/hooks/usePaydaySettings";
import { useRoutedView } from "@/hooks/useRoutedView";
import type { PeriodOption } from "@/lib/types";
import type { TransactionOpenPreset } from "@/features/transactions/TransactionsPage";

const topCategoryLimit = 5;

// Connects banking data, category settings, routing, and screen props for the app
export function useNetlyApp() {
  const { activeView, setActiveView } = useRoutedView();
  const [period, setPeriod] = useState<PeriodOption>(periods[0]);
  const isBottomNavigation = useIsBottomNavigation();
  const previousActiveViewRef = useRef(activeView);
  const lastForegroundRefreshRef = useRef(0);
  const transactionOpenPresetIdRef = useRef(0);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [transactionPageDateRange, setTransactionPageDateRange] = useState(getThisMonthDateRange);
  const [transactionOpenPreset, setTransactionOpenPreset] = useState<TransactionOpenPreset | null>(null);
  const [hideBalances, setHideBalances] = useState(false);
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [incomeIncludedCategories, setIncomeIncludedCategories] = useState<string[]>([]);

  const banking = useAkahuData();
  // Use all loaded transaction sets so category options stay consistent across pages.
  const categorySourceTransactions = useMemo(
    () => [...banking.transactions, ...banking.transactionPageTransactions],
    [banking.transactionPageTransactions, banking.transactions]
  );
  const categories = useCategorySettings(categorySourceTransactions, []);
  // Apply saved category overrides before deriving dashboard metrics.
  const workingTransactions = useMemo(
    () => applyCategoryPreferences(banking.transactions, categories.categoryOverrides, categories.categoryRules),
    [banking.transactions, categories.categoryOverrides, categories.categoryRules]
  );
  const refreshTransactionPageRange = useCallback((dateRange = transactionPageDateRange) => {
    setTransactionPageDateRange(dateRange);
    banking.refreshTransactionPage(banking.dataMode, dateRange).catch((error: unknown) => {
      banking.applyFallbackState(banking.dataMode, error, "Could not load transactions.");
    });
  }, [banking.applyFallbackState, banking.dataMode, banking.refreshTransactionPage, transactionPageDateRange]);
  const selectTransactionMonthRange = useCallback((dateRange: typeof transactionPageDateRange) => {
    refreshTransactionPageRange(dateRange);
  }, [refreshTransactionPageRange]);
  const connection = useAkahuConnection({
    refreshTransactions: banking.refreshTransactions,
    setDataMode: banking.setDataMode,
    transactionDateRange: transactionPageDateRange
  });
  const paydaySettings = usePaydaySettings(defaultPayday);
  const dashboardPeriodSettings = useDashboardPeriodSettings(periods[0]);
  const restoreSettingsFromStorage = useCallback(async () => {
    categories.restoreCategorySettings();
    paydaySettings.restorePaydaySettings();
    dashboardPeriodSettings.restoreDashboardPeriod();
    setHideBalances(readHideBalances());
    setDefaultAccountId(readDefaultAccountId());
    setIncomeIncludedCategories(readIncomeIncludedCategories(categories.settingsCategoryOptions));
    await banking.restoreArchivedTransactions(transactionPageDateRange);
  }, [banking.restoreArchivedTransactions, categories.restoreCategorySettings, categories.settingsCategoryOptions, dashboardPeriodSettings.restoreDashboardPeriod, paydaySettings.restorePaydaySettings, transactionPageDateRange]);
  const driveBackup = useDriveBackup(restoreSettingsFromStorage);
  const activeDashboardPeriod = isBottomNavigation ? dashboardPeriodSettings.dashboardPeriod : period;
  const reportingTransactions = useMemo(() => filterTransactionsByDefaultAccount(workingTransactions, defaultAccountId), [defaultAccountId, workingTransactions]);
  const periodTransactions = useMemo(() => filterTransactionsByPeriod(reportingTransactions, activeDashboardPeriod), [activeDashboardPeriod, reportingTransactions]);
  const budgetMonthTransactions = useMemo(() => filterTransactionsByDateRange(reportingTransactions, getThisMonthDateRange()), [reportingTransactions]);
  const recurringTransactions = useMemo(() => filterTransactionsByPeriod(reportingTransactions, "90 days"), [reportingTransactions]);
  const categoryTotals = useMemo(() => spendByCategory(periodTransactions), [periodTransactions]);
  const budgetCategoryTotals = useMemo(() => spendByCategory(budgetMonthTransactions), [budgetMonthTransactions]);

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
    setHideBalances(readHideBalances());
    setDefaultAccountId(readDefaultAccountId());
    setIncomeIncludedCategories(readIncomeIncludedCategories(categories.settingsCategoryOptions));

    banking.refreshTransactions(initialDataMode, transactionPageDateRange).catch((error: unknown) => {
      banking.applyFallbackState(initialDataMode, error, "Could not load Akahu transactions.");
    });
  }, []);

  // Refreshes quietly when the installed app/browser returns to the foreground.
  useEffect(() => {
    const foregroundRefreshCooldownMs = 60 * 1000;
    const refreshForegroundData = () => {
      if (banking.dataMode !== "user") {
        return;
      }

      const now = Date.now();

      if (now - lastForegroundRefreshRef.current < foregroundRefreshCooldownMs) {
        return;
      }

      lastForegroundRefreshRef.current = now;
      banking.refreshTransactions("user", transactionPageDateRange).catch((error: unknown) => {
        banking.applyFallbackState("user", error, "Could not refresh Akahu transactions.");
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshForegroundData();
      }
    };

    window.addEventListener("focus", refreshForegroundData);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshForegroundData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [banking.applyFallbackState, banking.dataMode, banking.refreshTransactions, transactionPageDateRange]);

  useEffect(() => {
    const previousActiveView = previousActiveViewRef.current;

    if (previousActiveView !== "transactions" && activeView === "transactions") {
      banking.refreshTransactionPage(banking.dataMode, transactionPageDateRange).catch((error: unknown) => {
        banking.applyFallbackState(banking.dataMode, error, "Could not load transactions.");
      });
    }

    if (previousActiveView === "transactions" && activeView !== "transactions") {
      const defaultDateRange = getThisMonthDateRange();
      const shouldRefreshDateRange = transactionPageDateRange.from !== defaultDateRange.from || transactionPageDateRange.to !== defaultDateRange.to;

      setTransactionOpenPreset(null);
      setTransactionPageDateRange(defaultDateRange);

      if (shouldRefreshDateRange) {
        banking.refreshTransactionPage(banking.dataMode, defaultDateRange).catch((error: unknown) => {
          banking.applyFallbackState(banking.dataMode, error, "Could not load transactions.");
        });
      }
    }

    previousActiveViewRef.current = activeView;
  }, [activeView, banking.applyFallbackState, banking.dataMode, banking.refreshTransactionPage, transactionPageDateRange]);

  const recurring = useMemo(() => detectRecurring(recurringTransactions), [recurringTransactions]);
  const cardFitAvailableCategories = useMemo(
    () => categories.settingsCategoryOptions.filter((category) => category !== "All categories"),
    [categories.settingsCategoryOptions]
  );
  const cardFitIncludedCategories = useMemo(
    () => categories.cardFitIncludedCategories || getDefaultCardFitIncludedCategories(cardFitAvailableCategories),
    [cardFitAvailableCategories, categories.cardFitIncludedCategories]
  );
  const cardFit = useMemo(
    () => calculateCardFit(reportingTransactions, cardProducts, undefined, cardFitIncludedCategories),
    [cardFitIncludedCategories, reportingTransactions]
  );
  const insights = useMemo(
    () => generateInsights(periodTransactions, cardProducts),
    [periodTransactions]
  );
  const expenses = useMemo(() => debitTransactions(periodTransactions), [periodTransactions]);
  const monthlySpend = useMemo(() => sum(expenses.map((transaction) => Math.abs(transaction.amount))), [expenses]);
  const averageDailySpend = useMemo(() => getAverageDailySpend(expenses, monthlySpend), [expenses, monthlySpend]);
  const income = useMemo(() => sum(getReportableTransactions(periodTransactions, incomeIncludedCategories).filter((transaction) => transaction.amount > 0).map((transaction) => transaction.amount)), [incomeIncludedCategories, periodTransactions]);
  const reviewCount = useMemo(() => periodTransactions.filter(transactionNeedsReview).length, [periodTransactions]);
  const chartCategories = useMemo(() => groupCategoriesForChart(categoryTotals, topCategoryLimit), [categoryTotals]);
  const chartTotal = useMemo(() => sum(chartCategories.map((item) => item.amount)), [chartCategories]);
  const loadMoreUserTransactions = useCallback((dateRange: Parameters<typeof banking.loadMoreTransactions>[0]) => banking.loadMoreTransactions(dateRange), [banking.loadMoreTransactions]);
  const loadAllUserTransactions = useCallback(async (dateRange: Parameters<typeof banking.loadAllTransactions>[0]) => {
    await banking.loadAllTransactions(dateRange);
    if (banking.dataMode === "user") {
      await driveBackup.syncAfterArchiveChange();
    }
  }, [banking.dataMode, banking.loadAllTransactions, driveBackup.syncAfterArchiveChange]);
  const loadMoreAndSyncUserTransactions = useCallback(async (dateRange: Parameters<typeof banking.loadMoreTransactions>[0]) => {
    await loadMoreUserTransactions(dateRange);
    if (banking.dataMode === "user") {
      await driveBackup.syncAfterArchiveChange();
    }
  }, [banking.dataMode, driveBackup.syncAfterArchiveChange, loadMoreUserTransactions]);
  const openNeedsReviewTransactions = useCallback(() => {
    transactionOpenPresetIdRef.current += 1;
    setTransactionOpenPreset({
      id: transactionOpenPresetIdRef.current,
      query: "",
      transactionCategory: ["Needs review"],
      transactionFilter: "All"
    });
    setActiveView("transactions");
  }, [setActiveView]);
  const openRecurringTransactions = useCallback((merchant: string) => {
    const recurringDateRange = getTransactionPeriodDateRange(reportingTransactions, "90 days");

    transactionOpenPresetIdRef.current += 1;
    setTransactionOpenPreset({
      dateRange: recurringDateRange,
      id: transactionOpenPresetIdRef.current,
      query: merchant,
      transactionCategory: [],
      transactionFilter: "All"
    });
    setActiveView("transactions");
  }, [reportingTransactions, setActiveView]);
  const updateTransactionCategoryAndSync = useCallback((transaction: Parameters<typeof categories.updateTransactionCategory>[0], category: string, scope: Parameters<typeof categories.updateTransactionCategory>[2]) => {
    categories.updateTransactionCategory(transaction, category, scope);
    void driveBackup.syncAfterArchiveChange();
  }, [categories.updateTransactionCategory, driveBackup.syncAfterArchiveChange]);
  const createCustomCategoryAndSync = useCallback((category: string) => {
    categories.createCustomCategory(category);
    void driveBackup.syncAfterArchiveChange();
  }, [categories.createCustomCategory, driveBackup.syncAfterArchiveChange]);
  const updateCategoryColorAndSync = useCallback((category: string, color: string) => {
    categories.updateCategoryColor(category, color);
    void driveBackup.syncAfterArchiveChange();
  }, [categories.updateCategoryColor, driveBackup.syncAfterArchiveChange]);
  const updateCardFitIncludedCategoriesAndSync = useCallback((includedCategories: string[]) => {
    categories.updateCardFitIncludedCategories(includedCategories);
    void driveBackup.syncAfterArchiveChange();
  }, [categories.updateCardFitIncludedCategories, driveBackup.syncAfterArchiveChange]);
  const deleteCategoryAndSync = useCallback((category: string) => {
    categories.deleteCategory(category);
    void driveBackup.syncAfterArchiveChange();
  }, [categories.deleteCategory, driveBackup.syncAfterArchiveChange]);
  const updateHideBalances = useCallback((hidden: boolean) => {
    setHideBalances(hidden);
    window.localStorage.setItem(hideBalancesStorageKey, String(hidden));
  }, []);
  const updateDefaultAccountId = useCallback((accountId: string) => {
    setDefaultAccountId(accountId);

    if (accountId) {
      window.localStorage.setItem(defaultAccountStorageKey, accountId);
      return;
    }

    window.localStorage.removeItem(defaultAccountStorageKey);
  }, []);
  const updateIncomeIncludedCategories = useCallback((categories: string[]) => {
    const nextCategories = [...categories].sort();

    setIncomeIncludedCategories(nextCategories);
    window.localStorage.setItem(incomeIncludedCategoriesStorageKey, JSON.stringify(nextCategories));
  }, []);
  const linkedUserName = getLinkedUserName(banking.primaryLinkedAccount, banking.dataMode);
  const accountOptions = useMemo(
    () => getTransactionAccountOptions(banking.linkedAccounts, workingTransactions),
    [banking.linkedAccounts, workingTransactions]
  );
  const shouldShowPeriodControl = (activeView === "home" || activeView === "budgets") && !isBottomNavigation;
  return {
    shell: {
      activeView,
      changeDataMode: (mode: DataMode) => banking.changeDataMode(mode, transactionPageDateRange),
      dataMode: banking.dataMode,
      dataSourceLabel: getDataSourceLabel(banking.isLoadingTransactions, banking.dataMode, banking.isConnected),
      isBottomNavigation,
      linkedAccountLabel: getLinkedAccountLabel(banking.primaryLinkedAccount, banking.linkedAccounts.length, banking.isConnected),
      linkedUserName,
      payday: paydaySettings.payday,
      period,
      setActiveView,
      setPeriod,
      shouldShowPeriodControl
    },
    viewProps: {
      activeView,
      budgets: {
        categoryOptions: categories.settingsCategoryOptions,
        categories: budgetCategoryTotals,
        categoryColors: categories.categoryColors,
        onRecurringClick: openRecurringTransactions,
        recurring
      },
      cards: {
        basis: cardFit.basis,
        cardFitSourceLabel: getCardFitSourceLabel(banking.dataMode, banking.isConnected),
        cardFitWindowLabel: getCardFitWindowLabel(cardFit.basis),
        cards: cardFit.cards,
        explanation: cardFit.explanation,
        hasCardEligibleSpend: cardFit.basis.eligibleTransactionCount > 0 && cardFit.basis.eligibleAnnualSpend > 0
      },
      connect: {
        completeAkahuConnection: connection.completeAkahuConnection,
        manualTokens: connection.manualTokens,
        onManualTokensChange: connection.updateManualTokens,
        setSyncResult: connection.setSyncResult,
        syncResult: connection.syncResult
      },
      home: {
        averageDailySpend,
        availableBalance: banking.availableBalance,
        categoryColors: categories.categoryColors,
        chartCategories,
        chartTotal,
        expensesCount: expenses.length,
        hoveredCategory,
        hideBalances,
        income,
        insights,
        isConnected: banking.isConnected,
        isLoadingTransactions: banking.isLoadingTransactions,
        monthlySpend,
        onReviewNeedsReview: openNeedsReviewTransactions,
        payday: paydaySettings.payday,
        paydayPatternDate: paydaySettings.paydayPatternDate,
        reviewCount,
        setActiveView,
        setHoveredCategory,
        setHideBalances: updateHideBalances,
        setPayday: paydaySettings.updatePayday,
        transactionPreview: periodTransactions
      },
      settings: {
        akahuDataFreshness: banking.akahuDataFreshness,
        cardFitAvailableCategories,
        cardFitIncludedCategories,
        categoryColors: categories.categoryColors,
        defaultAccountId,
        dashboardPeriod: dashboardPeriodSettings.dashboardPeriod,
        dataMode: banking.dataMode,
        defaultCategories: categories.settingsCategoryOptions,
        deleteCategory: deleteCategoryAndSync,
        driveBackup: driveBackup.driveBackup,
        onConnectDriveBackup: driveBackup.connectAndBackUp,
        onCreateCategory: createCustomCategoryAndSync,
        onDeleteDriveBackup: driveBackup.deleteBackup,
        onDisconnectDriveBackup: driveBackup.disconnectDriveBackup,
        onRefreshDriveBackups: driveBackup.refreshBackupList,
        onRestoreDriveBackup: driveBackup.restoreFromDrive,
        setDashboardPeriod: dashboardPeriodSettings.updateDashboardPeriod,
        setDefaultAccountId: updateDefaultAccountId,
        showDashboardPeriodSetting: isBottomNavigation,
        accountOptions,
        incomeIncludedCategories,
        updateCardFitIncludedCategories: updateCardFitIncludedCategoriesAndSync,
        updateCategoryColor: updateCategoryColorAndSync,
        updateIncomeIncludedCategories
      },
      transactions: {
        accountOptions,
        categoryColors: categories.categoryColors,
        categoryOptions: categories.transactionCategoryOptions,
        defaultAccountId,
        hasMoreTransactions: Boolean(banking.transactionPageNextCursor),
        initialDateRange: transactionPageDateRange,
        incomeIncludedCategories,
        isLoadingAllTransactions: banking.isLoadingAllTransactions,
        isLoadingMoreTransactions: banking.isLoadingMoreTransactions,
        isLoadingTransactions: banking.isLoadingTransactions,
        onCategoryChange: updateTransactionCategoryAndSync,
        onDateRangeChange: refreshTransactionPageRange,
        onMonthRangeChange: selectTransactionMonthRange,
        onLoadAllTransactions: loadAllUserTransactions,
        onLoadMoreTransactions: loadMoreAndSyncUserTransactions,
        onOpenSettings: () => setActiveView("settings"),
        openPreset: transactionOpenPreset,
        transactions: workingTransactions
      }
    }
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

// Narrows reporting surfaces to the user's preferred account while leaving source data intact.
function filterTransactionsByDefaultAccount(transactions: ReturnType<typeof applyCategoryPreferences>, defaultAccountId: string) {
  if (!defaultAccountId) {
    return transactions;
  }

  return transactions.filter((transaction) => transaction._account === defaultAccountId);
}

// Keeps only configured income categories in summaries without hiding rows.
function getReportableTransactions(transactions: ReturnType<typeof applyCategoryPreferences>, includedIncomeCategories: string[]) {
  return transactions.filter((transaction) => transaction.amount <= 0 || isIncomeCategoryIncluded(getTransactionCategory(transaction), includedIncomeCategories));
}

// Keeps the donut chart readable by grouping small categories into a visual roll-up.
function groupCategoriesForChart(categories: { category: string; amount: number }[], limit: number) {
  const sortedCategories = categories
    .sort((first, second) => second.amount - first.amount);

  if (sortedCategories.length <= limit) {
    return sortedCategories;
  }

  const visibleCategories = sortedCategories.slice(0, limit);
  const otherAmount = sum(sortedCategories.slice(limit).map((item) => item.amount));

  return [...visibleCategories, { category: categoryRollupCategory, amount: otherAmount }];
}
