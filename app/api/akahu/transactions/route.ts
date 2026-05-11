import { NextRequest, NextResponse } from "next/server";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { getValidAccessToken } from "@/lib/akahu/token";
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
    const provider = createAkahuProviderFromEnv();
    const transactionPage = await provider.getTransactions({ accessToken }, {
      cursor,
      fromDate,
      toDate
    });

    return NextResponse.json({
      source: provider.id,
      connected: true,
      rawCount: transactionPage.rawCount,
      nextCursor: transactionPage.nextCursor,
      accountCount: transactionPage.accountCount,
      rawAccounts: transactionPage.rawAccounts,
      transactions: transactionPage.transactions,
      notice: transactionPage.notice
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
