import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { getAkahuAccounts } from "@/lib/open-banking/accounts";
import { dedupeAkahuTransactions, getAkahuTransactions } from "@/lib/open-banking/normalize";
import { getValidAccessToken } from "@/lib/open-banking/token";
import { transactions as demoTransactions } from "@/lib/mock-data";
import { getTransactionDate, getTransactionStatus } from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

const demoPageSize = 100;

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const toDate = request.nextUrl.searchParams.get("to") || undefined;

  if (source === "demo") {
    const demoPage = getDemoTransactionPage(demoTransactions, cursor, fromDate, toDate);

    return NextResponse.json({
      source: "demo",
      connected: true,
      rawCount: demoPage.rawCount,
      nextCursor: demoPage.nextCursor,
      transactions: demoPage.transactions,
      notice: "Showing Akahu-shaped demo transactions."
    });
  }

  const { accessToken } = getValidAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      rawCount: 0,
      nextCursor: null,
      transactions: [],
      notice: "No Akahu user token is connected. Connect Akahu or switch to demo data."
    });
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const accountsResponse = await client.getAccounts({ userToken: accessToken });
    const accounts = getAkahuAccounts(accountsResponse);
    const transactionsResponse = await client.getTransactionsPageForAccounts({ userToken: accessToken }, accounts, {
      cursor,
      end: toAkahuEndDate(toDate),
      start: toAkahuStartDate(fromDate)
    });
    const transactions = filterTransactionsByDateRange(
      dedupeAkahuTransactions(getAkahuTransactions(transactionsResponse, accounts)),
      fromDate,
      toDate
    );
    const notice = transactions.length === 0 ? getEmptyTransactionsNotice(accounts) : "";

    return NextResponse.json({
      source: "akahu",
      connected: true,
      rawCount: transactionsResponse.items?.length || 0,
      nextCursor: transactionsResponse.cursor?.next || null,
      accountCount: accounts.length,
      rawAccounts: accounts,
      transactions,
      notice
    });
  } catch (error) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      rawCount: 0,
      nextCursor: null,
      transactions: [],
      error: error instanceof Error ? error.message : "Unknown Akahu transaction fetch error"
    }, { status: 502 });
  }
}

function getDemoTransactionPage(transactions: Transaction[], cursor: string | undefined, fromDate: string | undefined, toDate: string | undefined) {
  const offset = Number.parseInt(cursor || "0", 10);
  const startIndex = Number.isFinite(offset) && offset > 0 ? offset : 0;
  const filteredTransactions = filterTransactionsByDateRange(transactions, fromDate, toDate);
  const pageTransactions = filteredTransactions.slice(startIndex, startIndex + demoPageSize);
  const nextOffset = startIndex + pageTransactions.length;

  return {
    nextCursor: nextOffset < filteredTransactions.length ? String(nextOffset) : null,
    rawCount: filteredTransactions.length,
    transactions: pageTransactions
  };
}

function filterTransactionsByDateRange(transactions: Transaction[], fromDate: string | undefined, toDate: string | undefined) {
  if (!fromDate && !toDate) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    if (getTransactionStatus(transaction) === "Upcoming") {
      return true;
    }

    const transactionDate = getTransactionDate(transaction);
    return (!fromDate || transactionDate >= fromDate) && (!toDate || transactionDate <= toDate);
  });
}

function toAkahuStartDate(date: string | undefined) {
  if (!date) {
    return undefined;
  }

  const utcStart = getUtcDateTime(date, 0, 0, 0, 0) - 1;
  return new Date(utcStart).toISOString();
}

function toAkahuEndDate(date: string | undefined) {
  if (!date) {
    return undefined;
  }

  return new Date(getUtcDateTime(date, 23, 59, 59, 999)).toISOString();
}

function getUtcDateTime(date: string, hours: number, minutes: number, seconds: number, milliseconds: number) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds);
}

function getEmptyTransactionsNotice(accounts: Array<{ attributes?: string[]; connection?: { name?: string }; name?: string }>) {
  const hasDemoBankAccount = accounts.some((account) => /demo bank/i.test(account.connection?.name || account.name || ""));
  const hasTransactionCapableAccount = accounts.some((account) => account.attributes?.includes("TRANSACTIONS"));

  if (hasDemoBankAccount && !hasTransactionCapableAccount) {
    return "Akahu Demo Bank connected successfully, but Demo Bank enduring connections do not return transaction data. Use Netly demo mode or connect a real transaction-capable account for transaction testing.";
  }

  if (!hasTransactionCapableAccount) {
    return "Akahu connected successfully, but none of the shared accounts expose transaction data. In Akahu, share an account with the TRANSACTIONS attribute or connect a transaction-capable account.";
  }

  return "Akahu connected successfully, but no transactions were returned for the shared accounts yet.";
}
