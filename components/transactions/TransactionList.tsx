"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { InfoRow } from "@/components/ui/InfoRow";
import { Button } from "@/components/ui/button";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import {
  getTransactionAmountLabel,
  getTransactionCategory,
  getTransactionDetailRows,
  getTransactionId,
  getTransactionMerchant,
  getTransactionRawText,
  getTransactionSummaryMeta
} from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

type TransactionListProps = {
  categoryColors: Record<string, string>;
  categorySelectOptions?: SelectOption[];
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
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const isDesktop = useIsDesktopNavigation();
  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => getTransactionId(transaction) === selectedTransactionId) || null,
    [selectedTransactionId, transactions]
  );
  const closeDetails = useCallback(() => setSelectedTransactionId(null), []);
  const openDetails = useCallback((transactionId: string) => setSelectedTransactionId(transactionId), []);

  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="transaction-list-layout">
      {!isDesktop && selectedTransaction ? (
        <MobileTransactionDetails
          categoryColors={categoryColors}
          onBack={closeDetails}
          transaction={selectedTransaction}
        />
      ) : (
        <div className="transaction-list-panel">
          <div className="stack-list">
            {transactions.map((transaction) => {
              const transactionId = getTransactionId(transaction);

              return (
                <TransactionRow
                  categoryColors={categoryColors}
                  categorySelectOptions={categorySelectOptions}
                  editable={editable}
                  key={transactionId}
                  onCategoryChange={onCategoryChange}
                  onOpenDetails={openDetails}
                  transaction={transaction}
                />
              );
            })}
          </div>
        </div>
      )}
      {isDesktop && (
        <TransactionDetailsSheet
          categoryColors={categoryColors}
          onClose={closeDetails}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
}

type TransactionRowProps = {
  categoryColors: Record<string, string>;
  categorySelectOptions: SelectOption[];
  editable: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  onOpenDetails: (transactionId: string) => void;
  transaction: Transaction;
};

const TransactionRow = memo(function TransactionRow({
  categoryColors,
  categorySelectOptions,
  editable,
  onCategoryChange,
  onOpenDetails,
  transaction
}: TransactionRowProps) {
  const transactionId = getTransactionId(transaction);
  const row = getTransactionRow(transaction, categoryColors);
  const openDetails = useCallback(() => onOpenDetails(transactionId), [onOpenDetails, transactionId]);
  const categoryAction = getCategoryAction(transaction, editable, categorySelectOptions, onCategoryChange);

  return (
    <InfoRow
      action={categoryAction}
      color={row.color}
      meta={row.meta}
      onClick={openDetails}
      title={row.title}
      value={row.value}
      valueTone={row.valueTone}
      warning={row.warning}
    />
  );
});

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
  categoryOptions: SelectOption[],
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
  categoryOptions: SelectOption[];
  onCategoryChange?: (transactionId: string, category: string) => void;
  transaction: Transaction;
}) {
  const handleCategoryChange = (category: string) => onCategoryChange?.(getTransactionId(transaction), category);

  return (
    <SelectField
      ariaLabel={categoryLabel}
      className="min-h-9 w-[min(220px,100%)] px-3 py-2 text-[13px] font-bold"
      onChange={handleCategoryChange}
      options={categoryOptions}
      value={getTransactionCategory(transaction)}
    />
  );
}

function TransactionDetailsSheet({
  categoryColors,
  onClose,
  transaction
}: {
  categoryColors: Record<string, string>;
  onClose: () => void;
  transaction: Transaction | null;
}) {
  const isOpen = Boolean(transaction);

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent className="transaction-details-shell overflow-hidden p-0">
        <div className="transaction-details-sheet flex h-full flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Transaction Details</SheetTitle>
            <SheetDescription>Merchant, amount, category, account, and raw bank text for the selected transaction.</SheetDescription>
          </SheetHeader>
          {transaction && (
            <div>
              <TransactionDetailsContent categoryColors={categoryColors} transaction={transaction} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileTransactionDetails({
  categoryColors,
  onBack,
  transaction
}: {
  categoryColors: Record<string, string>;
  onBack: () => void;
  transaction: Transaction;
}) {
  return (
    <div className="transaction-mobile-detail">
      <Button className="transaction-back-button" onClick={onBack} type="button" variant="secondary">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back
      </Button>
      <div className="grid gap-1">
        <h2 className="text-xl font-bold">Transaction Details</h2>
        <p className="text-sm font-semibold text-[var(--muted)]">Merchant, amount, category, account, and raw bank text for the selected transaction.</p>
      </div>
      <TransactionDetailsContent categoryColors={categoryColors} transaction={transaction} />
    </div>
  );
}

function TransactionDetailsContent({
  categoryColors,
  transaction
}: {
  categoryColors: Record<string, string>;
  transaction: Transaction;
}) {
  const merchant = getTransactionMerchant(transaction);
  const category = getTransactionCategory(transaction);
  const avatarStyle = { background: getTransactionColor(category, categoryColors) };
  const amountClassName = transaction.amount < 0 ? "negative" : "positive";
  const rawText = getTransactionRawText(transaction);

  return (
    <div className="grid gap-5">
      <div className="transaction-detail-summary grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[rgba(119,106,116,0.14)] bg-white/90 p-3">
        <div className="grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white" style={avatarStyle}>
          {merchant.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <strong className="block truncate">{merchant}</strong>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{getTransactionSummaryMeta(transaction)}</p>
        </div>
        <strong className={amountClassName}>{getTransactionAmountLabel(transaction)}</strong>
      </div>

      <section className="grid gap-3">
        <h3 className="text-sm font-bold">Details</h3>
        <div className="grid gap-2">
          {getTransactionDetailRows(transaction).map((row) => (
            <div className="flex justify-between gap-5 text-sm" key={row.label}>
              <span className="text-[var(--muted)]">{row.label}</span>
              <strong className="max-w-[62%] text-right [overflow-wrap:anywhere]">{row.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {rawText && (
        <section className="grid gap-2">
          <h3 className="text-sm font-bold">Raw bank text</h3>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{rawText}</p>
        </section>
      )}
    </div>
  );
}

function useIsDesktopNavigation() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1025px)");
    const handleChange = () => setIsDesktop(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}
