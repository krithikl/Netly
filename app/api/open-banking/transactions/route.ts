import { NextRequest, NextResponse } from "next/server";
import { transactions as mockTransactions } from "@/lib/mock-data";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { normalizePnzTransactions, type PnzTransaction, type PnzTransactionsResponse } from "@/lib/open-banking/normalize";
import { getValidAccessToken, applyTokenCookies } from "@/lib/open-banking/token";

const SANDBOX_TRANSACTION_FROM = "2018-01-01T00:00:00.000Z";

type PnzAccountsResponse = {
  Data?: {
    Account?: Array<{
      AccountId?: string;
    }>;
  };
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedSource = url.searchParams.get("source");
  const { accessToken, newCookies } = await getValidAccessToken(request);

  if (requestedSource === "demo") {
    return NextResponse.json({
      source: "mock",
      connected: false,
      notice: "Showing PNZ-format demo transactions.",
      transactions: mockTransactions
    });
  }

  if (!accessToken) {
    const responseObj = NextResponse.json({
      source: "pnz-sandbox",
      connected: false,
      notice: "No PNZ sandbox user is connected. Connect a bank or switch to demo data.",
      transactions: []
    });
    return applyTokenCookies(responseObj, newCookies);
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const now = new Date();
    const response = (await client.getAllTransactions({ accessToken })) as PnzTransactionsResponse;
    const accountsResponse = (await client.getAccounts({ accessToken })) as PnzAccountsResponse;
    const accountIds = (accountsResponse.Data?.Account || [])
      .map((account) => account.AccountId)
      .filter((accountId): accountId is string => Boolean(accountId));
    const accountTransactionResults = await Promise.allSettled(
      accountIds.map((accountId) =>
        client.getAllAccountTransactions({ accessToken }, accountId) as Promise<PnzTransactionsResponse>
      )
    );
    const accountTransactions = accountTransactionResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value.Data?.Transaction || [] : []
    );
    const rawTransactions = response?.Data?.Transaction || [];
    const mergedTransactions = dedupePnzTransactions([...rawTransactions, ...accountTransactions]);
    const moneyFitRawTransactions = mergedTransactions.filter((transaction) =>
      JSON.stringify(transaction).toLowerCase().includes("moneyfit")
    );
    const transactions = normalizePnzTransactions({
      ...response,
      Data: {
        ...response.Data,
        Transaction: mergedTransactions
      }
    }).sort((a, b) => b.date.localeCompare(a.date));

    const responseObj = NextResponse.json({
      source: "pnz-sandbox",
      connected: true,
      rawCount: rawTransactions.length,
      accountScopedRawCount: accountTransactions.length,
      mergedRawCount: mergedTransactions.length,
      normalizedCount: transactions.length,
      debug: {
        pnzHost: client.getConfig().baseUrl,
        accountIds,
        firstRawBookingDates: mergedTransactions.slice(0, 8).map((transaction) => ({
          accountId: transaction.AccountId,
          bookingDateTime: transaction.BookingDateTime,
          transactionId: transaction.TransactionId,
          creditorName: transaction.TransactionReference?.CreditorName,
          amount: transaction.Amount?.Amount
        })),
        moneyFitRawCount: moneyFitRawTransactions.length,
        moneyFitRaw: moneyFitRawTransactions.slice(0, 5).map((transaction) => ({
          accountId: transaction.AccountId,
          bookingDateTime: transaction.BookingDateTime,
          transactionId: transaction.TransactionId,
          creditorName: transaction.TransactionReference?.CreditorName,
          amount: transaction.Amount?.Amount,
          status: transaction.Status
        }))
      },
      requestedFrom: null,
      requestedTo: null,
      previousDateWindow: {
        from: SANDBOX_TRANSACTION_FROM,
        to: now.toISOString()
      },
      bulkPages: "pages" in response && Array.isArray(response.pages) ? response.pages.length : 1,
      notice:
        transactions.length === 0
          ? "PNZ connected, but the sandbox returned no transactions for the current consent/date range."
          : undefined,
      transactions
    });
    return applyTokenCookies(responseObj, newCookies);
  } catch (error) {
    return NextResponse.json(
      {
        source: "mock",
        connected: false,
        error: error instanceof Error ? error.message : "Unknown PNZ transaction fetch error",
        transactions: mockTransactions
      },
      { status: 200 }
    );
  }
}

function dedupePnzTransactions(transactions: PnzTransaction[]) {
  const seen = new Set<string>();

  return transactions.filter((transaction) => {
    const key = [
      transaction.TransactionId,
      transaction.AccountId,
      transaction.BookingDateTime,
      transaction.Amount?.Amount,
      transaction.Amount?.Currency,
      transaction.CreditDebitIndicator,
      transaction.TransactionReference?.CreditorName,
      transaction.TransactionReference?.CreditorReference?.Reference
    ]
      .filter(Boolean)
      .join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
