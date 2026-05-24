"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TransactionDetailsOverlay } from "@/features/transactions/TransactionList";
import { MoneyMovementCard } from "@/components/MoneyMovementCard";
import {
  formatTransactionDateHeading,
  getTransactionAmountLabel,
  getTransactionCategory,
  getTransactionId,
  getTransactionMerchant,
  groupTransactionsByDate
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
      <section className="transaction-list-layout">
        <div className="empty-state home-recent-empty">No transactions found.</div>
        <ViewAllTransactionsButton onViewAll={onViewAll} />
      </section>
    );
  }

  return (
    <section className="transaction-list-layout">
      <div className="money-movement-list home-recent-transactions" data-testid="home-recent-transactions">
        {transactionGroups.map((group) => (
          <div className="transaction-date-group" key={group.date}>
            <h3 className="transaction-date-group-heading">{formatTransactionDateHeading(group.date)}</h3>
            {group.transactions.map((transaction) => {
              const category = getTransactionCategory(transaction);
              const merchant = getTransactionMerchant(transaction);
              const transactionId = getTransactionId(transaction);

              return (
                <MoneyMovementCard
                  amount={getTransactionAmountLabel(transaction)}
                  amountTone={transaction.amount < 0 ? "expense" : "income"}
                  avatarLabel={merchant}
                  category={category}
                  categoryColor={getCategoryColor(category, categoryColors)}
                  key={transactionId}
                  onClick={() => openDetails(transactionId)}
                  title={merchant}
                />
              );
            })}
          </div>
        ))}
      </div>
      <ViewAllTransactionsButton onViewAll={onViewAll} />
      {detailsTransaction && (
        <TransactionDetailsOverlay
          categoryColors={categoryColors}
          onClose={closeDetails}
          open={Boolean(selectedTransaction)}
          transaction={detailsTransaction}
        />
      )}
    </section>
  );
}

function ViewAllTransactionsButton({ onViewAll }: { onViewAll: () => void }) {
  return (
    <div className="flex justify-center px-0 pt-0.5 pb-1">
      <Button className="min-h-[38px] rounded-full px-[26px]" onClick={onViewAll} type="button" variant="secondary">
        View All Transactions
      </Button>
    </div>
  );
}

function getCategoryColor(category: string, categoryColors: Record<string, string>) {
  return categoryColors[category] || "#667085";
}
