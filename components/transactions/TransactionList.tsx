"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerHeaderClose,
  DrawerTitle
} from "@/components/ui/drawer";
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
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  onLoadMore?: () => void;
  transactions: Transaction[];
};

const initialVisibleTransactionCount = 40;
const visibleTransactionIncrement = 60;
const transactionDetailsExitAnimationMs = 520;

// Shows transactions in pages and opens the right detail view for the screen size
export function TransactionList({
  categoryColors,
  categorySelectOptions = [],
  editable = false,
  emptyMessage = "No transactions to show.",
  hasMore = false,
  isLoadingMore = false,
  onCategoryChange,
  onLoadMore,
  transactions
}: TransactionListProps) {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(initialVisibleTransactionCount);
  const previousTransactionSignatureRef = useRef("");
  const isDesktop = useIsDesktopNavigation();
  const visibleTransactions = useMemo(() => transactions.slice(0, visibleCount), [transactions, visibleCount]);
  const remainingTransactionCount = Math.max(0, transactions.length - visibleTransactions.length);
  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => getTransactionId(transaction) === selectedTransactionId) || null,
    [selectedTransactionId, transactions]
  );
  const closeDetails = useCallback(() => setSelectedTransactionId(null), []);
  const openDetails = useCallback((transactionId: string) => setSelectedTransactionId(transactionId), []);
  const showMoreTransactions = useCallback(() => {
    if (remainingTransactionCount > 0) {
      setVisibleCount((currentCount) => currentCount + visibleTransactionIncrement);
      return;
    }

    onLoadMore?.();
  }, [onLoadMore, remainingTransactionCount]);

  useEffect(() => {
    const firstTransactionId = transactions[0] ? getTransactionId(transactions[0]) : "";
    const transactionSignature = `${firstTransactionId}:${transactions.length}`;
    const previousSignature = previousTransactionSignatureRef.current;
    const previousLength = Number.parseInt(previousSignature.split(":").at(-1) || "0", 10);
    const isAppendedPage = firstTransactionId && previousSignature.startsWith(`${firstTransactionId}:`) && transactions.length > previousLength;

    if (!isAppendedPage) {
      setVisibleCount(initialVisibleTransactionCount);
    }

    previousTransactionSignatureRef.current = transactionSignature;
    setSelectedTransactionId(null);
    setDetailsTransaction(null);
  }, [transactions]);

  useEffect(() => {
    if (selectedTransaction) {
      setDetailsTransaction(selectedTransaction);
      return undefined;
    }

    const clearDetailsTransaction = window.setTimeout(() => {
      setDetailsTransaction(null);
    }, transactionDetailsExitAnimationMs);

    return () => window.clearTimeout(clearDetailsTransaction);
  }, [selectedTransaction]);

  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="transaction-list-layout">
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
        {(remainingTransactionCount > 0 || hasMore) && (
          <Button className="transaction-load-more" disabled={isLoadingMore} onClick={showMoreTransactions} type="button" variant="secondary">
            {getLoadMoreLabel(remainingTransactionCount, hasMore, isLoadingMore)}
          </Button>
        )}
      </div>
      {!isDesktop && detailsTransaction && (
        <TransactionDetailsDrawer
          categorySelectOptions={categorySelectOptions}
          categoryColors={categoryColors}
          editable={editable}
          open={Boolean(selectedTransaction)}
          onCategoryChange={onCategoryChange}
          onClose={closeDetails}
          transaction={detailsTransaction}
        />
      )}
      {isDesktop && detailsTransaction && (
        <TransactionDetailsSheet
          categorySelectOptions={categorySelectOptions}
          categoryColors={categoryColors}
          editable={editable}
          open={Boolean(selectedTransaction)}
          onCategoryChange={onCategoryChange}
          onClose={closeDetails}
          transaction={detailsTransaction}
        />
      )}
    </div>
  );
}

function getLoadMoreLabel(remainingTransactionCount: number, hasMore: boolean, isLoadingMore: boolean) {
  if (isLoadingMore) {
    return "Loading more";
  }

  if (remainingTransactionCount > 0) {
    return `Load ${Math.min(visibleTransactionIncrement, remainingTransactionCount)} more`;
  }

  return hasMore ? "Load more from Akahu" : "Load more";
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

// Send category edits upward so saved overrides and filters update together
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

// Use a side sheet on desktop so the list stays visible
function TransactionDetailsSheet({
  categorySelectOptions,
  categoryColors,
  editable,
  open,
  onCategoryChange,
  onClose,
  transaction
}: {
  categorySelectOptions: SelectOption[];
  categoryColors: Record<string, string>;
  editable: boolean;
  open: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  onClose: () => void;
  transaction: Transaction;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitleOnOpen = (event: Event) => {
    event.preventDefault();
    titleRef.current?.focus();
  };

  return (
    <Sheet onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <SheetContent className="transaction-details-shell overflow-hidden p-0" onOpenAutoFocus={focusTitleOnOpen}>
        <div className="transaction-details-sheet flex h-full flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle ref={titleRef} tabIndex={-1}>Transaction Details</SheetTitle>
            <SheetDescription className="sr-only">Selected transaction details.</SheetDescription>
          </SheetHeader>
          <div>
            <TransactionDetailsContent
              categorySelectOptions={categorySelectOptions}
              categoryColors={categoryColors}
              editable={editable}
              onCategoryChange={onCategoryChange}
              transaction={transaction}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Handles the mobile drawer positions and close gesture
function TransactionDetailsDrawer({
  categorySelectOptions,
  categoryColors,
  editable,
  open,
  onCategoryChange,
  onClose,
  transaction
}: {
  categorySelectOptions: SelectOption[];
  categoryColors: Record<string, string>;
  editable: boolean;
  open: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  onClose: () => void;
  transaction: Transaction;
}) {
  return (
    <Drawer onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DrawerContent className="transaction-details-mobile-drawer overflow-hidden after:hidden after:content-none">
        <DrawerHeader className="mobile-filter-header">
          <DrawerTitle>Transaction Details</DrawerTitle>
          <DrawerDescription className="sr-only">Selected transaction details.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <TransactionDetailsContent
            categorySelectOptions={categorySelectOptions}
            categoryColors={categoryColors}
            editable={editable}
            onCategoryChange={onCategoryChange}
            transaction={transaction}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Builds the transaction details used by both desktop and mobile views
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
  const merchant = getTransactionMerchant(transaction);
  const category = getTransactionCategory(transaction);
  const avatarStyle = { background: getTransactionColor(category, categoryColors) };
  const amountClassName = transaction.amount < 0 ? "negative" : "positive";
  const rawText = getTransactionRawText(transaction);
  const transactionId = getTransactionId(transaction);
  const [rawTextExpanded, setRawTextExpanded] = useState(false);

  useEffect(() => {
    setRawTextExpanded(false);
  }, [transactionId]);

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
          <button
            aria-expanded={rawTextExpanded}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--outline)] bg-white/70 px-3 py-2 text-left text-sm font-bold text-[var(--ink)]"
            onClick={() => setRawTextExpanded((isExpanded) => !isExpanded)}
            type="button"
          >
            <span>Raw bank text</span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${rawTextExpanded ? "rotate-180" : ""}`}
            />
          </button>
          <RawBankTextPanel expanded={rawTextExpanded} rawText={rawText} />
        </section>
      )}
    </div>
  );
}

function RawBankTextPanel({ expanded, rawText }: { expanded: boolean; rawText: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    setContentHeight(contentRef.current.scrollHeight);
  }, [rawText]);

  useEffect(() => {
    if (!expanded || !contentRef.current) {
      return;
    }

    setContentHeight(contentRef.current.scrollHeight);
  }, [expanded]);

  return (
    <div
      aria-hidden={!expanded}
      className={`raw-bank-text-panel ${expanded ? "expanded" : ""}`}
      style={{ maxHeight: expanded ? contentHeight : 0 }}
    >
      <div ref={contentRef}>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{rawText}</p>
      </div>
    </div>
  );
}

// Watches the screen width so details use a sheet on desktop and a drawer on mobile
function useIsDesktopNavigation() {
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
