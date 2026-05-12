import { BudgetsView } from "@/components/views/BudgetsView";
import { CardFitView } from "@/components/views/CardFitView";
import { ConnectView } from "@/components/views/ConnectView";
import { HomeView } from "@/components/views/HomeView";
import { SettingsView } from "@/components/views/SettingsView";
import { TransactionsView } from "@/components/views/TransactionsView";
import type { ActiveViewProps } from "@/lib/app/view-props";

// Chooses the live page component from the active view value produced by routing/sidebar state.
export function ActiveView(props: ActiveViewProps) {
  switch (props.activeView) {
    case "transactions":
      return (
        <TransactionsView
          categoryColors={props.categoryColors}
          categoryOptions={props.transactionCategoryOptions}
          dateRange={props.transactionDateRange}
          hasMoreTransactions={props.transactionsHasMore}
          isLoadingMoreTransactions={props.isLoadingMoreTransactions}
          isLoadingTransactions={props.isLoadingTransactions}
          onCategoryChange={props.onCategoryChange}
          onCreateCategory={props.onCreateCategory}
          onDateRangeChange={props.setTransactionDateRange}
          onLoadMoreTransactions={props.onLoadMoreTransactions}
          query={props.query}
          setQuery={props.setQuery}
          setTransactionCategory={props.setTransactionCategory}
          setTransactionFilter={props.setTransactionFilter}
          setTransactionSort={props.setTransactionSort}
          transactionCategory={props.transactionCategory}
          transactionFilter={props.transactionFilter}
          transactionSort={props.transactionSort}
          transactions={props.visibleTransactions}
        />
      );
    case "budgets":
      return <BudgetsView budgets={props.budgets} categories={props.categories} categoryColors={props.categoryColors} onRecurringClick={props.onRecurringClick} recurring={props.recurring} />;
    case "cards":
      return (
        <CardFitView
          basis={props.cardBasis}
          explanation={props.cardFitExplanation}
          cardFitSourceLabel={props.cardFitSourceLabel}
          cardFitWindowLabel={props.cardFitWindowLabel}
          cards={props.cards}
          hasCardEligibleSpend={props.hasCardEligibleSpend}
        />
      );
    case "connect":
      return (
        <ConnectView
          completeAkahuConnection={props.completeAkahuConnection}
          connectionResponse={props.connectionResponse}
          onConnectionResponseChange={props.onConnectionResponseChange}
          setSyncResult={props.setSyncResult}
          syncResult={props.syncResult}
        />
      );
    case "settings":
      return (
        <SettingsView
          categoryColors={props.categoryColors}
          defaultCategories={props.transactionCategoryOptions}
          deleteCategory={props.deleteCategory}
          updateCategoryColor={props.updateCategoryColor}
        />
      );
    default:
      return (
        <section className="view-stack">
          <HomeView
            availableBalance={props.availableBalance}
            categoryColors={props.categoryColors}
            chartCategories={props.chartCategories}
            chartTotal={props.chartTotal}
            expensesCount={props.expensesCount}
            hoveredCategory={props.hoveredCategory}
            income={props.income}
            insights={props.insights}
            isConnected={props.isConnected}
            isLoadingTransactions={props.isLoadingTransactions}
            monthlySpend={props.monthlySpend}
            onReviewNeedsReview={props.onReviewNeedsReview}
            payday={props.payday}
            paydayPatternDate={props.paydayPatternDate}
            reviewCount={props.reviewCount}
            safeToSpendAmount={props.safeToSpendAmount}
            setActiveView={props.setActiveView}
            setHoveredCategory={props.setHoveredCategory}
            setPayday={props.setPayday}
            transactionPreview={props.transactionPreview}
          />
        </section>
      );
  }
}
