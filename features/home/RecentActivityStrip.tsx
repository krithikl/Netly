"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionDetailsOverlay } from "@/features/transactions/TransactionList";
import { formatMoney } from "@/lib/insights";
import {
  getTransactionCategory,
  getTransactionDate,
  getTransactionId,
  getTransactionMerchant
} from "@/lib/transaction-display";
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
      <Card className="recent-activity-card">
        <RecentActivityHeader onViewAll={onViewAll} />
        <div className="empty-state">No transactions found.</div>
      </Card>
    );
  }

  return (
    <Card className="recent-activity-card">
      <RecentActivityHeader onViewAll={onViewAll} />
      <div className="recent-strip" data-testid="home-recent-transactions">
        {transactions.map((transaction) => {
          const category = getTransactionCategory(transaction);
          const merchant = getTransactionMerchant(transaction);
          const transactionId = getTransactionId(transaction);
          const amountTone = transaction.amount < 0 ? "negative" : "positive";
          const avatarStyle = { background: getCategoryColor(category, categoryColors) };

          return (
            <button className="recent-item" key={transactionId} onClick={() => openDetails(transactionId)} type="button">
              <span className="recent-avatar" style={avatarStyle}>
                {merchant.slice(0, 1)}
              </span>
              <span className="recent-copy">
                <strong>{merchant}</strong>
                <span>{category}</span>
                <small>{formatRelativeDate(getTransactionDate(transaction))}</small>
              </span>
              <b className={`recent-amount ${amountTone}`}>{formatMoney(transaction.amount)}</b>
            </button>
          );
        })}
      </div>
      <div className="recent-activity-footer">
        <Button className="recent-view-all-button" onClick={onViewAll} type="button" variant="secondary">
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

function formatRelativeDate(value: string) {
  const transactionDate = new Date(`${value}T12:00:00`);

  if (Number.isNaN(transactionDate.getTime())) {
    return value;
  }

  const today = new Date();
  const todayMidday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  const dayDifference = Math.round((todayMidday.getTime() - transactionDate.getTime()) / millisecondsInDay);

  if (dayDifference === 0) {
    return "Today";
  }

  if (dayDifference === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short"
  }).format(transactionDate);
}
