import { InfoRow } from "@/components/ui/InfoRow";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { CustomSelectOption } from "@/components/ui/CustomSelect";
import { formatMoney } from "@/lib/insights";
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
  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="stack-list">
      {transactions.map((transaction) => {
        const row = getTransactionRow(transaction, categoryColors);

        return (
          <InfoRow
            action={getCategoryAction(transaction, editable, categorySelectOptions, onCategoryChange)}
            color={row.color}
            key={transaction.id}
            meta={row.meta}
            title={row.title}
            value={row.value}
            valueTone={row.valueTone}
            warning={row.warning}
          />
        );
      })}
    </div>
  );
}

function getTransactionRow(transaction: Transaction, categoryColors: Record<string, string>) {
  return {
    color: getTransactionColor(transaction, categoryColors),
    meta: getTransactionMeta(transaction),
    title: transaction.merchant,
    value: formatMoney(transaction.amount, true),
    valueTone: transaction.amount < 0 ? "negative" : "positive",
    warning: transaction.needsReview ? transaction.rawDescription : undefined
  };
}

function getTransactionColor(transaction: Transaction, categoryColors: Record<string, string>) {
  return categoryColors[transaction.category] || "#607d8b";
}

function getTransactionMeta(transaction: Transaction) {
  const confidence = Math.round(transaction.confidence * 100);
  return `${transaction.date} · ${transaction.category} · ${transaction.account} · ${transaction.status} · ${confidence}% confidence`;
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

  const categoryLabel = `Set category for ${transaction.merchant}`;

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
  const handleCategoryChange = (category: string) => onCategoryChange?.(transaction.id, category);

  return (
    <CustomSelect
      ariaLabel={categoryLabel}
      className="row-category-select"
      onChange={handleCategoryChange}
      options={categoryOptions}
      value={transaction.category}
    />
  );
}
