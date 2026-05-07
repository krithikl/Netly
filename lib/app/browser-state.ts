import { categoryColorsStorageKey, categoryOverridesStorageKey, customCategoriesStorageKey, deletedCategoriesStorageKey, defaultCategoryColors, paymentTestBaselineStorageKey, paymentTestResultStorageKey } from "@/lib/app/constants";
import { parseStoredJson } from "@/lib/app/storage";
import type { DataMode, PaymentTestResult, View } from "@/lib/app/types";

export function storePaymentBaseline(availableBalance: number | null, transactionCount: number) {
  window.localStorage.setItem(
    paymentTestBaselineStorageKey,
    JSON.stringify({
      availableBalance,
      transactionCount
    })
  );
}

export function readCategoryOverrides() {
  return parseStoredJson<Record<string, string>>(window.localStorage.getItem(categoryOverridesStorageKey)) || {};
}

export function readCustomCategories() {
  return parseStoredJson<string[]>(window.localStorage.getItem(customCategoriesStorageKey)) || [];
}

export function readDeletedCategories() {
  return parseStoredJson<string[]>(window.localStorage.getItem(deletedCategoriesStorageKey)) || [];
}

export function readCategoryColors() {
  const stored = parseStoredJson<Record<string, string>>(window.localStorage.getItem(categoryColorsStorageKey)) || {};
  return { ...defaultCategoryColors, ...stored };
}

export function readInitialDataMode(): DataMode {
  return window.localStorage.getItem("moneyfit_data_mode") === "demo" ? "demo" : "user";
}

export function readAuthResponseCookie() {
  const authResponseCookie = document.cookie.split("; ").find((row) => row.startsWith("moneyfit_ob_response="));

  if (!authResponseCookie) {
    return "";
  }

  const response = authResponseCookie.split("=")[1];
  document.cookie = "moneyfit_ob_response=; path=/; max-age=0";
  return response ? decodeURIComponent(response) : "";
}

export function handleCallbackParams({
  setActiveView,
  setDataMode,
  setPaymentTestResult,
  setSyncResult
}: {
  setActiveView: (view: View) => void;
  setDataMode: (mode: DataMode) => void;
  setPaymentTestResult: (result: PaymentTestResult) => void;
  setSyncResult: (message: string) => void;
}) {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get("connected");
  const connectionError = params.get("connectionError");
  const paymentTest = params.get("paymentTest");

  if (connected === "1") {
    setSyncResult("Connected to PNZ sandbox. Loading transactions...");
    clearUrlParams();
    return { forceUserMode: false };
  }

  if (connectionError) {
    setSyncResult(`Connection failed: ${decodeURIComponent(connectionError)}`);
    clearUrlParams();
    return { forceUserMode: false };
  }

  if (paymentTest) {
    handlePaymentCallback(params, setActiveView, setDataMode, setPaymentTestResult, setSyncResult);
    clearUrlParams();
    return { forceUserMode: true };
  }

  restoreStoredPaymentResult(setPaymentTestResult);
  return { forceUserMode: false };
}

function handlePaymentCallback(
  params: URLSearchParams,
  setActiveView: (view: View) => void,
  setDataMode: (mode: DataMode) => void,
  setPaymentTestResult: (result: PaymentTestResult) => void,
  setSyncResult: (message: string) => void
) {
  const paymentTest = params.get("paymentTest");
  const paymentStatus = params.get("paymentStatus");
  const paymentError = params.get("paymentError");
  const baseline =
    parseStoredJson<{ availableBalance?: number | null; transactionCount?: number }>(window.localStorage.getItem(paymentTestBaselineStorageKey)) || {};
  const nextPaymentTestResult: PaymentTestResult = {
    status: paymentTest === "error" ? "error" : "submitted",
    paymentStatus: paymentStatus || undefined,
    paymentId: params.get("paymentId") || undefined,
    consentId: params.get("consentId") || undefined,
    error: paymentError ? decodeURIComponent(paymentError) : undefined,
    baselineBalance: baseline.availableBalance ?? null,
    baselineTransactionCount: baseline.transactionCount
  };

  setActiveView("payment");
  setDataMode("user");
  window.localStorage.setItem("moneyfit_data_mode", "user");
  window.localStorage.setItem(paymentTestResultStorageKey, JSON.stringify(nextPaymentTestResult));
  setPaymentTestResult(nextPaymentTestResult);
  setSyncResult(getPaymentCallbackMessage(paymentTest, paymentStatus, paymentError));
}

function getPaymentCallbackMessage(paymentTest: string | null, paymentStatus: string | null, paymentError: string | null) {
  if (paymentTest === "error") {
    return `Payment test failed: ${paymentError ? decodeURIComponent(paymentError) : "Unknown payment error"}`;
  }

  return `Payment test submitted${paymentStatus ? `: ${paymentStatus}` : "."} Reloading PNZ balances and transactions...`;
}

function restoreStoredPaymentResult(setPaymentTestResult: (result: PaymentTestResult) => void) {
  const parsedPaymentTestResult = parseStoredJson<PaymentTestResult>(window.localStorage.getItem(paymentTestResultStorageKey));

  if (parsedPaymentTestResult) {
    setPaymentTestResult(parsedPaymentTestResult);
  }
}

function clearUrlParams() {
  window.history.replaceState({}, "", window.location.pathname);
}
