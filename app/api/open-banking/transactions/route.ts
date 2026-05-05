import { NextRequest, NextResponse } from "next/server";
import { transactions as mockTransactions } from "@/lib/mock-data";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { normalizePnzTransactions, type PnzTransaction, type PnzTransactionsResponse } from "@/lib/open-banking/normalize";

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
  const accessToken = request.cookies.get("moneyfit_ob_access_token")?.value;

  if (requestedSource === "demo") {
    return NextResponse.json({
      source: "mock",
      connected: false,
      notice: "Showing PNZ-format demo transactions.",
      transactions: mockTransactions
    });
  }

  if (!accessToken) {
    return NextResponse.json({
      source: "pnz-sandbox",
      connected: false,
      notice: "No PNZ sandbox user is connected. Connect a bank or switch to demo data.",
      transactions: []
    });
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const now = new Date();
    const response = (await client.getTransactions(
      { accessToken },
      SANDBOX_TRANSACTION_FROM,
      now.toISOString()
    )) as PnzTransactionsResponse;
    const accountsResponse = (await client.getAccounts({ accessToken })) as PnzAccountsResponse;
    const accountIds = (accountsResponse.Data?.Account || [])
      .map((account) => account.AccountId)
      .filter((accountId): accountId is string => Boolean(accountId));
    const accountTransactionResults = await Promise.allSettled(
      accountIds.map((accountId) =>
        client.getAccountTransactions(
          { accessToken },
          accountId,
          SANDBOX_TRANSACTION_FROM,
          now.toISOString()
        ) as Promise<PnzTransactionsResponse>
      )
    );
    const accountTransactions = accountTransactionResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value.Data?.Transaction || [] : []
    );
    const rawTransactions = response?.Data?.Transaction || [];
    const mergedTransactions = dedupePnzTransactions([...rawTransactions, ...accountTransactions]);
    const transactions = normalizePnzTransactions({
      ...response,
      Data: {
        ...response.Data,
        Transaction: mergedTransactions
      }
    });

    return NextResponse.json({
      source: "pnz-sandbox",
      connected: true,
      rawCount: rawTransactions.length,
      accountScopedRawCount: accountTransactions.length,
      mergedRawCount: mergedTransactions.length,
      normalizedCount: transactions.length,
      requestedFrom: SANDBOX_TRANSACTION_FROM,
      requestedTo: now.toISOString(),
      notice:
        transactions.length === 0
          ? "PNZ connected, but the sandbox returned no transactions for the current consent/date range."
          : undefined,
      transactions
    });
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
