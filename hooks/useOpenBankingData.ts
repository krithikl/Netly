"use client";

import { useState } from "react";
import { currentBalance as fallbackBalance, transactions as fallbackTransactions } from "@/lib/mock-data";
import { readInitialDataMode } from "@/lib/app/browser-state";
import type { DataMode, LinkedAccount } from "@/lib/app/types";
import type { Transaction } from "@/lib/types";

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

export function useOpenBankingData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [primaryLinkedAccount, setPrimaryLinkedAccount] = useState<LinkedAccount | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("user");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionLoadError, setTransactionLoadError] = useState("");
  const [transactionLoadNotice, setTransactionLoadNotice] = useState("");

  async function refreshTransactions(mode: DataMode = dataMode) {
    // Load the three banking-dependent slices together so the UI never mixes stale balances with fresh transactions.
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

  function changeDataMode(mode: DataMode) {
    // Persist the mode because users often switch to demo data while testing Akahu connection states locally.
    setDataMode(mode);
    window.localStorage.setItem("moneyfit_data_mode", mode);
    setTransactionLoadError("");
    setTransactionLoadNotice("");

    refreshTransactions(mode).catch((error: unknown) => {
      applyFallbackState(mode, error, "Could not load transactions.");
    });
  }

  function restoreInitialDataMode() {
    const initialDataMode = readInitialDataMode();
    setDataMode(initialDataMode);
    return initialDataMode;
  }

  function applyFallbackState(mode: DataMode, error: unknown, fallbackMessage: string) {
    // Only demo mode receives sample data; real user mode should make connection failures visible instead.
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

  function resetBankData() {
    setTransactions([]);
    setLinkedAccounts([]);
    setPrimaryLinkedAccount(null);
    setAvailableBalance(null);
  }

  return {
    applyFallbackState,
    availableBalance,
    changeDataMode,
    dataMode,
    isConnected,
    isLoadingTransactions,
    linkedAccounts,
    primaryLinkedAccount,
    refreshTransactions,
    restoreInitialDataMode,
    setDataMode,
    setTransactionLoadError,
    setTransactionLoadNotice,
    transactionLoadError,
    transactionLoadNotice,
    transactions
  };
}

function assertOpenBankingResponse(response: Response, error: string | undefined, fallbackMessage: string) {
  if (!response.ok) {
    throw new Error(error || fallbackMessage);
  }
}
