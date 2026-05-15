"use client";

import { useCallback, useState } from "react";
import { archiveAndMergeTransactions, readArchivedTransactions } from "@/lib/app/transaction-archive";
import { currentBalance as fallbackBalance, transactions as fallbackTransactions } from "@/lib/mock-data";
import { readInitialDataMode } from "@/lib/app/browser-state";
import type { DataMode, LinkedAccount } from "@/lib/app/types";
import type { Transaction, TransactionDateRange } from "@/lib/types";

type TransactionsPayload = {
  source: "demo" | "akahu";
  connected?: boolean;
  error?: string;
  nextCursor?: string | null;
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

// Loads Akahu or demo data and keeps accounts, balances, and transactions together
// Central data hook for Akahu/demo transactions, balances, accounts, and pagination.
export function useAkahuData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionPageTransactions, setTransactionPageTransactions] = useState<Transaction[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [primaryLinkedAccount, setPrimaryLinkedAccount] = useState<LinkedAccount | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("user");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingAllTransactions, setIsLoadingAllTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [transactionPageNextCursor, setTransactionPageNextCursor] = useState<string | null>(null);
  const [transactionLoadError, setTransactionLoadError] = useState("");
  const [transactionLoadNotice, setTransactionLoadNotice] = useState("");

  const resetBankData = useCallback(() => {
    setTransactions([]);
    setTransactionPageTransactions([]);
    setTransactionPageNextCursor(null);
    setLinkedAccounts([]);
    setPrimaryLinkedAccount(null);
    setAvailableBalance(null);
  }, []);

  // Demo mode can fall back to sample data. Akahu mode should show the connection problem
  const applyFallbackState = useCallback((mode: DataMode, error: unknown, fallbackMessage: string) => {
    const isDemoMode = mode === "demo";

    setTransactions(isDemoMode ? fallbackTransactions : []);
    setTransactionPageTransactions(isDemoMode ? fallbackTransactions : []);
    setTransactionPageNextCursor(null);
    setLinkedAccounts([]);
    setPrimaryLinkedAccount(null);
    setAvailableBalance(isDemoMode ? fallbackBalance : null);
    setIsConnected(false);
    setTransactionLoadError(error instanceof Error ? error.message : fallbackMessage);
    setTransactionLoadNotice("");
    setIsLoadingTransactions(false);
  }, []);

  // Load transactions, balances, and accounts together so the screen stays consistent
  const refreshTransactions = useCallback(async (mode: DataMode = dataMode, dateRange?: TransactionDateRange) => {
    setIsLoadingTransactions(true);
    resetBankData();

    try {
      if (mode === "user") {
        const hasArchivedTransactions = await hydrateFromArchive(dateRange, setTransactions, setTransactionPageTransactions);

        if (hasArchivedTransactions) {
          setIsLoadingTransactions(false);
        }
      }

      const transactionRequest = fetch(getTransactionsUrl(mode));
      const transactionPageRequest = dateRange ? fetch(getTransactionsUrl(mode, dateRange)) : transactionRequest;

      const [transactionsResponse, transactionPageResponse, balancesResponse, accountsResponse] = await Promise.all([
        transactionRequest,
        transactionPageRequest,
        fetch(`/api/akahu/balances?source=${mode}`),
        fetch(`/api/akahu/accounts?source=${mode}`)
      ]);

      const transactionsPayload = await readJsonResponse<TransactionsPayload>(transactionsResponse, "transactions");
      const transactionPagePayload = transactionPageResponse === transactionsResponse
        ? transactionsPayload
        : await readJsonResponse<TransactionsPayload>(transactionPageResponse, "transaction page");
      const balancesPayload = await readJsonResponse<BalancesPayload>(balancesResponse, "balances");
      const accountsPayload = await readJsonResponse<AccountsPayload>(accountsResponse, "accounts");

      assertAkahuResponse(transactionsResponse, transactionsPayload.error, "Could not load transactions.");
      assertAkahuResponse(transactionPageResponse, transactionPagePayload.error, "Could not load transactions.");
      assertAkahuResponse(balancesResponse, balancesPayload.error, "Could not load balances.");
      assertAkahuResponse(accountsResponse, accountsPayload.error, "Could not load accounts.");

      const archivedTransactions = mode === "demo"
        ? transactionsPayload.transactions
        : await archiveAndMergeTransactions(transactionsPayload.transactions);
      const archivedTransactionPageTransactions = mode === "demo"
        ? transactionPagePayload.transactions
        : await archiveAndMergeTransactions(transactionPagePayload.transactions, dateRange);

      setTransactions(archivedTransactions);
      setTransactionPageTransactions(archivedTransactionPageTransactions);
      setTransactionPageNextCursor(transactionPagePayload.nextCursor || null);
      setLinkedAccounts(accountsPayload.accounts || []);
      setPrimaryLinkedAccount(accountsPayload.primaryAccount || null);
      setAvailableBalance(balancesPayload.availableBalance);
      setIsConnected(mode === "user" && Boolean(transactionsPayload.connected || balancesPayload.connected || accountsPayload.connected));
      setTransactionLoadError(transactionsPayload.error || balancesPayload.error || accountsPayload.error || "");
      setTransactionLoadNotice(transactionsPayload.notice || balancesPayload.notice || accountsPayload.notice || "");
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [dataMode, resetBankData]);

  const refreshTransactionPage = useCallback(async (mode: DataMode = dataMode, dateRange?: TransactionDateRange) => {
    setIsLoadingTransactions(true);
    setTransactionPageTransactions([]);
    setTransactionPageNextCursor(null);

    try {
      const response = await fetch(getTransactionsUrl(mode, dateRange));
      const payload = await readJsonResponse<TransactionsPayload>(response, "transactions");

      assertAkahuResponse(response, payload.error, "Could not load transactions.");
      const archivedTransactions = mode === "demo"
        ? payload.transactions
        : await archiveAndMergeTransactions(payload.transactions, dateRange);
      setTransactionPageTransactions(archivedTransactions);
      setTransactionPageNextCursor(payload.nextCursor || null);
      setTransactionLoadError(payload.error || "");
      setTransactionLoadNotice(payload.notice || "");
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [dataMode]);

  const loadMoreTransactions = useCallback(async (dateRange?: TransactionDateRange) => {
    if (!transactionPageNextCursor) {
      return;
    }

    setIsLoadingMoreTransactions(true);

    try {
      const response = await fetch(getTransactionsUrl(dataMode, dateRange, transactionPageNextCursor));
      const payload = await readJsonResponse<TransactionsPayload>(response, "more transactions");

      assertAkahuResponse(response, payload.error, "Could not load more transactions.");
      const archivedTransactions = dataMode === "demo"
        ? payload.transactions
        : await archiveAndMergeTransactions(payload.transactions, dateRange);
      setTransactionPageTransactions((currentTransactions) => mergeTransactionPages(currentTransactions, archivedTransactions));
      setTransactionPageNextCursor(payload.nextCursor || null);
      setTransactionLoadError(payload.error || "");
      setTransactionLoadNotice(payload.notice || "");
    } finally {
      setIsLoadingMoreTransactions(false);
    }
  }, [dataMode, transactionPageNextCursor]);

  const loadAllTransactions = useCallback(async (dateRange?: TransactionDateRange) => {
    setIsLoadingAllTransactions(true);

    try {
      const response = await fetch(getTransactionsUrl(dataMode, dateRange, undefined, true));
      const payload = await readJsonResponse<TransactionsPayload>(response, "all transactions");

      assertAkahuResponse(response, payload.error, "Could not load all transactions for this range.");
      const archivedTransactions = dataMode === "demo"
        ? payload.transactions
        : await archiveAndMergeTransactions(payload.transactions, dateRange);
      setTransactionPageTransactions(archivedTransactions);
      setTransactionPageNextCursor(null);
      setTransactionLoadError(payload.error || "");
      setTransactionLoadNotice(payload.notice || "");
    } finally {
      setIsLoadingAllTransactions(false);
    }
  }, [dataMode]);

  const restoreArchivedTransactions = useCallback(async (dateRange?: TransactionDateRange) => {
    if (dataMode === "demo") {
      return;
    }

    setIsLoadingTransactions(true);

    try {
      setTransactions(await archiveAndMergeTransactions([]));
      setTransactionPageTransactions(await archiveAndMergeTransactions([], dateRange));
      setTransactionPageNextCursor(null);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [dataMode]);

  // Save the selected mode so refreshes keep using Akahu or demo data
  const changeDataMode = useCallback((mode: DataMode, dateRange?: TransactionDateRange) => {
    setDataMode(mode);
    window.localStorage.setItem("netly_data_mode", mode);
    setTransactionLoadError("");
    setTransactionLoadNotice("");

    refreshTransactions(mode, dateRange).catch((error: unknown) => {
      applyFallbackState(mode, error, "Could not load transactions.");
    });
  }, [applyFallbackState, refreshTransactions]);

  const restoreInitialDataMode = useCallback(() => {
    const initialDataMode = readInitialDataMode();
    setDataMode(initialDataMode);
    return initialDataMode;
  }, []);

  return {
    applyFallbackState,
    availableBalance,
    changeDataMode,
    dataMode,
    isConnected,
    isLoadingAllTransactions,
    isLoadingTransactions,
    isLoadingMoreTransactions,
    linkedAccounts,
    loadMoreTransactions,
    loadAllTransactions,
    primaryLinkedAccount,
    refreshTransactionPage,
    refreshTransactions,
    restoreArchivedTransactions,
    restoreInitialDataMode,
    setDataMode,
    setTransactionLoadError,
    setTransactionLoadNotice,
    transactionLoadError,
    transactionLoadNotice,
    transactionPageNextCursor,
    transactionPageTransactions,
    transactions
  };
}

// Shows archived Akahu data immediately while fresh Akahu requests continue.
async function hydrateFromArchive(
  dateRange: TransactionDateRange | undefined,
  setTransactions: (transactions: Transaction[]) => void,
  setTransactionPageTransactions: (transactions: Transaction[]) => void
) {
  const [archivedTransactions, archivedTransactionPageTransactions] = await Promise.all([
    readArchivedTransactions(),
    readArchivedTransactions(dateRange)
  ]);

  setTransactions(archivedTransactions);
  setTransactionPageTransactions(archivedTransactionPageTransactions);

  return archivedTransactions.length > 0 || archivedTransactionPageTransactions.length > 0;
}

// Normalises failed API responses into thrown errors for the app fallback path.
function assertAkahuResponse(response: Response, error: string | undefined, fallbackMessage: string) {
  if (!response.ok) {
    throw new Error(error || fallbackMessage);
  }
}

// Reads API JSON while preserving clear errors for empty or malformed responses.
async function readJsonResponse<T>(response: Response, label: string) {
  const text = await response.text();

  if (!text) {
    throw new Error(`Could not load ${label}: API returned an empty response.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Could not load ${label}: API returned malformed JSON.`);
  }
}

// Builds the transactions endpoint URL with source, date range, and cursor filters.
function getTransactionsUrl(mode: DataMode, dateRange?: TransactionDateRange, cursor?: string, loadAll = false) {
  const params = new URLSearchParams({ source: mode });

  if (dateRange?.from) {
    params.set("from", dateRange.from);
  }

  if (dateRange?.to) {
    params.set("to", dateRange.to);
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (loadAll) {
    params.set("load", "all");
  }

  return `/api/akahu/transactions?${params.toString()}`;
}

// Dedupe-appends loaded pages so archived transactions and fresh pages can merge.
function mergeTransactionPages(currentTransactions: Transaction[], nextTransactions: Transaction[]) {
  const byId = new Map<string, Transaction>();

  currentTransactions.forEach((transaction) => byId.set(getTransactionPageId(transaction), transaction));
  nextTransactions.forEach((transaction) => byId.set(getTransactionPageId(transaction), transaction));

  return [...byId.values()];
}

function getTransactionPageId(transaction: Transaction) {
  if (transaction._id) {
    return transaction._id;
  }

  return [
    "pending",
    transaction._account || "account",
    transaction.date,
    transaction.description,
    transaction.amount.toFixed(2)
  ].join(":");
}
