"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionDetailsOverlay } from "@/features/transactions/TransactionList";
import { formatMoney } from "@/lib/insights";
import {
  formatTransactionDateHeading,
  getTransactionCategory,
  getTransactionId,
  getTransactionMerchant,
  groupTransactionsByDate
} from "@/lib/transaction-display";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

type RecentActivityStripProps = {
  categoryColors: Record<string, string>;
  onViewAll: () => void;
  transactions: Transaction[];
};

// Recent transaction preview used on the Home dashboard.
export function RecentActivityStrip({ categoryColors, onViewAll, transactions }: RecentActivityStripProps) {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const transactionGroups = useMemo(() => groupTransactionsByDate(transactions), [transactions]);
  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => getTransactionId(transaction) === selectedTransactionId) || null,
    [selectedTransactionId, transactions]
  );
  const openDetails = useCallback((transactionId: string) => setSelectedTransactionId(transactionId), []);
  const closeDetails = useCallback(() => setSelectedTransactionId(null), []);

  useEffect(() => {
    if (selectedTransaction) {
      setDetailsTransaction(selectedTransaction);
      return undefined;
    }

    const clearDetailsTransaction = window.setTimeout(() => {
      setDetailsTransaction(null);
    }, 520);

    return () => window.clearTimeout(clearDetailsTransaction);
  }, [selectedTransaction]);

  if (transactions.length === 0) {
    return (
      <Card className="grid gap-4">
        <RecentActivityHeader onViewAll={onViewAll} />
        <div className="empty-state">No transactions found.</div>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4">
      <RecentActivityHeader onViewAll={onViewAll} />
      <div className="grid grid-cols-1 gap-2" data-testid="home-recent-transactions">
        {transactionGroups.map((group) => (
          <div className="home-recent-date-group" key={group.date}>
            <h3 className="home-recent-date-heading">{formatTransactionDateHeading(group.date)}</h3>
            {group.transactions.map((transaction) => {
              const category = getTransactionCategory(transaction);
              const merchant = getTransactionMerchant(transaction);
              const transactionId = getTransactionId(transaction);
              const amountTone = transaction.amount < 0 ? "negative" : "positive";
              const avatarStyle = { background: getCategoryColor(category, categoryColors) };

              return (
                <button
                  className="grid min-w-0 grid-cols-[46px_minmax(0,1fr)_max-content] items-center gap-3 rounded-2xl border border-[var(--outline-soft)] bg-[var(--surface-2)] px-3 py-2.5 text-left text-[var(--ink)] transition-[transform,background,border-color] duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-[var(--surface-3)] hover:shadow-[inset_0_0_0_1px_var(--primary-border)] focus-visible:bg-[var(--surface-3)] focus-visible:shadow-[inset_0_0_0_1px_var(--primary-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] active:scale-[0.985] max-[600px]:grid-cols-[48px_minmax(0,1fr)_max-content] max-[600px]:p-2.5"
                  key={transactionId}
                  onClick={() => openDetails(transactionId)}
                  type="button"
                >
                  <span className="letter-avatar" style={avatarStyle}>
                    {merchant.slice(0, 1)}
                  </span>
                  <span className="grid min-w-0 gap-[3px]">
                    <strong className="truncate text-[0.94rem]">{merchant}</strong>
                    <span className="truncate text-[0.82rem] font-bold text-[var(--muted)]">{category}</span>
                  </span>
                  <b className={cn("self-center whitespace-nowrap text-[0.94rem] tabular-nums", amountTone)}>{formatMoney(transaction.amount, true)}</b>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-center px-0 pt-0.5 pb-1">
        <Button className="min-h-[38px] rounded-full px-[26px]" onClick={onViewAll} type="button" variant="secondary">
          View All Transactions
        </Button>
      </div>
      {detailsTransaction && (
        <TransactionDetailsOverlay
          categoryColors={categoryColors}
          onClose={closeDetails}
          open={Boolean(selectedTransaction)}
          transaction={detailsTransaction}
        />
      )}
    </Card>
  );
}

function RecentActivityHeader({ onViewAll }: { onViewAll: () => void }) {
  return (
    <CardHeader>
      <CardTitle>Recent activity</CardTitle>
    </CardHeader>
  );
}

function getCategoryColor(category: string, categoryColors: Record<string, string>) {
  return categoryColors[category] || "#667085";
}
