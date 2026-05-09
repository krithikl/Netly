"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  bankReferenceMaxLength,
  categoryColorsStorageKey,
  categoryOverridesStorageKey,
  customCategoriesStorageKey,
  deletedCategoriesStorageKey,
  defaultPaymentTestForm,
  defaultTransactionCategories,
  periods
} from "@/lib/app/constants";
import { handleCallbackParams, readAuthResponseCookie, readCategoryColors, readCategoryOverrides, readCustomCategories, readDeletedCategories, readInitialDataMode } from "@/lib/app/browser-state";
import {
  applyCategoryOverrides,
  getCardFitSourceLabel,
  getCardFitWindowLabel,
  getConnectionCopy,
  getConnectionTitle,
  getDataSourceLabel,
  getLinkedAccountLabel,
  getLinkedUserName,
  getPaymentBalanceDelta,
  getPaymentFeedNote,
  getPaymentTestHelp,
  getPaymentTransactionDelta,
  getStatusBannerTitle,
  getVisibleTransactions
} from "@/lib/app/derived";
import type { DataMode, LinkedAccount, PaymentTestForm, PaymentTestResult, TransactionFilter, TransactionSort, View } from "@/lib/app/types";
import type { ActiveViewProps } from "@/lib/app/view-props";
import { budgets, cardProducts, currentBalance as fallbackBalance, payday, transactions as fallbackTransactions } from "@/lib/mock-data";
import { calculateCardFit, debitTransactions, detectRecurring, generateInsights, safeToSpend, spendByCategory, sum } from "@/lib/insights";
import { filterTransactionsByPeriod } from "@/lib/periods";
import { getTransactionCategory, getTransactionStatus, transactionNeedsReview } from "@/lib/transaction-display";
import type { PeriodOption, Transaction } from "@/lib/types";

type TransactionsPayload = {
  source: "demo" | "akahu";
  connected?: boolean;
  error?: string;
  notice?: string;
  transactions: Transaction[];
};

type BalancesPayload = {
  connected?: boolean;
  availableBalance: number | null;
  error?: string;
  notice?: string;
};

type AccountsPayload = {
  connected?: boolean;
  accounts: LinkedAccount[];
  primaryAccount: LinkedAccount | null;
  error?: string;
  notice?: string;
};

export function useMoneyFitApp() {
  const [activeView, setActiveView] = useState<View>("home");
  const [period, setPeriod] = useState<PeriodOption>(periods[0]);
  const [query, setQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("All");
  const [transactionSort, setTransactionSort] = useState<TransactionSort>("Newest");
  const [transactionCategory, setTransactionCategory] = useState("All categories");
  const [selectedHomeCategory, setSelectedHomeCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [primaryLinkedAccount, setPrimaryLinkedAccount] = useState<LinkedAccount | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("user");
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionLoadError, setTransactionLoadError] = useState("");
  const [transactionLoadNotice, setTransactionLoadNotice] = useState("");
  const [connectionResponse, setConnectionResponse] = useState("");
  const [syncResult, setSyncResult] = useState("");
  const [paymentTestForm, setPaymentTestForm] = useState<PaymentTestForm>(defaultPaymentTestForm);
  const [paymentTestResult, setPaymentTestResult] = useState<PaymentTestResult | null>(null);
  const [isStartingPaymentTest, setIsStartingPaymentTest] = useState(false);
  const hasAutoCompletedRef = useRef(false);

  async function refreshTransactions(mode: DataMode = dataMode) {
    setIsLoadingTransactions(true);
    resetBankData();

    const [transactionsResponse, balancesResponse, accountsResponse] = await Promise.all([
      fetch(`/api/open-banking/transactions?source=${mode}`),
      fetch(`/api/open-banking/balances?source=${mode}`),
      fetch(`/api/open-banking/accounts?source=${mode}`)
    ]);

    const transactionsPayload = (await transactionsResponse.json()) as TransactionsPayload;
    const balancesPayload = (await balancesResponse.json()) as BalancesPayload;
    const accountsPayload = (await accountsResponse.json()) as AccountsPayload;

    assertOpenBankingResponse(transactionsResponse, transactionsPayload.error, "Could not load transactions.");
    assertOpenBankingResponse(balancesResponse, balancesPayload.error, "Could not load balances.");
    assertOpenBankingResponse(accountsResponse, accountsPayload.error, "Could not load accounts.");

    setTransactions(transactionsPayload.transactions);
    setLinkedAccounts(accountsPayload.accounts || []);
    setPrimaryLinkedAccount(accountsPayload.primaryAccount || null);
    setAvailableBalance(balancesPayload.availableBalance);
    setIsConnected(mode === "user" && Boolean(transactionsPayload.connected || balancesPayload.connected || accountsPayload.connected));
    setTransactionLoadError(transactionsPayload.error || balancesPayload.error || accountsPayload.error || "");
    setTransactionLoadNotice(transactionsPayload.notice || balancesPayload.notice || accountsPayload.notice || "");
    setIsLoadingTransactions(false);
  }

  function resetBankData() {
    setTransactions([]);
    setLinkedAccounts([]);
    setPrimaryLinkedAccount(null);
    setAvailableBalance(null);
  }

  function applyFallbackState(mode: DataMode, error: unknown, fallbackMessage: string) {
    const isDemoMode = mode === "demo";

    setTransactions(isDemoMode ? fallbackTransactions : []);
    setLinkedAccounts([]);
    setPrimaryLinkedAccount(null);
    setAvailableBalance(isDemoMode ? fallbackBalance : null);
    setIsConnected(false);
    setTransactionLoadError(error instanceof Error ? error.message : fallbackMessage);
    setTransactionLoadNotice("");
    setIsLoadingTransactions(false);
  }

  function changeDataMode(mode: DataMode) {
    setDataMode(mode);
    window.localStorage.setItem("moneyfit_data_mode", mode);
    setTransactionLoadError("");
    setTransactionLoadNotice("");

    refreshTransactions(mode).catch((error: unknown) => {
      applyFallbackState(mode, error, "Could not load transactions.");
    });
  }

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
      setDataMode("user");
      window.localStorage.setItem("moneyfit_data_mode", "user");
      await refreshTransactions("user");
    }
  }

  function updatePaymentTestForm(field: keyof PaymentTestForm, value: string) {
    const shouldLimitValue = field === "reference" || field === "particulars" || field === "code";
    const nextValue = shouldLimitValue ? value.slice(0, bankReferenceMaxLength) : value;

    setPaymentTestForm((current) => ({
      ...current,
      [field]: nextValue
    }));
  }

  async function startPaymentTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncResult("Payment testing is disabled on the Akahu data branch.");
    setIsStartingPaymentTest(false);
  }

  function updateTransactionCategory(transactionId: string, category: string) {
    const next = {
      ...categoryOverrides,
      [transactionId]: category
    };

    setCategoryOverrides(next);
    window.localStorage.setItem(categoryOverridesStorageKey, JSON.stringify(next));
  }

  function createCustomCategory(category: string) {
    const normalizedCategory = normalizeCustomCategory(category);
    const categoryExists = getCategoryExists(transactionCategoryOptions, normalizedCategory);

    if (!normalizedCategory || categoryExists) {
      return;
    }

    const nextCategories = [...customCategories, normalizedCategory].sort();
    setCustomCategories(nextCategories);
    window.localStorage.setItem(customCategoriesStorageKey, JSON.stringify(nextCategories));
  }

  function deleteCategory(category: string) {
    const next = [...deletedCategories, category];
    setDeletedCategories(next);
    window.localStorage.setItem(deletedCategoriesStorageKey, JSON.stringify(next));
  }

  function updateCategoryColor(category: string, color: string) {
    const next = { ...categoryColors, [category]: color };
    setCategoryColors(next);
    window.localStorage.setItem(categoryColorsStorageKey, JSON.stringify(next));
  }

  function updateConnectionResponse(value: string) {
    setConnectionResponse(value);
    hasAutoCompletedRef.current = false;
  }

  useEffect(() => {
    setCategoryOverrides(readCategoryOverrides());
    setCustomCategories(readCustomCategories());
    setDeletedCategories(readDeletedCategories());
    setCategoryColors(readCategoryColors());

    let initialDataMode = readInitialDataMode();
    setDataMode(initialDataMode);

    // Akahu OAuth callbacks return through query params.
    const callbackResult = handleCallbackParams({
      setActiveView,
      setDataMode,
      setPaymentTestResult,
      setSyncResult
    });

    if (callbackResult.forceUserMode) {
      initialDataMode = "user";
    }

    const authResponse = readAuthResponseCookie();
    if (authResponse) {
      setConnectionResponse(authResponse);
    }

    refreshTransactions(initialDataMode).catch((error: unknown) => {
      applyFallbackState(initialDataMode, error, "Could not load Akahu transactions.");
    });
  }, []);

  useEffect(() => {
    if (connectionResponse.trim() && !hasAutoCompletedRef.current) {
      hasAutoCompletedRef.current = true;
      setSyncResult("Completing Akahu connection...");
      completeOpenBankingConnection(connectionResponse);
    }
  }, [connectionResponse]);

  const workingTransactions = useMemo(() => applyCategoryOverrides(transactions, categoryOverrides), [transactions, categoryOverrides]);
  
  const periodTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, period), [workingTransactions, period]);
  
  const recurringTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, "90 days"), [workingTransactions]);
  
  const categories = useMemo(() => spendByCategory(periodTransactions), [periodTransactions]);
  
  const recurring = useMemo(() => detectRecurring(recurringTransactions), [recurringTransactions]);
  
  const cardFit = useMemo(() => calculateCardFit(workingTransactions, cardProducts), [workingTransactions]);
  
  const insights = useMemo(
    () => generateInsights(periodTransactions, cardProducts, availableBalance ?? 0),
    [availableBalance, periodTransactions]
  );
  
  const expenses = useMemo(() => debitTransactions(periodTransactions), [periodTransactions]);
  
  const monthlySpend = useMemo(() => sum(expenses.map((transaction) => Math.abs(transaction.amount))), [expenses]);
  
  const income = useMemo(() => sum(periodTransactions.filter((transaction) => transaction.amount > 0).map((transaction) => transaction.amount)), [periodTransactions]);
  
  const upcoming = useMemo(() => periodTransactions.filter((transaction) => getTransactionStatus(transaction) === "Upcoming"), [periodTransactions]);

  const upcomingTotal = useMemo(() => sum(upcoming.map((transaction) => Math.abs(transaction.amount))), [upcoming]);
  
  const reviewCount = useMemo(() => periodTransactions.filter(transactionNeedsReview).length, [periodTransactions]);
  
  const chartCategories = useMemo(() => categories.filter((item) => item.category !== "Income").slice(0, 8), [categories]);
  
  const chartTotal = useMemo(() => sum(chartCategories.map((item) => item.amount)), [chartCategories]);
  
  const transactionCategoryOptions = useMemo(
    () => getTransactionCategoryOptions(workingTransactions, categories, customCategories, deletedCategories),
    [categories, customCategories, deletedCategories, workingTransactions]
  );
  
  const visibleTransactions = useMemo(
    () => getVisibleTransactions(periodTransactions, query, transactionCategory, transactionFilter, transactionSort),
    [periodTransactions, query, transactionCategory, transactionFilter, transactionSort]
  );
  
   const transactionPreview = useMemo(() => periodTransactions, [periodTransactions]);
  
  const paymentBalanceDelta = getPaymentBalanceDelta(paymentTestResult, availableBalance);
  
  const paymentTransactionDelta = getPaymentTransactionDelta(paymentTestResult, workingTransactions.length);
  
  const paymentFeedNote = getPaymentFeedNote(paymentTestResult, paymentBalanceDelta, paymentTransactionDelta);
  
  const safeToSpendAmount = useMemo(() => safeToSpend(periodTransactions, availableBalance ?? 0), [availableBalance, periodTransactions]);
  
  const shouldShowPeriodControl = activeView === "home" || activeView === "transactions" || activeView === "budgets";
  
  const linkedUserName = getLinkedUserName(primaryLinkedAccount, dataMode);

  const viewProps: ActiveViewProps = {
    activeView,
    availableBalance,
    budgets,
    cardBasis: cardFit.basis,
    cardFitSourceLabel: getCardFitSourceLabel(dataMode, isConnected),
    cardFitWindowLabel: getCardFitWindowLabel(cardFit.basis),
    cards: cardFit.cards,
    categories,
    categoryColors,
    chartCategories,
    chartTotal,
    completeOpenBankingConnection,
    connectionResponse,
    expensesCount: expenses.length,
    hasCardEligibleSpend: cardFit.basis.eligibleTransactionCount > 0 && cardFit.basis.eligibleAnnualSpend > 0,
    hoveredCategory,
    income,
    insights,
    isConnected,
    isLoadingTransactions,
    isStartingPaymentTest,
    monthlySpend,
    onCategoryChange: updateTransactionCategory,
    onCreateCategory: createCustomCategory,
    onConnectionResponseChange: updateConnectionResponse,
    onRefreshUserTransactions: () => refreshTransactions("user"),
    onStartPaymentTest: startPaymentTest,
    paymentBalanceDelta,
    paymentFeedNote,
    paymentTestForm,
    paymentTestHelp: getPaymentTestHelp(linkedUserName, dataMode),
    paymentTestResult,
    paymentTransactionDelta,
    query,
    recurring,
    reviewCount,
    safeToSpendAmount,

    setActiveView,
    setHoveredCategory,
    setQuery,
    setSelectedHomeCategory,
    setSyncResult,
    setTransactionCategory,
    setTransactionFilter,
    setTransactionSort,
    syncResult,
    transactionCategory,
    transactionCategoryOptions,
    transactionFilter,
    transactionPreview,
    transactionSort,
    upcomingCount: upcoming.length,
    upcomingTotal,
    updatePaymentTestForm,
    visibleTransactions,
    workingTransactions,
    updateCategoryColor,
    deleteCategory
  };

  return {
    activeView,
    changeDataMode,
    connectionCopy: getConnectionCopy(isLoadingTransactions, dataMode, isConnected),
    connectionTitle: getConnectionTitle(isLoadingTransactions, dataMode, isConnected),
    dataMode,
    dataSourceLabel: getDataSourceLabel(isLoadingTransactions, dataMode, isConnected),
    linkedAccountLabel: getLinkedAccountLabel(primaryLinkedAccount, linkedAccounts.length, isConnected),
    linkedUserName,
    payday,
    period,
    setActiveView,
    setPeriod,
    shouldShowPeriodControl,
    statusBannerMessage: transactionLoadError || transactionLoadNotice,
    statusBannerTitle: getStatusBannerTitle(transactionLoadError, dataMode),
    viewProps
  };
}

function getTransactionCategoryOptions(
  transactions: Transaction[],
  categories: { category: string; amount: number }[],
  customCategories: string[],
  deletedCategories: string[]
) {
  const categorySet = new Set<string>();
  defaultTransactionCategories.forEach((category) => categorySet.add(category));
  categories.forEach((item) => categorySet.add(item.category));
  transactions.forEach((transaction) => categorySet.add(getTransactionCategory(transaction)));
  customCategories.forEach((category) => categorySet.add(category));
  categorySet.delete("Income");
  deletedCategories.forEach((category) => categorySet.delete(category));

  return ["All categories", ...[...categorySet].sort()];
}

function normalizeCustomCategory(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

function getCategoryExists(categories: string[], category: string) {
  return categories.some((currentCategory) => currentCategory.toLowerCase() === category.toLowerCase());
}

function assertOpenBankingResponse(response: Response, error: string | undefined, fallbackMessage: string) {
  if (!response.ok) {
    throw new Error(error || fallbackMessage);
  }
}

function getCompletionMessage(isComplete: boolean, payload: { error?: string; message?: string }) {
  if (!isComplete) {
    return payload.error || "Could not complete authorization.";
  }

  return payload.message || "Connected.";
}
