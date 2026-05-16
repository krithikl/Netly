"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronRight, CreditCard, LoaderCircle } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  getTransactionAccountLabel,
  getTransactionAmountLabel,
  getTransactionCategory,
  getTransactionDate,
  getTransactionDetailRows,
  getTransactionId,
  getTransactionMerchant,
  getTransactionRawBankText,
  getTransactionSearchText,
  getTransactionStatus
} from "@/lib/transaction-display";
import type { CategoryEditScope } from "@/lib/category-rules";
import type { Transaction } from "@/lib/types";

type TransactionListProps = {
  categoryColors: Record<string, string>;
  categorySelectOptions?: SelectOption[];
  editable?: boolean;
  emptyMessage?: string;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingAll?: boolean;
  isLoadingMore?: boolean;
  onCategoryChange?: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onLoadAll?: () => void;
  onLoadMore?: () => void;
  transactions: Transaction[];
};

const initialVisibleTransactionCount = 40;
const visibleTransactionIncrement = 60;
const transactionDetailsExitAnimationMs = 520;
const transactionDateFormatter = new Intl.DateTimeFormat("en-NZ", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

// Shows transactions in pages and opens the right detail view for the screen size
// Transaction list/table used by TransactionsView for rendered results.
export function TransactionList({
  categoryColors,
  categorySelectOptions = [],
  editable = false,
  emptyMessage = "No transactions to show.",
  hasMore = false,
  isLoading = false,
  isLoadingAll = false,
  isLoadingMore = false,
  onCategoryChange,
  onLoadAll,
  onLoadMore,
  transactions
}: TransactionListProps) {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(initialVisibleTransactionCount);
  const previousTransactionSignatureRef = useRef("");
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

  if (isLoading) {
    return (
      <div className="transaction-loading-state" role="status">
        <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
        <span>Loading transactions and encrypted archive...</span>
      </div>
    );
  }

  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="transaction-list-layout">
      <div className="transaction-list-panel">
        <div className="transaction-ledger" role="table" aria-label="Transactions">
          <div className="transaction-ledger-header" role="row">
            <span role="columnheader">Date</span>
            <span role="columnheader">Merchant</span>
            <span role="columnheader">Category</span>
            <span role="columnheader">Account</span>
            <span role="columnheader">Amount</span>
            <span aria-hidden="true" />
          </div>
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
          <div className="transaction-load-actions">
            <Button className="transaction-load-more" disabled={isLoadingMore || isLoadingAll} onClick={showMoreTransactions} type="button" variant="secondary">
              {getLoadMoreLabel(remainingTransactionCount, hasMore, isLoadingMore)}
            </Button>
            {hasMore && onLoadAll && (
              <Button className="transaction-load-more" disabled={isLoadingMore || isLoadingAll} onClick={onLoadAll} type="button" variant="outline">
                {isLoadingAll ? "Loading full range" : "Load all for this range"}
              </Button>
            )}
          </div>
        )}
      </div>
      {detailsTransaction && (
        <TransactionDetailsOverlay
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

type TransactionDetailsOverlayProps = {
  categoryColors: Record<string, string>;
  categorySelectOptions?: SelectOption[];
  editable?: boolean;
  onCategoryChange?: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onClose: () => void;
  open: boolean;
  transaction: Transaction;
};

export function TransactionDetailsOverlay({
  categoryColors,
  categorySelectOptions = [],
  editable = false,
  onCategoryChange,
  onClose,
  open,
  transaction
}: TransactionDetailsOverlayProps) {
  const isDesktop = useIsDesktopNavigation();

  if (!isDesktop) {
    return (
      <TransactionDetailsDrawer
        categorySelectOptions={categorySelectOptions}
        categoryColors={categoryColors}
        editable={editable}
        open={open}
        onCategoryChange={onCategoryChange}
        onClose={onClose}
        transaction={transaction}
      />
    );
  }

  return (
    <TransactionDetailsSheet
      categorySelectOptions={categorySelectOptions}
      categoryColors={categoryColors}
      editable={editable}
      open={open}
      onCategoryChange={onCategoryChange}
      onClose={onClose}
      transaction={transaction}
    />
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
  const row = getTransactionRowModel(transaction, categoryColors);
  const openDetails = useCallback(() => onOpenDetails(transactionId), [onOpenDetails, transactionId]);

  return (
    <button className="transaction-ledger-row" onClick={openDetails} role="row" type="button">
      <span className="transaction-ledger-date" role="cell">{row.date}</span>
      <span className="transaction-ledger-merchant" role="cell">
        <span className="transaction-merchant-avatar" style={row.colorStyle}>{row.initial}</span>
        <span className="transaction-merchant-copy">
          <strong>{row.merchant}</strong>
          <small className="transaction-row-status">{row.statusLabel}</small>
          <span className="transaction-category-chip transaction-mobile-category-chip" style={row.colorStyle}>
            <span aria-hidden="true" />
            {row.category}
          </span>
          <small className="transaction-mobile-row-meta">{row.date} · {row.account}</small>
        </span>
      </span>
      <span className="transaction-category-chip transaction-desktop-category-cell" role="cell" style={row.colorStyle}>
        <span aria-hidden="true" />
        {row.category}
      </span>
      <span className="transaction-account-chip" role="cell">
        <CreditCard aria-hidden="true" className="h-3.5 w-3.5" />
        {row.account}
      </span>
      <strong className={`transaction-ledger-amount ${row.valueTone}`} role="cell">{row.amount}</strong>
      <ChevronRight aria-hidden="true" className="transaction-ledger-chevron h-4 w-4" />
    </button>
  );
});

function getTransactionRowModel(transaction: Transaction, categoryColors: Record<string, string>) {
  const category = getTransactionCategory(transaction);
  const merchant = getTransactionMerchant(transaction);
  const color = getTransactionColor(category, categoryColors);

  return {
    account: getTransactionAccountLabel(transaction),
    amount: getTransactionAmountLabel(transaction),
    category,
    colorStyle: { "--transaction-color": color } as CSSProperties,
    date: formatTransactionDate(getTransactionDate(transaction)),
    initial: merchant.slice(0, 1).toUpperCase(),
    merchant,
    statusLabel: getTransactionRowStatusLabel(transaction),
    valueTone: transaction.amount < 0 ? "negative" : "positive"
  };
}

function getTransactionRowStatusLabel(transaction: Transaction) {
  return [
    getTransactionStatus(transaction),
    getPaymentTypeLabel(transaction)
  ].filter(Boolean).join(" · ");
}

function getPaymentTypeLabel(transaction: Transaction) {
  const paymentType = typeof transaction.type === "string" ? transaction.type.trim() : "";

  return paymentType ? formatPaymentType(paymentType) : "";
}

function formatPaymentType(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function getTransactionColor(category: string, categoryColors: Record<string, string>) {
  return categoryColors[category] || "#607d8b";
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
  onCategoryChange?: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onClose: () => void;
  transaction: Transaction;
}) {
  const [pendingCategory, setPendingCategory] = useState("");
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const handleCategoryChange = (category: string) => {
    setPendingCategory(category);
    setScopeDialogOpen(true);
  };
  const applyCategoryChange = (scope: CategoryEditScope) => {
    if (!pendingCategory) {
      return;
    }

    onCategoryChange?.(transaction, pendingCategory, scope);
    setScopeDialogOpen(false);
    setPendingCategory("");
    onClose();
  };

  return (
    <>
      <SelectField
        ariaLabel={categoryLabel}
        className="transaction-detail-category-select"
        onChange={handleCategoryChange}
        options={categoryOptions}
        value={getTransactionCategory(transaction)}
      />
      <Dialog onOpenChange={setScopeDialogOpen} open={scopeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply category change?</DialogTitle>
            <DialogDescription>
              Choose whether this category should apply only to this transaction or to similar transactions from the same merchant and Akahu category.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => applyCategoryChange("transaction")} type="button" variant="outline">
              Only this transaction
            </Button>
            <Button onClick={() => applyCategoryChange("similar")} type="button">
              All similar transactions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  onCategoryChange?: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
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
      <SheetContent
        className="transaction-details-shell overflow-hidden p-0"
        overlayClassName="transaction-details-overlay"
        onOpenAutoFocus={focusTitleOnOpen}
      >
        <div className="transaction-details-sheet flex h-full flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="focus:outline-none" ref={titleRef} tabIndex={-1}>Transaction details</SheetTitle>
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
  onCategoryChange?: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onClose: () => void;
  transaction: Transaction;
}) {
  return (
    <Drawer onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open} shouldScaleBackground={false}>
      <DrawerContent className="transaction-details-mobile-drawer overflow-hidden">
        <DrawerHeader className="mobile-filter-header">
          <DrawerTitle>Transaction details</DrawerTitle>
          <DrawerDescription className="sr-only">Selected transaction details.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 overscroll-y-none [touch-action:pan-y] pb-[calc(20px+env(safe-area-inset-bottom))]">
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
  onCategoryChange?: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  transaction: Transaction;
}) {
  const merchant = getTransactionMerchant(transaction);
  const category = getTransactionCategory(transaction);
  const colorStyle = { "--transaction-color": getTransactionColor(category, categoryColors) } as CSSProperties;
  const amountClassName = transaction.amount < 0 ? "negative" : "positive";
  const summaryStatusLabel = getTransactionRowStatusLabel(transaction);
  const rawText = getTransactionRawBankText(transaction);
  const transactionId = getTransactionId(transaction);
  const [rawTextExpanded, setRawTextExpanded] = useState(false);

  useEffect(() => {
    setRawTextExpanded(false);
  }, [transactionId]);

  return (
    <div className="transaction-detail-content">
      <section className="transaction-detail-summary-card">
        <span className="transaction-merchant-avatar large" style={colorStyle}>
          {merchant.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <strong className="block truncate">{merchant}</strong>
          <p>{formatTransactionDate(getTransactionDate(transaction))} · {summaryStatusLabel}</p>
          <div className="transaction-detail-summary-meta">
            <span className="transaction-category-chip" style={colorStyle}>
              <span aria-hidden="true" />
              {category}
            </span>
            <span className="transaction-account-chip">
              <CreditCard aria-hidden="true" className="h-3.5 w-3.5" />
              {getTransactionAccountLabel(transaction)}
            </span>
          </div>
        </div>
        <strong className={`transaction-detail-amount ${amountClassName}`}>{getTransactionAmountLabel(transaction)}</strong>
      </section>

      {editable && (
        <section className="transaction-detail-section">
          <h3>Category</h3>
          <CategorySelect
            categoryLabel={`Set category for ${merchant}`}
            categoryOptions={categorySelectOptions}
            onCategoryChange={onCategoryChange}
            onClose={() => undefined}
            transaction={transaction}
          />
        </section>
      )}

      <section className="transaction-detail-section">
        <h3>Details</h3>
        <div className="transaction-detail-rows">
          {getTransactionDetailRows(transaction).map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {rawText && (
        <section className="transaction-detail-section">
          <Button
            aria-expanded={rawTextExpanded}
            className="transaction-raw-bank-toggle"
            onClick={() => setRawTextExpanded((isExpanded) => !isExpanded)}
            type="button"
            variant="outline"
          >
            <span>Raw bank text</span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${rawTextExpanded ? "rotate-180" : ""}`}
            />
          </Button>
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
        <p>{rawText}</p>
      </div>
    </div>
  );
}

function formatTransactionDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return transactionDateFormatter.format(date);
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
