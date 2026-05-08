import type { AkahuAccount } from "@/lib/open-banking/accounts";
import type { Transaction } from "@/lib/types";

export type AkahuTransactionsResponse = {
  success?: boolean;
  items?: Transaction[];
  item?: Transaction;
  cursor?: {
    next?: string;
  };
};

export function getAkahuTransactions(response: AkahuTransactionsResponse, accounts: AkahuAccount[] = []) {
  const accountNames = new Map(accounts.map((account) => [account._id, account.name || account.formatted_account || account._id]));
  const accountCurrencies = new Map(accounts.map((account) => [account._id, account.balance?.currency || "NZD"]));
  const transactions = response.items || (response.item ? [response.item] : []);

  return transactions.map((transaction) => attachMoneyFitAccountInfo(transaction, accountNames, accountCurrencies));
}

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

function attachMoneyFitAccountInfo(
  transaction: Transaction,
  accountNames: Map<string, string>,
  accountCurrencies: Map<string, string>
): Transaction {
  const accountName = transaction._account ? accountNames.get(transaction._account) : undefined;
  const accountCurrency = transaction._account ? accountCurrencies.get(transaction._account) : undefined;

  if (!accountName && !accountCurrency) {
    return transaction;
  }

  return {
    ...transaction,
    moneyfit: {
      ...transaction.moneyfit,
      accountName,
      accountCurrency
    }
  };
}

function getAkahuTransactionStableKey(transaction: Transaction) {
  return transaction._id || [
    transaction._account || "account",
    transaction.date,
    transaction.description,
    transaction.amount.toFixed(2),
    transaction.pending ? "pending" : "booked"
  ].join(":");
}
