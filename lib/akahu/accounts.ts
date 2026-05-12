import type { LinkedAccount } from "@/lib/app/types";

export type AkahuAccount = {
  _id: string;
  connection?: {
    _id?: string;
    name?: string;
    logo?: string;
  };
  name?: string;
  status?: string;
  balance?: {
    available?: number;
    currency?: string;
    current?: number;
    overdrawn?: boolean;
  };
  attributes?: string[];
  type?: string;
  formatted_account?: string;
  meta?: {
    holder?: string;
    address?: string;
    [key: string]: unknown;
  };
  refreshed?: {
    balance?: string;
    meta?: string;
    transactions?: string;
    party?: string;
  };
};

export type AkahuAccountsResponse = {
  success?: boolean;
  items?: AkahuAccount[];
  item?: AkahuAccount;
  cursor?: {
    next?: string;
  };
};

export function getAkahuAccounts(response: AkahuAccountsResponse) {
  return response.items || (response.item ? [response.item] : []);
}

// Converts an Akahu account object into the smaller account shape used by the UI.
export function toLinkedAccount(account: AkahuAccount): LinkedAccount {
  return {
    accountId: account._id,
    displayName: account.name || account.connection?.name || "Akahu account",
    identification: account.formatted_account || account._id,
    currency: account.balance?.currency || "NZD",
    accountType: account.type || "Account",
    accountSubType: account.status || "Connected",
    ownerName: account.meta?.holder
  };
}

export function getAvailableBalance(accounts: AkahuAccount[]) {
  if (accounts.length === 0) {
    return null;
  }

  return accounts.reduce((total, account) => total + getAccountAvailableBalance(account), 0);
}

function getAccountAvailableBalance(account: AkahuAccount) {
  return account.balance?.available ?? account.balance?.current ?? 0;
}
