import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { InfoRow } from "@/components/ui/InfoRow";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { CustomSelectOption } from "@/components/ui/CustomSelect";
import {
  getTransactionAmountLabel,
  getTransactionCategory,
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

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (selectedTransaction) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedTransaction]);

  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  const detailOverlay = selectedTransaction
    ? createPortal(
        <div className="transaction-details-overlay" onClick={closeDetails}>
          <aside
            className="transaction-details-panel"
            role="complementary"
            aria-labelledby="transaction-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="transaction-details-card">
              <div className="transaction-details-header">
                <div className="transaction-details-avatar" style={{ background: getTransactionColor(getTransactionCategory(selectedTransaction), categoryColors) }}>
                  {getTransactionMerchant(selectedTransaction).slice(0, 1)}
                </div>
                <div className="transaction-details-header-copy">
                  <span className="eyebrow">Transaction details</span>
                  <h2 id="transaction-details-title">{getTransactionMerchant(selectedTransaction)}</h2>
                  <p>{getTransactionSummaryMeta(selectedTransaction)}</p>
                </div>
                <button
                  className="transaction-details-close"
                  onClick={closeDetails}
                  type="button"
                  aria-label="Close transaction details"
                >
                  ×
                </button>
              </div>

              <div className="transaction-details-meta">
                <div className="transaction-details-summary-card">
                  <span>Amount</span>
                  <strong className={selectedTransaction.amount < 0 ? "negative" : "positive"}>
                    {getTransactionAmountLabel(selectedTransaction)}
                  </strong>
                </div>
                <div className="transaction-details-summary-card">
                  <span>Status</span>
                  <strong>{getTransactionStatus(selectedTransaction)}</strong>
                </div>
                <div className="transaction-details-summary-card">
                  <span>Category</span>
                  <strong>{getTransactionCategory(selectedTransaction)}</strong>
                </div>
              </div>

              <div className="transaction-detail-list">
                {getTransactionDetailRows(selectedTransaction).map((row) => (
                  <div className="transaction-detail-item" key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>

              {getTransactionRawText(selectedTransaction) && (
                <div className="transaction-raw-box">
                  <span>Raw bank text</span>
                  <p>{getTransactionRawText(selectedTransaction)}</p>
                </div>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="transaction-list-layout">
      <div className="transaction-list-panel">
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
      </div>
      {detailOverlay}
    </div>
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

