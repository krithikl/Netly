import { categorizeTransactions } from "@/lib/categorization";
import type { RawBankTransaction, Transaction } from "@/lib/types";

export type PnzTransaction = {
  AccountId?: string;
  Amount?: {
    Amount?: string;
    Currency?: string;
  };
  CreditDebitIndicator?: "Credit" | "Debit";
  BookingDateTime?: string;
  ValueDateTime?: string;
  Status?: string;
  TransactionId?: string;
  TransactionInformation?: string;
  StatementReference?: string[];
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
  MerchantDetails?: {
    MerchantName?: string;
    MerchantCategoryCode?: string;
  };
  CreditorAccount?: {
    Name?: string;
    Identification?: string;
  };
  DebtorAccount?: {
    Name?: string;
    Identification?: string;
  };
};

export type PnzTransactionsResponse = {
  Data?: {
    Transaction?: PnzTransaction[];
  };
  Links?: {
    Self?: string;
    First?: string;
    Prev?: string;
    Next?: string;
    Last?: string;
  };
  Meta?: {
    TotalPages?: number;
    FirstAvailableDateTime?: string;
    LastAvailableDateTime?: string;
  };
};

export function normalizePnzTransactions(response: PnzTransactionsResponse): Transaction[] {
  const raw = (response.Data?.Transaction || []).map(toRawBankTransaction);
  return categorizeTransactions(raw);
}

function toRawBankTransaction(txn: PnzTransaction): RawBankTransaction {
  const amount = Number(txn.Amount?.Amount || 0);
  const sign = txn.CreditDebitIndicator === "Credit" ? 1 : -1;
  const counterparty = getCounterpartyName(txn);
  const description = [
    counterparty,
    getReferenceDescription(txn),
    txn.TransactionInformation,
    counterparty !== txn.MerchantDetails?.MerchantName ? txn.MerchantDetails?.MerchantName : undefined,
    txn.BankTransactionCode?.Code,
    txn.BankTransactionCode?.SubCode,
    txn.ProprietaryBankTransactionCode?.Code
  ]
    .filter(isUsefulText)
    .join(" | ");

  return {
    id: txn.TransactionId || `${txn.AccountId || "account"}-${txn.BookingDateTime || txn.ValueDateTime || crypto.randomUUID()}`,
    date: (txn.BookingDateTime || txn.ValueDateTime || new Date().toISOString()).slice(0, 10),
    description: description || "Unknown bank transaction",
    account: txn.AccountId || "PNZ account",
    amount: sign * Math.abs(amount),
    status: txn.Status === "Pending" ? "Pending" : "Booked"
  };
}

function getCounterpartyName(txn: PnzTransaction) {
  const isTransfer = isTransferTransaction(txn);
  const debitCounterparty = firstUsefulText([
    ...(isTransfer
      ? [
          txn.TransactionReference?.CreditorName,
          txn.CreditorAccount?.Name,
          txn.MerchantDetails?.MerchantName,
          txn.TransactionReference?.CreditorReference?.Particulars,
          txn.TransactionReference?.CreditorReference?.Reference
        ]
      : [
          txn.MerchantDetails?.MerchantName,
          txn.TransactionReference?.CreditorName,
          txn.CreditorAccount?.Name,
          txn.TransactionReference?.CreditorReference?.Particulars,
          txn.TransactionReference?.CreditorReference?.Reference
        ])
  ]);
  const creditCounterparty = firstUsefulText([
    txn.TransactionReference?.DebtorName,
    txn.DebtorAccount?.Name,
    txn.TransactionReference?.DebtorReference?.Particulars,
    txn.TransactionReference?.DebtorReference?.Reference,
    txn.MerchantDetails?.MerchantName
  ]);

  return txn.CreditDebitIndicator === "Credit" ? creditCounterparty : debitCounterparty;
}

function getReferenceDescription(txn: PnzTransaction) {
  const reference =
    txn.CreditDebitIndicator === "Credit"
      ? txn.TransactionReference?.DebtorReference
      : txn.TransactionReference?.CreditorReference;

  return [
    reference?.Particulars,
    reference?.Code,
    reference?.Reference
  ]
    .filter(isUsefulText)
    .join(" ");
}

function isTransferTransaction(txn: PnzTransaction) {
  return [
    txn.BankTransactionCode?.Code,
    txn.BankTransactionCode?.SubCode,
    txn.ProprietaryBankTransactionCode?.Code
  ].some((value) => /transfer/i.test(value || ""));
}

function firstUsefulText(values: Array<string | undefined>) {
  return values.find(isUsefulText);
}

function isUsefulText(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  return ![
    "string",
    "undefined",
    "null",
    "party being paid",
    "party paying",
    "a. creditor",
    "a. debtor"
  ].includes(value.trim().toLowerCase());
}
