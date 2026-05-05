import { categorizeTransactions } from "@/lib/categorization";
import type { RawBankTransaction, Transaction } from "@/lib/types";

type PnzTransaction = {
  AccountId?: string;
  Amount?: {
    Amount?: string;
    Currency?: string;
  };
  CreditDebitIndicator?: "Credit" | "Debit";
  BookingDateTime?: string;
  Status?: string;
  TransactionId?: string;
  TransactionInformation?: string;
  TransactionReference?: {
    CreditorName?: string;
    DebtorName?: string;
    CreditorReference?: {
      Particulars?: string;
      Code?: string;
      Reference?: string;
    };
    DebtorReference?: {
      Particulars?: string;
      Code?: string;
      Reference?: string;
    };
  };
  BankTransactionCode?: {
    Code?: string;
    SubCode?: string;
  };
  ProprietaryBankTransactionCode?: {
    Code?: string;
    Issuer?: string;
  };
};

type PnzTransactionsResponse = {
  Data?: {
    Transaction?: PnzTransaction[];
  };
};

export function normalizePnzTransactions(response: PnzTransactionsResponse): Transaction[] {
  const raw = (response.Data?.Transaction || []).map(toRawBankTransaction);
  return categorizeTransactions(raw);
}

function toRawBankTransaction(txn: PnzTransaction): RawBankTransaction {
  const amount = Number(txn.Amount?.Amount || 0);
  const sign = txn.CreditDebitIndicator === "Credit" ? 1 : -1;
  const description = [
    txn.TransactionInformation,
    txn.TransactionReference?.CreditorName,
    txn.TransactionReference?.DebtorName,
    txn.TransactionReference?.CreditorReference?.Particulars,
    txn.TransactionReference?.CreditorReference?.Code,
    txn.TransactionReference?.CreditorReference?.Reference,
    txn.TransactionReference?.DebtorReference?.Particulars,
    txn.TransactionReference?.DebtorReference?.Code,
    txn.TransactionReference?.DebtorReference?.Reference,
    txn.BankTransactionCode?.Code,
    txn.BankTransactionCode?.SubCode,
    txn.ProprietaryBankTransactionCode?.Code
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: txn.TransactionId || `${txn.AccountId || "account"}-${txn.BookingDateTime || crypto.randomUUID()}`,
    date: (txn.BookingDateTime || new Date().toISOString()).slice(0, 10),
    description: description || "Unknown bank transaction",
    account: txn.AccountId || "PNZ account",
    amount: sign * Math.abs(amount),
    status: txn.Status === "Pending" ? "Pending" : "Booked"
  };
}
