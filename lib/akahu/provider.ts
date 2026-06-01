import { getAkahuAccounts, type AkahuAccount } from "@/lib/akahu/accounts";
import { createAkahuClientFromEnv, type AkahuTransactionQuery as AkahuClientTransactionQuery } from "@/lib/akahu/client";
import { dedupeAkahuTransactions, getAkahuTransactions, type AkahuTransactionsResponse } from "@/lib/akahu/normalize";
import { isTransactionInDateRange } from "@/lib/periods";
import type { Transaction } from "@/lib/types";

export type AkahuProviderId = "akahu";

export type AkahuAccessToken = {
  accessToken: string;
  appToken?: string;
};

export type AkahuAccountResult = {
  accounts: AkahuAccount[];
  notice: string;
  primaryAccount: AkahuAccount | null;
};

export type AkahuTransactionRequest = {
  cursor?: string;
  fromDate?: string;
  toDate?: string;
};

export type AkahuTransactionsForAccountsRequest = AkahuTransactionRequest & {
  accounts: AkahuAccount[];
};

export type AkahuTransactionResult = {
  accountCount: number;
  nextCursor: string | null;
  notice: string;
  rawCount: number;
  transactions: Transaction[];
};

export type AkahuRefreshResult = {
  notice: string;
};

// Contract used by API routes so Akahu calls stay behind one provider layer.
export interface AkahuProvider {
  id: AkahuProviderId;
  displayName: string;
  getAuthorizationUrl(state: string, email?: string): string;
  exchangeAuthorizationCode(code: string): Promise<string>;
  getAccounts(token: AkahuAccessToken): Promise<AkahuAccountResult>;
  getTransactions(token: AkahuAccessToken, query?: AkahuTransactionRequest): Promise<AkahuTransactionResult>;
  getTransactionsForAccounts(token: AkahuAccessToken, query: AkahuTransactionsForAccountsRequest): Promise<AkahuTransactionResult>;
  requestRefresh(token: AkahuAccessToken): Promise<AkahuRefreshResult>;
}

// Default provider implementation that talks to the real Akahu API.
class DefaultAkahuProvider implements AkahuProvider {
  readonly id = "akahu";
  readonly displayName = "Akahu";

  private readonly client = createAkahuClientFromEnv();

  getAuthorizationUrl(state: string, email?: string) {
    return this.client.getAuthorizationUrl(state, email);
  }

  async exchangeAuthorizationCode(code: string) {
    const token = await this.client.exchangeAuthorizationCode(code);

    if (!token.access_token) {
      throw new Error(token.error_description || token.error || "missing_access_token");
    }

    return token.access_token;
  }

  async getAccounts(token: AkahuAccessToken): Promise<AkahuAccountResult> {
    const accounts = await this.getRawAccounts(token);

    return {
      accounts,
      primaryAccount: accounts[0] || null,
      notice: accounts.length === 0 ? "Akahu connected, but no accounts were returned." : ""
    };
  }

  async getTransactions(token: AkahuAccessToken, query: AkahuTransactionRequest = {}): Promise<AkahuTransactionResult> {
    const [rawAccounts, transactionsResponse] = await Promise.all([
      this.getRawAccounts(token),
      this.client.getTransactionsPage(
        { appToken: token.appToken, userToken: token.accessToken },
        toAkahuTransactionQuery(query)
      )
    ]);

    return this.toTransactionResult(transactionsResponse, rawAccounts, query);
  }

  async getTransactionsForAccounts(token: AkahuAccessToken, query: AkahuTransactionsForAccountsRequest): Promise<AkahuTransactionResult> {
    const transactionsResponse = await this.client.getTransactionsPageForAccounts(
      { appToken: token.appToken, userToken: token.accessToken },
      query.accounts,
      toAkahuTransactionQuery(query)
    );
    return this.toTransactionResult(transactionsResponse, query.accounts, query);
  }

  async requestRefresh(token: AkahuAccessToken): Promise<AkahuRefreshResult> {
    await this.client.requestRefresh({ appToken: token.appToken, userToken: token.accessToken });

    return {
      notice: "Akahu refresh requested. Updated balances and transactions may take a moment to appear."
    };
  }

  private async getRawAccounts(token: AkahuAccessToken) {
    const response = await this.client.getAccounts({ appToken: token.appToken, userToken: token.accessToken });
    return getAkahuAccounts(response);
  }

  // Builds transaction payloads after Akahu account metadata and transactions finish loading.
  private toTransactionResult(transactionsResponse: AkahuTransactionsResponse, accounts: AkahuAccount[], query: AkahuTransactionRequest): AkahuTransactionResult {
    const transactions = filterTransactionsByDateRange(
      dedupeAkahuTransactions(getAkahuTransactions(transactionsResponse, accounts)),
      query.fromDate,
      query.toDate
    );

    return {
      accountCount: accounts.length,
      rawCount: transactionsResponse.items?.length || 0,
      nextCursor: transactionsResponse.cursor?.next || null,
      transactions,
      notice: transactions.length === 0 ? getEmptyAkahuTransactionsNotice(accounts) : ""
    };
  }
}

// Builds the Akahu provider from environment variables used by API routes.
export function createAkahuProviderFromEnv(): AkahuProvider {
  return new DefaultAkahuProvider();
}

function toAkahuTransactionQuery(query: AkahuTransactionRequest): AkahuClientTransactionQuery {
  return {
    cursor: query.cursor,
    end: toAkahuEndDate(query.toDate),
    start: toAkahuStartDate(query.fromDate)
  };
}

function filterTransactionsByDateRange(transactions: Transaction[], fromDate: string | undefined, toDate: string | undefined) {
  return transactions.filter((transaction) => isTransactionInDateRange(transaction, fromDate, toDate));
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

function getEmptyAkahuTransactionsNotice(accounts: AkahuAccount[]) {
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
