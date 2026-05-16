import clsx from "clsx";
import { CalendarDays, Sparkles, TrendingUp, WalletCards } from "lucide-react";
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
  setPayday,
  transactionPreview
}: HomePageProps) {
  const metricGridClassName = getLoadingClassName("metric-grid", isLoadingTransactions);
  const dashboardGridClassName = getLoadingClassName("dashboard-grid", isLoadingTransactions);
  const recentTransactions = [...transactionPreview]
    .sort((first, second) => getTransactionTimestamp(second) - getTransactionTimestamp(first))
    .slice(0, 5);
  const openTransactionsView = () => setActiveView("transactions");
  const openBudgetsView = () => setActiveView("budgets");

  return (
    <>
      <HeroBalanceCard
        availableBalance={availableBalance}
        isConnected={isConnected}
        onReviewSpend={openTransactionsView}
        payday={payday}
        paydayPatternDate={paydayPatternDate}
        setPayday={setPayday}
      />

      {isLoadingTransactions && (
        <div className="status-banner neutral" role="status">
          <strong>Loading transactions.</strong>
          <span>Checking whether Akahu data is available.</span>
        </div>
      )}

      <div className={metricGridClassName} aria-busy={isLoadingTransactions}>
        <MetricCard icon={TrendingUp} label="Spent" note={`${expensesCount} outgoing transactions`} tone="blue" value={formatMoney(monthlySpend)} />
        <MetricCard icon={CalendarDays} label="Average per day" note="Estimated daily spend" tone="orange" value={formatMoney(averageDailySpend, true)} />
        <MetricCard icon={WalletCards} label="Income" note="Credits in this period" tone="green" value={formatMoney(income)} />
        <MetricCard actionLabel="Review" icon={Sparkles} label="Needs review" note="Low-confidence matches" onAction={onReviewNeedsReview} tone="red" value={reviewCount.toString()} />
      </div>

      <div className={dashboardGridClassName} aria-busy={isLoadingTransactions}>
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

      <RecentActivityStrip
        categoryColors={categoryColors}
        onViewAll={openTransactionsView}
        transactions={recentTransactions}
      />
    </>
  );
}

function getLoadingClassName(baseClassName: string, isLoading: boolean) {
  return clsx(baseClassName, isLoading && "is-loading");
}
