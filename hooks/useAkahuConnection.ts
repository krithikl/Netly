"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataMode } from "@/lib/app/types";
import type { TransactionDateRange } from "@/lib/types";

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
  const [connectionResponse, setConnectionResponse] = useState("");
  const [syncResult, setSyncResult] = useState("");
  const hasAutoCompletedRef = useRef(false);

  const completeAkahuConnection = useCallback(async (responseValue?: string) => {
    const response = await fetch("/api/akahu/complete", {
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
      window.localStorage.setItem("netly_data_mode", "user");
      await refreshTransactions("user", transactionDateRange);
    }
  }, [connectionResponse, refreshTransactions, setDataMode, transactionDateRange]);

  const updateConnectionResponse = useCallback((value: string) => {
    setConnectionResponse(value);
    hasAutoCompletedRef.current = false;
  }, []);

  useEffect(() => {
    if (connectionResponse.trim() && !hasAutoCompletedRef.current) {
      hasAutoCompletedRef.current = true;
      setSyncResult("Completing Akahu connection...");
      completeAkahuConnection(connectionResponse);
    }
  }, [completeAkahuConnection, connectionResponse]);

  return {
    completeAkahuConnection,
    connectionResponse,
    setConnectionResponse,
    setSyncResult,
    syncResult,
    updateConnectionResponse
  };
}

// Converts connection API results into user-facing status text.
function getCompletionMessage(isComplete: boolean, payload: { error?: string; message?: string }) {
  if (!isComplete) {
    return payload.error || "Could not complete authorization.";
  }

  return payload.message || "Connected.";
}
