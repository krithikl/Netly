import { NextRequest, NextResponse } from "next/server";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import type { AkahuProvider, AkahuTransactionResult } from "@/lib/akahu/provider";
import { getMissingAkahuCredentialsNotice, getValidAccessToken } from "@/lib/akahu/token";
import { transactions as demoTransactions } from "@/lib/mock-data";
import { isTransactionInDateRange } from "@/lib/periods";
import type { Transaction } from "@/lib/types";

const demoPageSize = 100;
const maxAkahuLoadAllPages = 25;

// Returns paginated transactions from Akahu or demo data for the app data hooks.
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
  const fromDate = request.nextUrl.searchParams.get("from") || undefined;
  const loadAll = request.nextUrl.searchParams.get("load") === "all";
  const toDate = request.nextUrl.searchParams.get("to") || undefined;

  if (source === "demo") {
    const demoPage = loadAll
      ? getAllDemoTransactions(demoTransactions, fromDate, toDate)
      : getDemoTransactionPage(demoTransactions, cursor, fromDate, toDate);

    return NextResponse.json({
      source: "demo",
      connected: true,
      loadedAll: loadAll,
      rawCount: demoPage.rawCount,
      nextCursor: demoPage.nextCursor,
      transactions: demoPage.transactions,
      notice: "Showing Akahu-shaped demo transactions."
    });
  }

  const { accessToken, appToken } = await getValidAccessToken(request);

  if (!accessToken || !appToken) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      rawCount: 0,
      nextCursor: null,
      transactions: [],
      notice: getMissingAkahuCredentialsNotice(appToken, accessToken)
    });
  }

  try {
    const provider = createAkahuProviderFromEnv();
    const transactionPage = loadAll
      ? await getAllAkahuTransactions(provider, { accessToken, appToken }, fromDate, toDate)
      : await provider.getTransactions({ accessToken, appToken }, {
        cursor,
        fromDate,
        toDate
      });

    return NextResponse.json({
      source: provider.id,
      connected: true,
      loadedAll: loadAll,
      rawCount: transactionPage.rawCount,
      nextCursor: transactionPage.nextCursor,
      accountCount: transactionPage.accountCount,
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

// Follows Akahu cursors for one explicit user-triggered range load.
async function getAllAkahuTransactions(
  provider: AkahuProvider,
  token: { accessToken: string; appToken: string },
  fromDate: string | undefined,
  toDate: string | undefined
) {
  const accountResult = await provider.getAccounts(token);
  const transactions: Transaction[] = [];
  let rawCount = 0;
  const accountCount = accountResult.accounts.length;
  let nextCursor: string | null = null;
  let notice = accountResult.notice;

  for (let page = 0; page < maxAkahuLoadAllPages; page += 1) {
    const result: AkahuTransactionResult = await provider.getTransactionsForAccounts(token, {
      accounts: accountResult.accounts,
      cursor: nextCursor || undefined,
      fromDate,
      toDate
    });

    transactions.push(...result.transactions);
    rawCount += result.rawCount;
    notice = result.notice || notice;
    nextCursor = result.nextCursor;

    if (!nextCursor) {
      return {
        accountCount,
        rawCount,
        nextCursor,
        transactions,
        notice
      };
    }
  }

  throw new Error(`Akahu returned more than ${maxAkahuLoadAllPages} transaction pages for this range. Narrow the date range before loading all transactions.`);
}

// Applies pagination/date filtering to demo transactions so UI paths match Akahu mode.
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

// Returns every demo transaction for the selected range so demo mirrors load-all.
function getAllDemoTransactions(transactions: Transaction[], fromDate: string | undefined, toDate: string | undefined) {
  const filteredTransactions = filterTransactionsByDateRange(transactions, fromDate, toDate);

  return {
    nextCursor: null,
    rawCount: filteredTransactions.length,
    transactions: filteredTransactions
  };
}

// Shared date range filter for the demo transaction endpoint.
function filterTransactionsByDateRange(transactions: Transaction[], fromDate: string | undefined, toDate: string | undefined) {
  if (!fromDate && !toDate) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    return isTransactionInDateRange(transaction, fromDate, toDate);
  });
}
