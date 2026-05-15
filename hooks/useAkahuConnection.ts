"use client";

import { useCallback, useState } from "react";
import type { DataMode } from "@/lib/app/types";
import type { TransactionDateRange } from "@/lib/types";

export type AkahuManualTokens = {
  appToken: string;
  userToken: string;
};

type UseAkahuConnectionOptions = {
  refreshTransactions: (mode?: DataMode, dateRange?: TransactionDateRange) => Promise<void>;
  setDataMode: (mode: DataMode) => void;
  transactionDateRange: TransactionDateRange;
};

// Owns Akahu connection form state and calls the complete/start connection endpoints.
export function useAkahuConnection({
  refreshTransactions,
  setDataMode,
  transactionDateRange
}: UseAkahuConnectionOptions) {
  const [manualTokens, setManualTokens] = useState<AkahuManualTokens>({
    appToken: "",
    userToken: ""
  });
  const [syncResult, setSyncResult] = useState("");

  const completeAkahuConnection = useCallback(async (tokens?: AkahuManualTokens) => {
    const submittedTokens = tokens || manualTokens;
    const response = await fetch("/api/akahu/complete", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        appToken: submittedTokens.appToken,
        userToken: submittedTokens.userToken
      })
    });
    const payload = (await response.json()) as { error?: string; message?: string };

    setSyncResult(getCompletionMessage(response.ok, payload));

    if (response.ok) {
      setManualTokens({
        appToken: "",
        userToken: ""
      });
      setDataMode("user");
      window.localStorage.setItem("netly_data_mode", "user");

      try {
        await refreshTransactions("user", transactionDateRange);
      } catch (error) {
        setSyncResult(error instanceof Error ? error.message : "Akahu connected, but transactions could not be loaded.");
      }
    }
  }, [manualTokens, refreshTransactions, setDataMode, transactionDateRange]);

  const updateManualTokens = useCallback((tokens: AkahuManualTokens) => {
    setManualTokens(tokens);
  }, []);

  return {
    completeAkahuConnection,
    manualTokens,
    setSyncResult,
    syncResult,
    updateManualTokens
  };
}

// Converts connection API results into user-facing status text.
function getCompletionMessage(isComplete: boolean, payload: { error?: string; message?: string }) {
  if (!isComplete) {
    return payload.error || "Could not complete authorization.";
  }

  return payload.message || "Connected.";
}
