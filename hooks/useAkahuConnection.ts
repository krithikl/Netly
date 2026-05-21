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
  refreshTransactions: (mode?: DataMode, dateRange?: TransactionDateRange, options?: { forceFullSync?: boolean }) => Promise<void>;
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
      toast.success("Akahu connected");
      setManualTokens({
        appToken: "",
        userToken: ""
      });
      setDataMode("user");
      window.localStorage.setItem("netly_data_mode", "user");

      try {
        await refreshTransactions("user", transactionDateRange, { forceFullSync: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Akahu connected, but transactions could not be loaded.";
        console.error("Akahu connected, but transactions could not be loaded.", error);
        setSyncResult(message);
        toast.error("Could not load transactions");
      }
      return;
    }

    console.error("Akahu connection failed.", completionMessage);
    toast.error("Akahu connection failed");
  }, [manualTokens, refreshTransactions, setDataMode, transactionDateRange]);

  const updateManualTokens = useCallback((tokens: AkahuManualTokens) => {
    setManualTokens(tokens);
  }, []);

  const disconnectAkahuConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/akahu/disconnect", {
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not disconnect Akahu.");
      }

      setManualTokens({
        appToken: "",
        userToken: ""
      });
      setSyncResult(payload.message || "Akahu disconnected.");
      setDataMode("demo");
      window.localStorage.setItem("netly_data_mode", "demo");
      await refreshTransactions("demo", transactionDateRange);
      toast.success("Akahu disconnected");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not disconnect Akahu.";
      console.error("Akahu disconnect failed.", error);
      setSyncResult(message);
      toast.error(message);
    }
  }, [refreshTransactions, setDataMode, transactionDateRange]);

  return {
    completeAkahuConnection,
    disconnectAkahuConnection,
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
