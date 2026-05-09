"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { InfoRow } from "@/components/ui/info-row";
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

const initialVisibleTransactionCount = 40;
const visibleTransactionIncrement = 60;

export function TransactionList({
  categoryColors,
  categorySelectOptions = [],
  editable = false,
  emptyMessage = "No transactions to show.",
  onCategoryChange,
  transactions
}: TransactionListProps) {
  // Render a small first page of rows to keep the Transactions tab responsive with large Akahu histories.
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(initialVisibleTransactionCount);
  const isDesktop = useIsDesktopNavigation();
  const visibleTransactions = useMemo(() => transactions.slice(0, visibleCount), [transactions, visibleCount]);
  const remainingTransactionCount = Math.max(0, transactions.length - visibleTransactions.length);
  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => getTransactionId(transaction) === selectedTransactionId) || null,
    [selectedTransactionId, transactions]
  );
  const closeDetails = useCallback(() => setSelectedTransactionId(null), []);
  const openDetails = useCallback((transactionId: string) => setSelectedTransactionId(transactionId), []);
  const showMoreTransactions = useCallback(() => setVisibleCount((currentCount) => currentCount + visibleTransactionIncrement), []);

  useEffect(() => {
    setVisibleCount(initialVisibleTransactionCount);
    setSelectedTransactionId(null);
  }, [transactions]);

  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="transaction-list-layout">
      {!isDesktop && selectedTransaction ? (
        <MobileTransactionDetails
          categorySelectOptions={categorySelectOptions}
          categoryColors={categoryColors}
          editable={editable}
          onCategoryChange={onCategoryChange}
          onBack={closeDetails}
          transaction={selectedTransaction}
        />
      ) : (
        <div className="transaction-list-panel">
          <div className="stack-list">
            {visibleTransactions.map((transaction) => {
              const transactionId = getTransactionId(transaction);

              return (
                <TransactionRow
                  categoryColors={categoryColors}
                  key={transactionId}
                  onOpenDetails={openDetails}
                  transaction={transaction}
                />
              );
            })}
          </div>
          {remainingTransactionCount > 0 && (
            <Button className="transaction-load-more" onClick={showMoreTransactions} type="button" variant="secondary">
              Load {Math.min(visibleTransactionIncrement, remainingTransactionCount)} more
            </Button>
          )}
        </div>
      )}
      {isDesktop && (
        <TransactionDetailsSheet
          categorySelectOptions={categorySelectOptions}
          categoryColors={categoryColors}
          editable={editable}
          onCategoryChange={onCategoryChange}
          onClose={closeDetails}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
}

type TransactionRowProps = {
  categoryColors: Record<string, string>;
  onOpenDetails: (transactionId: string) => void;
  transaction: Transaction;
};

const TransactionRow = memo(function TransactionRow({
  categoryColors,
  onOpenDetails,
  transaction
}: TransactionRowProps) {
  const transactionId = getTransactionId(transaction);
  const row = getTransactionRow(transaction, categoryColors);
  const openDetails = useCallback(() => onOpenDetails(transactionId), [onOpenDetails, transactionId]);

  return (
    <InfoRow
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

function CategorySelect({
  categoryLabel,
  categoryOptions,
  onCategoryChange,
  onClose,
  transaction
}: {
  categoryLabel: string;
  categoryOptions: SelectOption[];
  onCategoryChange?: (transactionId: string, category: string) => void;
  onClose: () => void;
  transaction: Transaction;
}) {
  // Category edits are saved through the parent so localStorage overrides and derived filters update together.
  const handleCategoryChange = (category: string) => {
    onCategoryChange?.(getTransactionId(transaction), category);
    onClose();
  };

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
  categorySelectOptions,
  categoryColors,
  editable,
  onCategoryChange,
  onClose,
  transaction
}: {
  categorySelectOptions: SelectOption[];
  categoryColors: Record<string, string>;
  editable: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  onClose: () => void;
  transaction: Transaction | null;
}) {
  // Desktop keeps details in a side sheet so the transaction list remains visible for comparison.
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
              <TransactionDetailsContent
                categorySelectOptions={categorySelectOptions}
                categoryColors={categoryColors}
                editable={editable}
                onCategoryChange={onCategoryChange}
                transaction={transaction}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileTransactionDetails({
  categorySelectOptions,
  categoryColors,
  editable,
  onCategoryChange,
  onBack,
  transaction
}: {
  categorySelectOptions: SelectOption[];
  categoryColors: Record<string, string>;
  editable: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  onBack: () => void;
  transaction: Transaction;
}) {
  // Mobile uses a full in-page detail state to avoid cramped overlays and nested sheet scrolling.
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
      <TransactionDetailsContent
        categorySelectOptions={categorySelectOptions}
        categoryColors={categoryColors}
        editable={editable}
        onCategoryChange={onCategoryChange}
        transaction={transaction}
      />
    </div>
  );
}

function TransactionDetailsContent({
  categorySelectOptions,
  categoryColors,
  editable,
  onCategoryChange,
  transaction
}: {
  categorySelectOptions: SelectOption[];
  categoryColors: Record<string, string>;
  editable: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  transaction: Transaction;
}) {
  // Shared detail body keeps desktop and mobile transaction metadata consistent.
  const merchant = getTransactionMerchant(transaction);
  const category = getTransactionCategory(transaction);
  const avatarStyle = { background: getTransactionColor(category, categoryColors) };
  const amountClassName = transaction.amount < 0 ? "negative" : "positive";
  const rawText = getTransactionRawText(transaction);

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[rgba(119,106,116,0.14)] bg-white/90 p-3">
        <div className="grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white" style={avatarStyle}>
          {merchant.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <strong className="block truncate">{merchant}</strong>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{getTransactionSummaryMeta(transaction)}</p>
        </div>
        <strong className={amountClassName}>{getTransactionAmountLabel(transaction)}</strong>
      </div>

      {editable && (
        <section className="grid gap-2">
          <h3 className="text-sm font-bold">Category</h3>
          <CategorySelect
            categoryLabel={`Set category for ${merchant}`}
            categoryOptions={categorySelectOptions}
            onCategoryChange={onCategoryChange}
            onClose={() => undefined}
            transaction={transaction}
          />
        </section>
      )}

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
  // Seed from matchMedia so desktop does not render the mobile detail path before correcting itself.
  const [isDesktop, setIsDesktop] = useState(() => getIsDesktopNavigation());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1025px)");
    const handleChange = () => setIsDesktop(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}

function getIsDesktopNavigation() {
  return typeof window === "undefined" ? true : window.matchMedia("(min-width: 1025px)").matches;
}
