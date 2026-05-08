import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { getAkahuAccounts } from "@/lib/open-banking/accounts";
import { dedupeAkahuTransactions, getAkahuTransactions } from "@/lib/open-banking/normalize";
import { getValidAccessToken } from "@/lib/open-banking/token";
import { transactions as demoTransactions } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");

  if (source === "demo") {
    return NextResponse.json({
      source: "demo",
      connected: true,
      rawCount: demoTransactions.length,
      transactions: demoTransactions,
      notice: "Showing Akahu-shaped demo transactions."
    });
  }

  const { accessToken } = getValidAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      rawCount: 0,
      transactions: [],
      notice: "No Akahu user token is connected. Connect Akahu or switch to demo data."
    });
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const accountsResponse = await client.getAccounts({ userToken: accessToken });
    const accounts = getAkahuAccounts(accountsResponse);
    const transactionsResponse = await client.getTransactionsForAccounts({ userToken: accessToken }, accounts);
    const transactions = dedupeAkahuTransactions(getAkahuTransactions(transactionsResponse, accounts));
    const notice = transactions.length === 0 ? getEmptyTransactionsNotice(accounts) : "";

    return NextResponse.json({
      source: "akahu",
      connected: true,
      rawCount: transactionsResponse.items?.length || 0,
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
      transactions: [],
      error: error instanceof Error ? error.message : "Unknown Akahu transaction fetch error"
    }, { status: 502 });
  }
}

function getEmptyTransactionsNotice(accounts: Array<{ attributes?: string[]; connection?: { name?: string }; name?: string }>) {
  const hasDemoBankAccount = accounts.some((account) => /demo bank/i.test(account.connection?.name || account.name || ""));
  const hasTransactionCapableAccount = accounts.some((account) => account.attributes?.includes("TRANSACTIONS"));

  if (hasDemoBankAccount && !hasTransactionCapableAccount) {
    return "Akahu Demo Bank connected successfully, but Demo Bank enduring connections do not return transaction data. Use MoneyFit demo mode or connect a real transaction-capable account for transaction testing.";
  }

  if (!hasTransactionCapableAccount) {
    return "Akahu connected successfully, but none of the shared accounts expose transaction data. In Akahu, share an account with the TRANSACTIONS attribute or connect a transaction-capable account.";
  }

  return "Akahu connected successfully, but no transactions were returned for the shared accounts yet.";
}
