"use client";

import { useCallback, useState } from "react";
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
export function useAkahuData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionPageTransactions, setTransactionPageTransactions] = useState<Transaction[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [primaryLinkedAccount, setPrimaryLinkedAccount] = useState<LinkedAccount | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("user");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [transactionsNextCursor, setTransactionsNextCursor] = useState<string | null>(null);
  const [transactionPageNextCursor, setTransactionPageNextCursor] = useState<string | null>(null);
  const [transactionLoadError, setTransactionLoadError] = useState("");
  const [transactionLoadNotice, setTransactionLoadNotice] = useState("");

  const resetBankData = useCallback(() => {
    setTransactions([]);
    setTransactionPageTransactions([]);
    setTransactionsNextCursor(null);
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
    setTransactionsNextCursor(null);
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

    const transactionRequest = fetch(getTransactionsUrl(mode));
    const transactionPageRequest = dateRange ? fetch(getTransactionsUrl(mode, dateRange)) : transactionRequest;

    const [transactionsResponse, transactionPageResponse, balancesResponse, accountsResponse] = await Promise.all([
      transactionRequest,
      transactionPageRequest,
      fetch(`/api/akahu/balances?source=${mode}`),
      fetch(`/api/akahu/accounts?source=${mode}`)
    ]);

    const transactionsPayload = (await transactionsResponse.json()) as TransactionsPayload;
    const transactionPagePayload = transactionPageResponse === transactionsResponse
      ? transactionsPayload
      : (await transactionPageResponse.json()) as TransactionsPayload;
    const balancesPayload = (await balancesResponse.json()) as BalancesPayload;
    const accountsPayload = (await accountsResponse.json()) as AccountsPayload;

    assertAkahuResponse(transactionsResponse, transactionsPayload.error, "Could not load transactions.");
    assertAkahuResponse(transactionPageResponse, transactionPagePayload.error, "Could not load transactions.");
    assertAkahuResponse(balancesResponse, balancesPayload.error, "Could not load balances.");
    assertAkahuResponse(accountsResponse, accountsPayload.error, "Could not load accounts.");

    setTransactions(transactionsPayload.transactions);
    setTransactionPageTransactions(transactionPagePayload.transactions);
    setTransactionsNextCursor(transactionsPayload.nextCursor || null);
    setTransactionPageNextCursor(transactionPagePayload.nextCursor || null);
    setLinkedAccounts(accountsPayload.accounts || []);
    setPrimaryLinkedAccount(accountsPayload.primaryAccount || null);
    setAvailableBalance(balancesPayload.availableBalance);
    setIsConnected(mode === "user" && Boolean(transactionsPayload.connected || balancesPayload.connected || accountsPayload.connected));
    setTransactionLoadError(transactionsPayload.error || balancesPayload.error || accountsPayload.error || "");
    setTransactionLoadNotice(transactionsPayload.notice || balancesPayload.notice || accountsPayload.notice || "");
    setIsLoadingTransactions(false);
  }, [dataMode, resetBankData]);

  const refreshTransactionPage = useCallback(async (mode: DataMode = dataMode, dateRange?: TransactionDateRange) => {
    setIsLoadingTransactions(true);
    setTransactionPageTransactions([]);
    setTransactionPageNextCursor(null);

    try {
      const response = await fetch(getTransactionsUrl(mode, dateRange));
      const payload = (await response.json()) as TransactionsPayload;

      assertAkahuResponse(response, payload.error, "Could not load transactions.");
      setTransactionPageTransactions(payload.transactions);
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
      const payload = (await response.json()) as TransactionsPayload;

      assertAkahuResponse(response, payload.error, "Could not load more transactions.");
      setTransactionPageTransactions((currentTransactions) => [...currentTransactions, ...payload.transactions]);
      setTransactionPageNextCursor(payload.nextCursor || null);
      setTransactionLoadError(payload.error || "");
      setTransactionLoadNotice(payload.notice || "");
    } finally {
      setIsLoadingMoreTransactions(false);
    }
  }, [dataMode, transactionPageNextCursor]);

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
    isLoadingTransactions,
    isLoadingMoreTransactions,
    linkedAccounts,
    loadMoreTransactions,
    primaryLinkedAccount,
    refreshTransactionPage,
    refreshTransactions,
    restoreInitialDataMode,
    setDataMode,
    setTransactionLoadError,
    setTransactionLoadNotice,
    transactionLoadError,
    transactionLoadNotice,
    transactionPageNextCursor,
    transactionPageTransactions,
    transactionsNextCursor,
    transactions
  };
}

function assertAkahuResponse(response: Response, error: string | undefined, fallbackMessage: string) {
  if (!response.ok) {
    throw new Error(error || fallbackMessage);
  }
}

function getTransactionsUrl(mode: DataMode, dateRange?: TransactionDateRange, cursor?: string) {
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

  return `/api/akahu/transactions?${params.toString()}`;
}
