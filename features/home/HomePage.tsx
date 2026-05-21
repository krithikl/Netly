import { CalendarDays, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { CategoryDonutCard } from "@/features/home/CategoryDonutCard";
import { HeroBalanceCard } from "@/features/home/HeroBalanceCard";
import { InsightsPanel } from "@/features/home/InsightsPanel";
import { MetricCard } from "@/features/home/MetricCard";
import { RecentActivityStrip } from "@/features/home/RecentActivityStrip";
import { formatMoney } from "@/lib/insights";
import { getTransactionTimestamp } from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";
import type { View } from "@/lib/app/types";

type HomePageProps = {
  availableBalance: number | null;
  categoryColors: Record<string, string>;
  chartCategories: { category: string; amount: number }[];
  chartTotal: number;
  expensesCount: number;
  hoveredCategory: string | null;
  hideBalances: boolean;
  income: number;
  insights: string[];
  isConnected: boolean;
  isLoadingTransactions: boolean;
  averageDailySpend: number;
  monthlySpend: number;
  onReviewNeedsReview: () => void;
  payday: string;
  paydayPatternDate: string;
  reviewCount: number;
  setActiveView: (view: View) => void;
  setHoveredCategory: (category: string | null) => void;
  setHideBalances: (hidden: boolean) => void;
  setPayday: (payday: string) => void;
  transactionPreview: Transaction[];
};

// Shows the dashboard summary, category chart, insights, and recent transactions
// Home dashboard composed from summary cards, charts, insights, and recent transactions.
export function HomePage({
  availableBalance,
  categoryColors,
  chartCategories,
  chartTotal,
  expensesCount,
  hoveredCategory,
  hideBalances,
  income,
  insights,
  isConnected,
  isLoadingTransactions,
  averageDailySpend,
  monthlySpend,
  onReviewNeedsReview,
  payday,
  paydayPatternDate,
  reviewCount,
  setActiveView,
  setHoveredCategory,
  setHideBalances,
  setPayday,
  transactionPreview
}: HomePageProps) {
  const recentTransactions = [...transactionPreview]
    .sort((first, second) => getTransactionTimestamp(second) - getTransactionTimestamp(first))
    .slice(0, 10);
  const openTransactionsView = () => setActiveView("transactions");
  const openBudgetsView = () => setActiveView("budgets");

  return (
    <section className="view-stack" data-testid="home-page">
      <MobilePageHeader title="Netly" />
      <HeroBalanceCard
        availableBalance={availableBalance}
        hideBalances={hideBalances}
        insights={insights}
        isConnected={isConnected}
        payday={payday}
        paydayPatternDate={paydayPatternDate}
        setHideBalances={setHideBalances}
        setPayday={setPayday}
      />

      <div className="dashboard-grid" aria-busy={isLoadingTransactions}>
        <CategoryDonutCard
          categories={chartCategories}
          categoryColors={categoryColors}
          chartTotal={chartTotal}
          hoveredCategory={hoveredCategory}
          onHover={setHoveredCategory}
          onViewBreakdown={openBudgetsView}
        />

        <InsightsPanel insights={insights} onViewInsights={openTransactionsView} />
      </div>

      <div className="metric-grid" aria-busy={isLoadingTransactions}>
        <MetricCard icon={TrendingUp} label="Spent" note={`${expensesCount} outgoing transactions`} tone="blue" value={formatMoney(monthlySpend)} />
        <MetricCard icon={CalendarDays} label="Average per day" note="Estimated daily spend" tone="orange" value={formatMoney(averageDailySpend, true)} />
        <MetricCard icon={WalletCards} label="Income" note="Credits in this period" tone="green" value={formatMoney(income)} />
        <MetricCard actionLabel="Review" icon={Sparkles} label="Needs review" note="Low-confidence matches" onAction={onReviewNeedsReview} tone="red" value={reviewCount.toString()} />
      </div>

      <RecentActivityStrip
        categoryColors={categoryColors}
        onViewAll={openTransactionsView}
        transactions={recentTransactions}
      />
    </section>
  );
}
