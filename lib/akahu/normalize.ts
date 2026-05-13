import type { AkahuAccount } from "@/lib/akahu/accounts";
import type { AkahuTransaction, Transaction } from "@/lib/types";

type AkahuTransactionPayload = AkahuTransaction & {
  pending?: boolean;
};

export type AkahuTransactionsResponse = {
  success?: boolean;
  items?: AkahuTransactionPayload[];
  item?: AkahuTransactionPayload;
  cursor?: {
    next?: string;
  };
};

// Reads Akahu transactions and adds account names for display
// Converts Akahu transaction responses into transactions enriched with account display info.
export function getAkahuTransactions(response: AkahuTransactionsResponse, accounts: AkahuAccount[] = []) {
  const accountNames = new Map(accounts.map((account) => [account._id, account.name || account.formatted_account || account._id]));
  const accountCurrencies = new Map(accounts.map((account) => [account._id, account.balance?.currency || "NZD"]));
  const transactions = response.items || (response.item ? [response.item] : []);

  return transactions.map((transaction) => attachNetlyFields(
    normalizeAkahuTransaction(transaction),
    {
      accountName: transaction._account ? accountNames.get(transaction._account) : undefined,
      accountCurrency: transaction._account ? accountCurrencies.get(transaction._account) : undefined
    }
  ));
}

// Keeps Akahu-owned values at the top level and leaves app-owned data under transaction.netly.
export function normalizeAkahuTransaction(transaction: AkahuTransactionPayload): Transaction {
  return {
    _account: transaction._account,
    _connection: transaction._connection,
    _id: transaction._id,
    amount: transaction.amount,
    balance: transaction.balance,
    category: transaction.category,
    created_at: transaction.created_at,
    date: transaction.date,
    description: transaction.description,
    merchant: transaction.merchant,
    meta: transaction.meta,
    pending: transaction.pending,
    type: transaction.type,
    updated_at: transaction.updated_at
  };
}

export function attachNetlyFields(transaction: Transaction, fields: NonNullable<Transaction["netly"]>): Transaction {
  const nextFields = removeEmptyNetlyFields(fields);

  if (Object.keys(nextFields).length === 0) {
    return transaction;
  }

  return {
    ...transaction,
    netly: {
      ...transaction.netly,
      ...nextFields
    }
  };
}

// Removes duplicate transactions from booked and pending feeds
export function dedupeAkahuTransactions(transactions: Transaction[]) {
  const seen = new Set<string>();

  return transactions.filter((transaction) => {
    const id = getAkahuTransactionStableKey(transaction);

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

// Builds a fallback duplicate-check key when Akahu does not send an ID
function getAkahuTransactionStableKey(transaction: Transaction) {
  return transaction._id || [
    transaction._account || "account",
    transaction.date,
    transaction.description,
    transaction.amount.toFixed(2),
    transaction.pending ? "pending" : "booked"
  ].join(":");
}

function removeEmptyNetlyFields(fields: NonNullable<Transaction["netly"]>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== "")
  ) as NonNullable<Transaction["netly"]>;
}
