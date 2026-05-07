import clsx from "clsx";
import { DonutChart } from "@/components/charts/DonutChart";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Metric } from "@/components/ui/Metric";
import { PanelTitle } from "@/components/ui/PanelTitle";
import { categoryColors } from "@/lib/mock-data";
import { formatMoney } from "@/lib/insights";
import type { Transaction } from "@/lib/types";
import type { View } from "@/lib/app/types";

type HomeViewProps = {
  availableBalance: number | null;
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
  selectedHomeCategory: string | null;
  setActiveView: (view: View) => void;
  setHoveredCategory: (category: string | null) => void;
  setSelectedHomeCategory: (category: string | null) => void;
  transactionPreview: Transaction[];
  upcomingCount: number;
  upcomingTotal: number;
  isConnected: boolean;
};

export function HomeView({
  availableBalance,
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
  selectedHomeCategory,
  setActiveView,
  setHoveredCategory,
  setSelectedHomeCategory,
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
            <button className="tonal-button" onClick={openConnectView} type="button">
              Connect bank
            </button>
          )}
          <button className="primary-button" onClick={openTransactionsView} type="button">
            Review spend
          </button>
        </div>
      </div>

      {isLoadingTransactions && (
        <div className="status-banner neutral" role="status">
          <strong>Loading transactions.</strong>
          <span>Checking whether PNZ sandbox data is available.</span>
        </div>
      )}

      <div className={metricGridClassName} aria-busy={isLoadingTransactions}>
        <Metric label="Spent" tone="red" value={formatMoney(monthlySpend)} note={`${expensesCount} outgoing transactions`} />
        <Metric label="Income" tone="green" value={formatMoney(income)} note="Salary and credits detected" />
        <Metric label="Upcoming" tone="amber" value={formatMoney(upcomingTotal)} note={`${upcomingCount} scheduled items`} />
        <Metric label="Needs review" tone="blue" value={reviewCount.toString()} note="Low-confidence matches" />
      </div>

      <div className={dashboardGridClassName} aria-busy={isLoadingTransactions}>
        <section className="material-card chart-panel">
          <PanelTitle title="Inferred categories" subtitle="Tap a slice to filter recent activity" />
          <div className="chart-layout">
            <DonutChart
              categories={chartCategories}
              hoveredCategory={hoveredCategory}
              onHover={setHoveredCategory}
              selectedCategory={selectedHomeCategory}
              onSelect={setSelectedHomeCategory}
            />
            <CategoryLegend
              categories={chartCategories}
              chartTotal={chartTotal}
              hoveredCategory={hoveredCategory}
              selectedHomeCategory={selectedHomeCategory}
              setHoveredCategory={setHoveredCategory}
              setSelectedHomeCategory={setSelectedHomeCategory}
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
        <PanelTitle title="Recent activity" subtitle="Filtered by chart selection" />
        <div className={recentActivityClassName} aria-busy={isLoadingTransactions}>
          <TransactionList emptyMessage="No transactions found for this category." transactions={recentTransactions} />
        </div>
        <button className="tonal-action" onClick={openTransactionsView} type="button">
          View all transactions
        </button>
      </section>
    </>
  );
}

type CategoryLegendProps = {
  categories: { category: string; amount: number }[];
  chartTotal: number;
  hoveredCategory: string | null;
  selectedHomeCategory: string | null;
  setHoveredCategory: (category: string | null) => void;
  setSelectedHomeCategory: (category: string | null) => void;
};

function CategoryLegend({
  categories,
  chartTotal,
  hoveredCategory,
  selectedHomeCategory,
  setHoveredCategory,
  setSelectedHomeCategory
}: CategoryLegendProps) {
  if (categories.length === 0) {
    return <div className="empty-state">No spending categories found for this period.</div>;
  }

  return (
    <div className="legend-list">
      {categories.map((item) => (
        <CategoryLegendRow
          chartTotal={chartTotal}
          hoveredCategory={hoveredCategory}
          item={item}
          key={item.category}
          selectedHomeCategory={selectedHomeCategory}
          setHoveredCategory={setHoveredCategory}
          setSelectedHomeCategory={setSelectedHomeCategory}
        />
      ))}
    </div>
  );
}

function CategoryLegendRow({
  chartTotal,
  hoveredCategory,
  item,
  selectedHomeCategory,
  setHoveredCategory,
  setSelectedHomeCategory
}: {
  chartTotal: number;
  hoveredCategory: string | null;
  item: { category: string; amount: number };
  selectedHomeCategory: string | null;
  setHoveredCategory: (category: string | null) => void;
  setSelectedHomeCategory: (category: string | null) => void;
}) {
  const categoryColor = getCategoryColor(item.category);
  const legendBarStyle = getLegendBarStyle(item, chartTotal, categoryColor);
  const legendRowClassName = getLegendRowClassName(item.category, selectedHomeCategory, hoveredCategory);
  const toggleCategory = () => setSelectedHomeCategory(getNextSelectedCategory(item.category, selectedHomeCategory));
  const setHovered = () => setHoveredCategory(item.category);
  const clearHovered = () => setHoveredCategory(null);
  const legendDotStyle = getLegendDotStyle(categoryColor);

  return (
    <button
      className={legendRowClassName}
      onMouseEnter={setHovered}
      onMouseLeave={clearHovered}
      onFocus={setHovered}
      onBlur={clearHovered}
      onClick={toggleCategory}
      type="button"
    >
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
    </button>
  );
}

function getBalanceLabel(availableBalance: number | null) {
  return availableBalance === null ? "Loading" : formatMoney(availableBalance, true);
}

function getLoadingClassName(baseClassName: string, isLoading: boolean) {
  return clsx(baseClassName, isLoading && "is-loading");
}

function getCategoryColor(category: string) {
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

function getLegendRowClassName(category: string, selectedHomeCategory: string | null, hoveredCategory: string | null) {
  return clsx("legend-row", selectedHomeCategory === category && "selected", hoveredCategory === category && "hovered");
}

function getNextSelectedCategory(category: string, selectedHomeCategory: string | null) {
  return selectedHomeCategory === category ? null : category;
}
