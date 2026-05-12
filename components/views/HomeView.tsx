import clsx from "clsx";
import { CalendarDays, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import { CategoryDonutCard } from "@/components/charts/CategoryDonutCard";
import { HeroBalanceCard } from "@/components/home/HeroBalanceCard";
import { InsightsPanel } from "@/components/home/InsightsPanel";
import { MetricCard } from "@/components/home/MetricCard";
import { RecentActivityStrip } from "@/components/home/RecentActivityStrip";
import { formatMoney } from "@/lib/insights";
import type { Transaction } from "@/lib/types";
import type { View } from "@/lib/app/types";

type HomeViewProps = {
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
  safeToSpendAmount: number;
  setActiveView: (view: View) => void;
  setHoveredCategory: (category: string | null) => void;
  setPayday: (payday: string) => void;
  transactionPreview: Transaction[];
};

// Shows the dashboard summary, category chart, insights, and recent transactions
// Home dashboard composed from summary cards, charts, insights, and recent transactions.
export function HomeView({
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
  safeToSpendAmount,
  setActiveView,
  setHoveredCategory,
  setPayday,
  transactionPreview
}: HomeViewProps) {
  const metricGridClassName = getLoadingClassName("metric-grid", isLoadingTransactions);
  const dashboardGridClassName = getLoadingClassName("dashboard-grid", isLoadingTransactions);
  const recentTransactions = transactionPreview.slice(0, 5);
  const openConnectView = () => setActiveView("connect");
  const openTransactionsView = () => setActiveView("transactions");
  const openBudgetsView = () => setActiveView("budgets");

  return (
    <>
      <HeroBalanceCard
        availableBalance={availableBalance}
        isConnected={isConnected}
        onConnect={openConnectView}
        onReviewSpend={openTransactionsView}
        payday={payday}
        paydayPatternDate={paydayPatternDate}
        safeToSpendAmount={safeToSpendAmount}
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
