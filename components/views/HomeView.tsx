import clsx from "clsx";
import { DonutChart } from "@/components/charts/DonutChart";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Metric } from "@/components/ui/metric";
import { PanelTitle } from "@/components/ui/panel-title";
import { Button } from "@/components/ui/button";
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
  isLoadingTransactions: boolean;
  monthlySpend: number;
  reviewCount: number;
  safeToSpendAmount: number;
  setActiveView: (view: View) => void;
  setHoveredCategory: (category: string | null) => void;
  transactionPreview: Transaction[];
  upcomingCount: number;
  upcomingTotal: number;
  isConnected: boolean;
};

// Shows the dashboard summary, category chart, insights, and recent transactions
export function HomeView({
  availableBalance,
  categoryColors,
  chartCategories,
  chartTotal,
  expensesCount,
  hoveredCategory,
  income,
  insights,
  isLoadingTransactions,
  monthlySpend,
  reviewCount,
  safeToSpendAmount,
  setActiveView,
  setHoveredCategory,
  transactionPreview,
  upcomingCount,
  upcomingTotal,
  isConnected
}: HomeViewProps) {
  const balanceLabel = getBalanceLabel(availableBalance);
  const safeToSpendLabel = `${formatMoney(safeToSpendAmount)} looks safe after upcoming bills and buffer.`;
  const metricGridClassName = getLoadingClassName("metric-grid", isLoadingTransactions);
  const dashboardGridClassName = getLoadingClassName("dashboard-grid", isLoadingTransactions);
  const recentActivityClassName = getLoadingClassName("stable-list-panel", isLoadingTransactions);
  const recentTransactions = transactionPreview.slice(0, 5);
  const showConnectButton = !isConnected;
  const openConnectView = () => setActiveView("connect");
  const openTransactionsView = () => setActiveView("transactions");

  return (
    <>
      <div className="hero-card">
        <div>
          <span className="eyebrow">Available balance</span>
          <strong>{balanceLabel}</strong>
          <p>{safeToSpendLabel}</p>
        </div>
        <div className="hero-actions">
          {showConnectButton && (
            <Button className="bg-white/15 text-white hover:bg-white/25" onClick={openConnectView} type="button" variant="secondary">
              Connect bank
            </Button>
          )}
          <Button className="bg-white text-[var(--primary)] hover:bg-white/90" onClick={openTransactionsView} type="button">
            Review spend
          </Button>
        </div>
      </div>

      {isLoadingTransactions && (
        <div className="status-banner neutral" role="status">
          <strong>Loading transactions.</strong>
          <span>Checking whether Akahu data is available.</span>
        </div>
      )}

      <div className={metricGridClassName} aria-busy={isLoadingTransactions}>
        <Metric label="Spent" tone="red" value={formatMoney(monthlySpend)} note={`${expensesCount} outgoing transactions`} />
        <Metric label="Income" tone="green" value={formatMoney(income)} note="Salary and credits detected" />
        <Metric label="Upcoming" tone="amber" value={formatMoney(upcomingTotal)} note={`${upcomingCount} scheduled items`} />
        <Metric label="Needs review" tone="blue" value={reviewCount.toString()} note="Low-confidence matches" />
      </div>

      <div className={dashboardGridClassName} aria-busy={isLoadingTransactions}>
        <section className="material-card chart-panel category-panel">
          <PanelTitle title="Akahu categories" subtitle="Spending by category" />
          <div className="chart-layout">
            <div className="chart-visual">
              <DonutChart
                categories={chartCategories}
                categoryColors={categoryColors}
                hoveredCategory={hoveredCategory}
                onHover={setHoveredCategory}
              />
            </div>
            <CategoryLegend
              categories={chartCategories}
              categoryColors={categoryColors}
              chartTotal={chartTotal}
            />
          </div>
        </section>

        <section className="material-card">
          <PanelTitle title="Insights" subtitle="Generated from transaction patterns" />
          <ul className="insight-list">
            {insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="material-card">
        <PanelTitle title="Recent activity" subtitle="Recent transactions" />
        <div className={recentActivityClassName} aria-busy={isLoadingTransactions}>
          <TransactionList categoryColors={categoryColors} emptyMessage="No transactions found." transactions={recentTransactions} />
        </div>
        <Button className="mt-2" onClick={openTransactionsView} type="button" variant="secondary">
          View all transactions
        </Button>
      </section>
    </>
  );
}

type CategoryLegendProps = {
  categories: { category: string; amount: number }[];
  categoryColors: Record<string, string>;
  chartTotal: number;
};

function CategoryLegend({ categories, categoryColors, chartTotal }: CategoryLegendProps) {
  if (categories.length === 0) {
    return <div className="empty-state">No spending categories found for this period.</div>;
  }

  return (
    <div className="legend-list">
      {categories.map((item) => (
        <CategoryLegendRow
          categoryColors={categoryColors}
          chartTotal={chartTotal}
          item={item}
          key={item.category}
        />
      ))}
    </div>
  );
}

function CategoryLegendRow({
  categoryColors,
  chartTotal,
  item,
}: {
  categoryColors: Record<string, string>;
  chartTotal: number;
  item: { category: string; amount: number };
}) {
  const categoryColor = getCategoryColor(item.category, categoryColors);
  const legendBarStyle = getLegendBarStyle(item, chartTotal, categoryColor);
  const legendRowClassName = "legend-row";
  const legendDotStyle = getLegendDotStyle(categoryColor);

  return (
    <div className={legendRowClassName}>
      <span className="legend-dot" style={legendDotStyle} />
      <span className="legend-content">
        <span className="legend-topline">
          <span className="legend-name">{item.category}</span>
          <strong>{formatMoney(item.amount)}</strong>
        </span>
        <span className="legend-track" aria-hidden="true">
          <span className="legend-bar" style={legendBarStyle} />
        </span>
      </span>
    </div>
  );
}

function getBalanceLabel(availableBalance: number | null) {
  return availableBalance === null ? "Loading" : formatMoney(availableBalance, true);
}

function getLoadingClassName(baseClassName: string, isLoading: boolean) {
  return clsx(baseClassName, isLoading && "is-loading");
}

function getCategoryColor(category: string, categoryColors: Record<string, string>) {
  return categoryColors[category] || "#607d8b";
}

function getLegendBarStyle(item: { amount: number }, chartTotal: number, categoryColor: string) {
  return {
    background: categoryColor,
    width: `${getLegendBarWidth(item.amount, chartTotal)}%`
  };
}

function getLegendDotStyle(categoryColor: string) {
  return {
    background: categoryColor
  };
}

function getLegendBarWidth(amount: number, chartTotal: number) {
  return chartTotal > 0 ? Math.max(4, Math.round((amount / chartTotal) * 100)) : 0;
}
