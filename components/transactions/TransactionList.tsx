import { type MouseEvent, useState } from "react";
import { InfoRow } from "@/components/ui/InfoRow";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { CustomSelectOption } from "@/components/ui/CustomSelect";
import {
  getTransactionAccountLabel,
  getTransactionAmountLabel,
  getTransactionCategory,
  getTransactionDate,
  getTransactionDetailRows,
  getTransactionId,
  getTransactionMerchant,
  getTransactionRawText,
  getTransactionStatus,
  getTransactionSummaryMeta
} from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

type TransactionListProps = {
  categoryColors: Record<string, string>;
  categorySelectOptions?: CustomSelectOption[];
  editable?: boolean;
  emptyMessage?: string;
  onCategoryChange?: (transactionId: string, category: string) => void;
  transactions: Transaction[];
};

export function TransactionList({
  categoryColors,
  categorySelectOptions = [],
  editable = false,
  emptyMessage = "No transactions to show.",
  onCategoryChange,
  transactions
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const closeDetails = () => setSelectedTransaction(null);

  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <>
      <div className="stack-list">
        {transactions.map((transaction) => {
          const row = getTransactionRow(transaction, categoryColors);
          const openDetails = () => setSelectedTransaction(transaction);

          return (
            <InfoRow
              action={getCategoryAction(transaction, editable, categorySelectOptions, onCategoryChange)}
              color={row.color}
              key={getTransactionId(transaction)}
              meta={row.meta}
              onClick={openDetails}
              title={row.title}
              value={row.value}
              valueTone={row.valueTone}
              warning={row.warning}
            />
          );
        })}
      </div>
      {selectedTransaction && (
        <TransactionDetailsDialog
          categoryColors={categoryColors}
          onClose={closeDetails}
          transaction={selectedTransaction}
        />
      )}
    </>
  );
}

function getTransactionRow(transaction: Transaction, categoryColors: Record<string, string>) {
  const category = getTransactionCategory(transaction);

  return {
    color: getTransactionColor(category, categoryColors),
    meta: getTransactionMeta(transaction),
    title: getTransactionMerchant(transaction),
    value: getTransactionAmountLabel(transaction),
    valueTone: transaction.amount < 0 ? "negative" : "positive",
    warning: undefined
  };
}

function getTransactionColor(category: string, categoryColors: Record<string, string>) {
  return categoryColors[category] || "#607d8b";
}

function getTransactionMeta(transaction: Transaction) {
  return getTransactionSummaryMeta(transaction);
}

function getCategoryAction(
  transaction: Transaction,
  editable: boolean,
  categoryOptions: CustomSelectOption[],
  onCategoryChange?: (transactionId: string, category: string) => void
) {
  if (!editable) {
    return undefined;
  }

  const categoryLabel = `Set category for ${getTransactionMerchant(transaction)}`;

  return (
    <CategorySelect
      categoryLabel={categoryLabel}
      categoryOptions={categoryOptions}
      onCategoryChange={onCategoryChange}
      transaction={transaction}
    />
  );
}

function CategorySelect({
  categoryLabel,
  categoryOptions,
  onCategoryChange,
  transaction
}: {
  categoryLabel: string;
  categoryOptions: CustomSelectOption[];
  onCategoryChange?: (transactionId: string, category: string) => void;
  transaction: Transaction;
}) {
  const handleCategoryChange = (category: string) => onCategoryChange?.(getTransactionId(transaction), category);

  return (
    <CustomSelect
      ariaLabel={categoryLabel}
      className="row-category-select"
      onChange={handleCategoryChange}
      options={categoryOptions}
      value={getTransactionCategory(transaction)}
    />
  );
}

function TransactionDetailsDialog({
  categoryColors,
  onClose,
  transaction
}: {
  categoryColors: Record<string, string>;
  onClose: () => void;
  transaction: Transaction;
}) {
  const category = getTransactionCategory(transaction);
  const rows = getTransactionDetailRows(transaction);
  const rawText = getTransactionRawText(transaction);
  const categoryColor = getTransactionColor(category, categoryColors);
  const closeOnBackdrop = () => onClose();
  const stopDialogClick = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <div className="transaction-dialog-backdrop" onClick={closeOnBackdrop}>
      <div className="transaction-dialog" onClick={stopDialogClick} role="dialog" aria-modal="true" aria-label="Transaction details">
        <div className="transaction-dialog-header">
          <span className="category-avatar" style={{ background: categoryColor }}>
            {getTransactionMerchant(transaction).slice(0, 1)}
          </span>
          <div>
            <span className="eyebrow">Transaction details</span>
            <h2>{getTransactionMerchant(transaction)}</h2>
            <p>{getTransactionSummaryMeta(transaction)}</p>
          </div>
          <button className="dialog-close-button" onClick={onClose} type="button" aria-label="Close transaction details">
            x
          </button>
        </div>

        <div className="transaction-dialog-body">
        <div className="transaction-dialog-value">
          <div>
            <span>Amount</span>
            <strong className={transaction.amount < 0 ? "negative" : "positive"}>{getTransactionAmountLabel(transaction)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{getTransactionStatus(transaction)}</strong>
          </div>
        </div>

          <div className="transaction-detail-grid">
            {rows.map((row) => (
              <div className="transaction-detail-item" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          {rawText && (
            <div className="transaction-raw-box">
              <span>Raw bank text</span>
              <p>{rawText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
