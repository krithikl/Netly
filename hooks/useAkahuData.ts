"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { archiveAndMergeTransactions, markArchiveIncrementalTransactionSynced, readArchivedAccountSnapshot, readArchivedTransactions, writeArchivedAccountSnapshot } from "@/lib/app/transaction-archive";
import { getIncrementalTransactionSyncRange } from "@/lib/app/transaction-sync";
import { currentBalance as fallbackBalance, transactions as fallbackTransactions } from "@/lib/mock-data";
import { readInitialDataMode } from "@/lib/app/browser-state";
import type { AccountDataFreshness, AkahuDataFreshness, DataMode, LinkedAccount } from "@/lib/app/types";
import type { Transaction, TransactionDateRange } from "@/lib/types";

type TransactionsPayload = {
  source: "demo" | "akahu";
  connected?: boolean;
  error?: string;
  nextCursor?: string | null;
  notice?: string;
  transactions: Transaction[];
};

type AccountsPayload = {
  accountFreshness: AccountDataFreshness[];
  availableBalance: number | null;
  balanceRefreshedAt: string | null;
  connected?: boolean;
  error?: string;
  isStale: boolean;
  manualRefreshCooldownMs: number;
  accounts: LinkedAccount[];
  notice?: string;
  primaryAccount: LinkedAccount | null;
  retrievedAt: string | null;
  transactionsRefreshedAt: string | null;
};

type RefreshPayload = {
  connected?: boolean;
  error?: string;
  notice?: string;
  requestedAt?: string;
};

type RefreshTransactionsOptions = {
  forceFullSync?: boolean;
};

const akahuRefreshPollingIntervalMs = 5 * 1000;
const akahuRefreshPollingTimeoutMs = 60 * 1000;
const akahuRefreshStillProcessingNotice = "Akahu accepted the refresh request, but transaction updates are still processing. Try again shortly if the latest transactions are not visible.";

const emptyAkahuDataFreshness: AkahuDataFreshness = {
  accounts: [],
  balanceRefreshedAt: null,
  error: "",
  isStale: false,
  retrievedAt: null,
  status: "idle",
  transactionsRefreshedAt: null
};

// Loads Akahu or demo data and keeps accounts, balances, and transactions together
// Central data hook for Akahu/demo transactions, balances, accounts, and pagination.
export function useAkahuData() {
  const refreshRequestIdRef = useRef(0);
  const transactionPageRequestIdRef = useRef(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionPageTransactions, setTransactionPageTransactions] = useState<Transaction[]>([]);
  const [transactionPageLoadedDateRange, setTransactionPageLoadedDateRange] = useState<TransactionDateRange | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [primaryLinkedAccount, setPrimaryLinkedAccount] = useState<LinkedAccount | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("user");
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializingTransactionHistory, setIsInitializingTransactionHistory] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingTransactionPageRange, setIsLoadingTransactionPageRange] = useState(false);
  const [isLoadingAllTransactions, setIsLoadingAllTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [akahuDataFreshness, setAkahuDataFreshness] = useState<AkahuDataFreshness>(emptyAkahuDataFreshness);
  const [transactionPageNextCursor, setTransactionPageNextCursor] = useState<string | null>(null);
  const [transactionLoadError, setTransactionLoadError] = useState("");
  const [transactionLoadNotice, setTransactionLoadNotice] = useState("");

  const resetBankData = useCallback(() => {
    setTransactions([]);
    setTransactionPageTransactions([]);
    setTransactionPageLoadedDateRange(null);
    setTransactionPageNextCursor(null);
    setIsLoadingTransactionPageRange(false);
    setLinkedAccounts([]);
    setPrimaryLinkedAccount(null);
    setAvailableBalance(null);
    setAkahuDataFreshness(emptyAkahuDataFreshness);
    setIsInitializingTransactionHistory(false);
  }, []);

  // Demo mode can fall back to sample data. Akahu mode should show the connection problem
  const applyFallbackState = useCallback((mode: DataMode, error: unknown, fallbackMessage: string) => {
    const isDemoMode = mode === "demo";
    const errorMessage = error instanceof Error ? error.message : fallbackMessage;

    setTransactions(isDemoMode ? fallbackTransactions : []);
    setTransactionPageTransactions(isDemoMode ? fallbackTransactions : []);
    setTransactionPageNextCursor(null);
    setLinkedAccounts([]);
    setPrimaryLinkedAccount(null);
    setAvailableBalance(isDemoMode ? fallbackBalance : null);
    setAkahuDataFreshness(isDemoMode ? emptyAkahuDataFreshness : getFailedFreshnessState(error, fallbackMessage));
    setIsConnected(false);
    setTransactionLoadError(errorMessage);
    setTransactionLoadNotice("");
    setIsInitializingTransactionHistory(false);
    setIsLoadingTransactionPageRange(false);
    setIsLoadingTransactions(false);
    if (!isDemoMode) {
      toast.error(errorMessage);
    }
  }, []);

  // Loads archived transactions first, then applies fresh Akahu account and transaction payloads.
  const refreshTransactions = useCallback(async (mode: DataMode = dataMode, dateRange?: TransactionDateRange, options: RefreshTransactionsOptions = {}) => {
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    const isCurrentRequest = () => refreshRequestIdRef.current === requestId;
    let incrementalDateRange = dateRange;
    let shouldLoadFullTransactionHistory = false;

    setIsLoadingTransactions(true);
    setIsLoadingTransactionPageRange(false);
    setIsInitializingTransactionHistory(false);

    // Keep the existing screen populated during same-mode refreshes. Clearing here
    // caused the app to flash empty rows/cards during startup refreshes.
    if (mode !== dataMode) {
      resetBankData();
    }

    setAkahuDataFreshness(mode === "user" ? { ...akahuDataFreshness, status: "loading" } : emptyAkahuDataFreshness);

    try {
      if (mode === "user") {
        const { archivedAccountSnapshot, archivedTransactions, archivedTransactionPageTransactions } = await readArchiveHydration(dateRange);
        shouldLoadFullTransactionHistory = archivedTransactions.length === 0;
        incrementalDateRange = getIncrementalTransactionSyncRange(archivedTransactions, dateRange);

        if (!isCurrentRequest()) {
          return;
        }

        setIsInitializingTransactionHistory(shouldLoadFullTransactionHistory);

        setTransactions(archivedTransactions);
        setTransactionPageTransactions(archivedTransactionPageTransactions);
        setTransactionPageLoadedDateRange(dateRange || null);

        if (archivedAccountSnapshot) {
          setAvailableBalance(archivedAccountSnapshot.availableBalance);
          setLinkedAccounts(archivedAccountSnapshot.accounts);
          setPrimaryLinkedAccount(archivedAccountSnapshot.primaryAccount);
          setAkahuDataFreshness({
            accounts: archivedAccountSnapshot.accountFreshness,
            balanceRefreshedAt: archivedAccountSnapshot.balanceRefreshedAt,
            error: "",
            isStale: archivedAccountSnapshot.isStale,
            retrievedAt: archivedAccountSnapshot.retrievedAt,
            status: "loading",
            transactionsRefreshedAt: archivedAccountSnapshot.transactionsRefreshedAt
          });
        }

        if (archivedTransactions.length > 0 || archivedTransactionPageTransactions.length > 0 || archivedAccountSnapshot) {
          setIsLoadingTransactions(false);
          // setTransactionLoadNotice("Showing encrypted archived data while checking Akahu for fresh data.");
        }
      }

      const accountSetters = {
        setAkahuDataFreshness,
        setAvailableBalance,
        setIsConnected,
        setLinkedAccounts,
        setPrimaryLinkedAccount,
        setTransactionLoadNotice
      };

      if (mode === "user") {
        const manualRefreshResult = await loadAndApplyAccountSnapshot(mode, isCurrentRequest, accountSetters, { requestManualRefresh: true });

        if (!isCurrentRequest()) {
          return;
        }

        const shouldSyncFullHistory = shouldLoadFullTransactionHistory || options.forceFullSync;
        const syncResult = shouldSyncFullHistory
          ? await syncAllAkahuTransactionsToArchive(dateRange)
          : await syncVisibleAkahuTransactionsToArchive(incrementalDateRange, dateRange);

        if (!isCurrentRequest()) {
          return;
        }

        setTransactions(syncResult.archivedTransactions);
        setTransactionPageTransactions(syncResult.archivedTransactionPageTransactions);
        setTransactionPageLoadedDateRange(dateRange || null);
        setTransactionPageNextCursor("nextCursor" in syncResult ? syncResult.nextCursor : null);
        if (syncResult.connected) {
          setIsConnected(true);
        }
        setTransactionLoadError("");
        setTransactionLoadNotice("notice" in syncResult ? syncResult.notice || "" : "");

        if (manualRefreshResult?.shouldPollForFreshness) {
          void pollAndResyncAfterAkahuRefresh({
            accountSetters,
            isCurrentRequest,
            latestPayload: manualRefreshResult.latestPayload,
            pageDateRange: dateRange,
            setIsConnected,
            setTransactionLoadError,
            setTransactionLoadNotice,
            setTransactionPageLoadedDateRange,
            setTransactionPageNextCursor,
            setTransactionPageTransactions,
            setTransactions,
            shouldSyncFullHistory,
            syncDateRange: incrementalDateRange
          });
        }
        return;
      }

      const accountsRequest = loadAndApplyAccountSnapshot(mode, isCurrentRequest, accountSetters);
      const transactionsRequest = loadDemoTransactions(dateRange).then(({ transactionsPayload, transactionPagePayload }) => {
          if (!isCurrentRequest()) {
            return;
          }

          setTransactions(transactionsPayload.transactions);
          setTransactionPageTransactions(transactionPagePayload.transactions);
          setTransactionPageLoadedDateRange(dateRange || null);
          setTransactionPageNextCursor(transactionPagePayload.nextCursor || null);
          setTransactionLoadError("");
          setTransactionLoadNotice(transactionsPayload.notice || transactionPagePayload.notice || "");
        });

      await Promise.all([accountsRequest, transactionsRequest]);
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      throw error;
    } finally {
      if (isCurrentRequest()) {
        setIsInitializingTransactionHistory(false);
        setIsLoadingTransactions(false);
      }
    }
  }, [akahuDataFreshness, dataMode, resetBankData]);

  const refreshTransactionPage = useCallback(async (mode: DataMode = dataMode, dateRange?: TransactionDateRange) => {
    const requestId = transactionPageRequestIdRef.current + 1;
    transactionPageRequestIdRef.current = requestId;
    const isCurrentRequest = () => transactionPageRequestIdRef.current === requestId;

    setIsLoadingTransactionPageRange(true);
    setTransactionPageNextCursor(null);

    try {
      if (mode === "user") {
        const archivedPageTransactions = await readArchivedTransactions(dateRange);

        if (!isCurrentRequest()) {
          return;
        }

        setTransactionPageTransactions(archivedPageTransactions);
        setTransactionPageLoadedDateRange(dateRange || null);

        if (isFutureTransactionRange(dateRange)) {
          setTransactionPageNextCursor(null);
          setTransactionLoadError("");
          setTransactionLoadNotice(archivedPageTransactions.length === 0 ? "No transactions found for this period." : "");
          return;
        }

        const { archivedTransactionPageTransactions, nextCursor } = await syncVisibleAkahuTransactionsToArchive(dateRange, dateRange);

        if (!isCurrentRequest()) {
          return;
        }

        setTransactionPageTransactions(archivedTransactionPageTransactions);
        setTransactionPageLoadedDateRange(dateRange || null);
        setTransactionPageNextCursor(nextCursor);
        setTransactionLoadError("");
        setTransactionLoadNotice("");
        await loadAndApplyAccountSnapshot(mode, isCurrentRequest, {
          setAkahuDataFreshness,
          setAvailableBalance,
          setIsConnected,
          setLinkedAccounts,
          setPrimaryLinkedAccount,
          setTransactionLoadNotice
        });
        return;
      }

      const response = await fetch(getTransactionsUrl(mode, dateRange));
      const payload = await readJsonResponse<TransactionsPayload>(response, "transactions");

      assertAkahuResponse(response, payload.error, "Could not load transactions.");
      if (!isCurrentRequest()) {
        return;
      }

      setTransactionPageTransactions(payload.transactions);
      setTransactionPageLoadedDateRange(dateRange || null);
      setTransactionPageNextCursor(payload.nextCursor || null);
      setTransactionLoadError(payload.error || "");
      setTransactionLoadNotice(payload.notice || "");
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      console.error("Could not load transaction range.", error);
      setTransactionLoadError("");
      setTransactionLoadNotice("No transactions found for this period.");
      throw error;
    } finally {
      if (isCurrentRequest()) {
        setIsLoadingTransactionPageRange(false);
      }
    }
  }, [dataMode]);

  const loadMoreTransactions = useCallback(async (dateRange?: TransactionDateRange) => {
    if (dataMode === "user") {
      setTransactionPageNextCursor(null);
      setTransactionLoadNotice("All matching archived transactions are already loaded for this range.");
      return;
    }

    if (!transactionPageNextCursor) {
      return;
    }

    setIsLoadingMoreTransactions(true);

    try {
      const response = await fetch(getTransactionsUrl(dataMode, dateRange, transactionPageNextCursor));
      const payload = await readJsonResponse<TransactionsPayload>(response, "more transactions");

      assertAkahuResponse(response, payload.error, "Could not load more transactions.");
      setTransactionPageTransactions((currentTransactions) => mergeTransactionPages(currentTransactions, payload.transactions));
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
      if (dataMode === "user") {
        const { archivedTransactions, archivedTransactionPageTransactions, connected } = await syncAllAkahuTransactionsToArchive(dateRange);
        setTransactions(archivedTransactions);
        setTransactionPageTransactions(archivedTransactionPageTransactions);
        setTransactionPageNextCursor(null);
        setTransactionLoadError("");
        setTransactionLoadNotice("");
        if (connected) {
          toast.success("Transactions synced");
        }
        return;
      }

      const response = await fetch(getTransactionsUrl(dataMode, dateRange, undefined, true));
      const payload = await readJsonResponse<TransactionsPayload>(response, "all transactions");

      assertAkahuResponse(response, payload.error, "Could not load all transactions for this range.");
      setTransactionPageTransactions(payload.transactions);
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
      setTransactionPageLoadedDateRange(dateRange || null);
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
    akahuDataFreshness,
    applyFallbackState,
    availableBalance,
    changeDataMode,
    dataMode,
    isInitializingTransactionHistory,
    isConnected,
    isLoadingAllTransactions,
    isLoadingTransactionPageRange,
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
    transactionPageLoadedDateRange,
    transactionPageNextCursor,
    transactionPageTransactions,
    transactions
  };
}

// Reads archived Akahu data so only the active request applies it to state.
async function readArchiveHydration(dateRange: TransactionDateRange | undefined) {
  const [archivedAccountSnapshot, archivedTransactions, archivedTransactionPageTransactions] = await Promise.all([
    readArchivedAccountSnapshot(),
    readArchivedTransactions(),
    readArchivedTransactions(dateRange)
  ]);

  return {
    archivedAccountSnapshot,
    archivedTransactions,
    archivedTransactionPageTransactions
  };
}

type AccountSnapshotStateSetters = {
  setAkahuDataFreshness: (freshness: AkahuDataFreshness) => void;
  setAvailableBalance: (balance: number | null) => void;
  setIsConnected: (isConnected: boolean) => void;
  setLinkedAccounts: (accounts: LinkedAccount[]) => void;
  setPrimaryLinkedAccount: (account: LinkedAccount | null) => void;
  setTransactionLoadNotice: (notice: string) => void;
};

type AccountRefreshPollingResult = {
  payload: AccountsPayload;
  timedOut: boolean;
};

type ManualRefreshResult = {
  latestPayload: AccountsPayload;
  shouldPollForFreshness: boolean;
};

type PostRefreshPollingOptions = {
  accountSetters: AccountSnapshotStateSetters;
  isCurrentRequest: () => boolean;
  latestPayload: AccountsPayload;
  pageDateRange: TransactionDateRange | undefined;
  setIsConnected: (isConnected: boolean) => void;
  setTransactionLoadError: (error: string) => void;
  setTransactionLoadNotice: (notice: string) => void;
  setTransactionPageLoadedDateRange: (dateRange: TransactionDateRange | null) => void;
  setTransactionPageNextCursor: (nextCursor: string | null) => void;
  setTransactionPageTransactions: (transactions: Transaction[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  shouldSyncFullHistory: boolean | undefined;
  syncDateRange: TransactionDateRange | undefined;
};

// Loads account data and optionally requests an on-demand Akahu refresh for launch syncs.
async function loadAndApplyAccountSnapshot(
  mode: DataMode,
  isCurrentRequest: () => boolean,
  setters: AccountSnapshotStateSetters,
  options: { requestManualRefresh?: boolean } = {}
): Promise<ManualRefreshResult | null> {
  const accountsPayload = await loadAccountsPayload(mode);

  if (!isCurrentRequest()) {
    return null;
  }

  applyAccountSnapshot(mode, accountsPayload, "refreshed", setters);

  if (mode !== "user" || !accountsPayload.connected || !options.requestManualRefresh || !accountsPayload.isStale) {
    return null;
  }

  setters.setAkahuDataFreshness(getFreshnessState(accountsPayload, "refreshing"));
  let refreshPayload: RefreshPayload;

  try {
    refreshPayload = await requestAkahuRefresh();
  } catch (error) {
    if (isCurrentRequest()) {
      const message = error instanceof Error ? error.message : "Could not request Akahu refresh.";
      setters.setAkahuDataFreshness({
        ...getFreshnessState(accountsPayload, "failed"),
        error: message
      });
    }

    throw error;
  }

  if (!isCurrentRequest()) {
    return null;
  }

  console.info("Akahu refresh endpoint completed.", {
    notice: refreshPayload.notice || "",
    requestedAt: refreshPayload.requestedAt || ""
  });

  const refreshedAccountsPayload = await loadAccountsPayload(mode);

  if (!isCurrentRequest()) {
    return null;
  }

  applyAccountSnapshot(mode, refreshedAccountsPayload, refreshedAccountsPayload.isStale ? "refreshing" : "refreshed", setters);

  return {
    latestPayload: refreshedAccountsPayload,
    shouldPollForFreshness: refreshedAccountsPayload.isStale
  };
}

// Applies the Akahu account snapshot to balance, account labels, and freshness state.
function applyAccountSnapshot(mode: DataMode, payload: AccountsPayload, status: AkahuDataFreshness["status"], setters: AccountSnapshotStateSetters) {
  setters.setLinkedAccounts(payload.accounts || []);
  setters.setPrimaryLinkedAccount(payload.primaryAccount || null);
  setters.setAvailableBalance(payload.availableBalance);
  setters.setIsConnected(mode === "user" && Boolean(payload.connected));

  if (mode === "user") {
    setters.setAkahuDataFreshness(getFreshnessState(payload, status));

    if (payload.connected) {
      writeArchivedAccountSnapshot({
        accountFreshness: payload.accountFreshness || [],
        accounts: payload.accounts || [],
        availableBalance: payload.availableBalance,
        balanceRefreshedAt: payload.balanceRefreshedAt,
        isStale: payload.isStale,
        primaryAccount: payload.primaryAccount || null,
        retrievedAt: payload.retrievedAt,
        transactionsRefreshedAt: payload.transactionsRefreshedAt
      }).catch((error: unknown) => {
        setters.setTransactionLoadNotice(error instanceof Error ? error.message : "Could not archive account balance snapshot.");
      });
    }
  }

  if (payload.notice) {
    setters.setTransactionLoadNotice(payload.notice);
  }
}

// Reads and validates the account endpoint, which also carries balance and freshness.
async function loadAccountsPayload(mode: DataMode) {
  const response = await fetch(`/api/akahu/accounts?source=${mode}`);
  const payload = await readJsonResponse<AccountsPayload>(response, "accounts");

  assertAkahuResponse(response, payload.error, "Could not load accounts.");
  return payload;
}

// Polls Akahu account freshness until both balance and transaction timestamps are current.
async function pollAccountsUntilFresh(
  latestPayload: AccountsPayload,
  isCurrentRequest: () => boolean,
  setters: AccountSnapshotStateSetters
): Promise<AccountRefreshPollingResult | null> {
  const deadline = Date.now() + akahuRefreshPollingTimeoutMs;
  let currentPayload = latestPayload;

  while (isCurrentRequest()) {
    try {
      const payload = await loadAccountsPayload("user");

      if (!isCurrentRequest()) {
        return null;
      }

      currentPayload = payload;

      if (!payload.isStale) {
        return {
          payload,
          timedOut: false
        };
      }

      applyAccountSnapshot("user", payload, "refreshing", setters);
    } catch (error) {
      if (isCurrentRequest()) {
        setters.setAkahuDataFreshness({
          ...getFreshnessState(currentPayload, "failed"),
          error: error instanceof Error ? error.message : "Could not poll Akahu account refresh."
        });
      }

      throw error;
    }

    const remainingMs = deadline - Date.now();

    if (remainingMs <= 0) {
      return {
        payload: currentPayload,
        timedOut: true
      };
    }

    await waitForAkahuRefreshPoll(Math.min(akahuRefreshPollingIntervalMs, remainingMs));
  }

  return null;
}

// Continues a bounded Akahu freshness poll after the visible transaction sync has completed.
async function pollAndResyncAfterAkahuRefresh(options: PostRefreshPollingOptions) {
  try {
    const pollingResult = await pollAccountsUntilFresh(
      options.latestPayload,
      options.isCurrentRequest,
      options.accountSetters
    );

    if (!pollingResult || !options.isCurrentRequest()) {
      return;
    }

    applyAccountSnapshot("user", pollingResult.payload, "refreshed", options.accountSetters);

    if (pollingResult.timedOut) {
      options.setTransactionLoadNotice(akahuRefreshStillProcessingNotice);
      return;
    }

    const syncResult = options.shouldSyncFullHistory
      ? await syncAllAkahuTransactionsToArchive(options.pageDateRange)
      : await syncVisibleAkahuTransactionsToArchive(options.syncDateRange, options.pageDateRange);

    if (!options.isCurrentRequest()) {
      return;
    }

    options.setTransactions(syncResult.archivedTransactions);
    options.setTransactionPageTransactions(syncResult.archivedTransactionPageTransactions);
    options.setTransactionPageLoadedDateRange(options.pageDateRange || null);
    options.setTransactionPageNextCursor("nextCursor" in syncResult ? syncResult.nextCursor : null);
    if (syncResult.connected) {
      options.setIsConnected(true);
    }
    options.setTransactionLoadError("");
    options.setTransactionLoadNotice("notice" in syncResult ? syncResult.notice || "" : "");
  } catch (error) {
    if (!options.isCurrentRequest()) {
      return;
    }

    const message = error instanceof Error ? error.message : "Could not finish Akahu refresh polling.";
    options.setTransactionLoadError(message);
    toast.error(message);
  }
}

// Calls Akahu's on-demand refresh route and fails loudly if it is rejected.
async function requestAkahuRefresh() {
  const response = await fetch("/api/akahu/refresh", { method: "POST" });
  const payload = await readJsonResponse<RefreshPayload>(response, "Akahu refresh");

  assertAkahuResponse(response, payload.error, "Could not request Akahu refresh.");
  return payload;
}

// Waits between bounded Akahu freshness polling attempts.
function waitForAkahuRefreshPoll(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

// Converts account payload freshness into app state for Settings.
function getFreshnessState(payload: AccountsPayload, status: AkahuDataFreshness["status"]): AkahuDataFreshness {
  return {
    accounts: payload.accountFreshness || [],
    balanceRefreshedAt: payload.balanceRefreshedAt,
    error: "",
    isStale: payload.isStale,
    retrievedAt: payload.retrievedAt,
    status,
    transactionsRefreshedAt: payload.transactionsRefreshedAt
  };
}

// Builds a loud freshness error state for failed user-mode loads.
function getFailedFreshnessState(error: unknown, fallbackMessage: string): AkahuDataFreshness {
  return {
    ...emptyAkahuDataFreshness,
    error: error instanceof Error ? error.message : fallbackMessage,
    status: "failed"
  };
}

// Syncs only the visible transaction range so launch refreshes update quickly.
async function syncVisibleAkahuTransactionsToArchive(syncDateRange: TransactionDateRange | undefined, pageDateRange: TransactionDateRange | undefined = syncDateRange) {
  if (isFutureTransactionRange(syncDateRange)) {
    return {
      archivedTransactions: await readArchivedTransactions(),
      archivedTransactionPageTransactions: await readArchivedTransactions(pageDateRange),
      connected: false,
      nextCursor: null
    };
  }

  const response = await fetch(getTransactionsUrl("user", syncDateRange));
  const payload = await readJsonResponse<TransactionsPayload>(response, "transactions");

  assertAkahuResponse(response, payload.error, "Could not sync visible Akahu transactions.");
  const archivedTransactionPageTransactions = await archiveAndMergeTransactions(payload.transactions, pageDateRange);
  const archivedTransactions = await readArchivedTransactions();
  if (payload.connected) {
    await markArchiveIncrementalTransactionSynced();
  }

  return {
    archivedTransactions,
    archivedTransactionPageTransactions,
    connected: Boolean(payload.connected),
    nextCursor: payload.nextCursor || null,
    notice: payload.notice || ""
  };
}

// Syncs the full Akahu transaction history into the encrypted local archive, then serves the active range from the archive.
async function syncAllAkahuTransactionsToArchive(dateRange: TransactionDateRange | undefined) {
  const response = await fetch(getTransactionsUrl("user", undefined, undefined, true));
  const payload = await readJsonResponse<TransactionsPayload>(response, "all transactions");

  assertAkahuResponse(response, payload.error, "Could not sync Akahu transactions.");
  const archivedTransactions = await archiveAndMergeTransactions(payload.transactions);
  const archivedTransactionPageTransactions = dateRange
    ? await readArchivedTransactions(dateRange)
    : archivedTransactions;

  return {
    archivedTransactions,
    archivedTransactionPageTransactions,
    connected: Boolean(payload.connected),
    notice: payload.notice || ""
  };
}

// Loads demo transactions without using the persistent user archive.
async function loadDemoTransactions(dateRange: TransactionDateRange | undefined) {
  const transactionsResponse = await fetch(getTransactionsUrl("demo", undefined, undefined, true));
  const transactionPageResponse = dateRange ? await fetch(getTransactionsUrl("demo", dateRange)) : transactionsResponse;
  const transactionsPayload = await readJsonResponse<TransactionsPayload>(transactionsResponse, "transactions");
  const transactionPagePayload = transactionPageResponse === transactionsResponse
    ? transactionsPayload
    : await readJsonResponse<TransactionsPayload>(transactionPageResponse, "transaction page");

  assertAkahuResponse(transactionsResponse, transactionsPayload.error, "Could not load transactions.");
  assertAkahuResponse(transactionPageResponse, transactionPagePayload.error, "Could not load transactions.");

  return {
    transactionsPayload,
    transactionPagePayload
  };
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

// Akahu rejects transaction ranges whose start date is in the future.
function isFutureTransactionRange(dateRange: TransactionDateRange | undefined) {
  if (!dateRange?.from) {
    return false;
  }

  const rangeStart = new Date(`${dateRange.from}T00:00:00`);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (Number.isNaN(rangeStart.getTime())) {
    throw new Error(`Invalid transaction range start date "${dateRange.from}".`);
  }

  return rangeStart.getTime() > todayStart.getTime();
}

function getTransactionPageId(transaction: Transaction) {
  if (transaction._id) {
    return transaction._id;
  }

  return [
    "transaction",
    transaction._account || "account",
    transaction.date,
    transaction.description,
    transaction.amount.toFixed(2)
  ].join(":");
}
