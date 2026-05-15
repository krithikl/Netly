"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
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
    const completionMessage = getCompletionMessage(response.ok, payload);

    setSyncResult(completionMessage);

    if (response.ok) {
      toast.success("Akahu connected", {
        description: completionMessage
      });
      setManualTokens({
        appToken: "",
        userToken: ""
      });
      setDataMode("user");
      window.localStorage.setItem("netly_data_mode", "user");

      try {
        await refreshTransactions("user", transactionDateRange);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Akahu connected, but transactions could not be loaded.";
        setSyncResult(message);
        toast.error("Akahu connected, but loading failed", {
          description: message
        });
      }
      return;
    }

    toast.error("Akahu connection failed", {
      description: completionMessage
    });
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
