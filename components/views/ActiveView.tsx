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
          accountOptions={props.accountOptions}
          categoryColors={props.categoryColors}
          categoryOptions={props.transactionCategoryOptions}
          dateRange={props.transactionDateRange}
          hasMoreTransactions={props.transactionsHasMore}
          isLoadingAllTransactions={props.isLoadingAllTransactions}
          isLoadingMoreTransactions={props.isLoadingMoreTransactions}
          isLoadingTransactions={props.isLoadingTransactions}
          onCategoryChange={props.onCategoryChange}
          onCreateCategory={props.onCreateCategory}
          onDateRangeChange={props.setTransactionDateRange}
          onLoadAllTransactions={props.onLoadAllTransactions}
          onLoadMoreTransactions={props.onLoadMoreTransactions}
          query={props.query}
          setQuery={props.setQuery}
          setTransactionAccounts={props.setTransactionAccounts}
          setTransactionCategory={props.setTransactionCategory}
          setTransactionFilter={props.setTransactionFilter}
          setTransactionSort={props.setTransactionSort}
          transactionAccounts={props.transactionAccounts}
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
          isLoadingTransactions={props.isLoadingCardFitTransactions}
        />
      );
    case "connect":
      return (
        <ConnectView
          completeAkahuConnection={props.completeAkahuConnection}
          manualTokens={props.manualTokens}
          onManualTokensChange={props.onManualTokensChange}
          setSyncResult={props.setSyncResult}
          syncResult={props.syncResult}
        />
      );
    case "settings":
      return (
        <SettingsView
          akahuDataFreshness={props.akahuDataFreshness}
          categoryColors={props.categoryColors}
          dataMode={props.dataMode}
          dashboardPeriod={props.dashboardPeriod}
          defaultCategories={props.settingsCategoryOptions}
          deleteCategory={props.deleteCategory}
          driveBackup={props.driveBackup}
          onConnectDriveBackup={props.onConnectDriveBackup}
          onDisconnectDriveBackup={props.onDisconnectDriveBackup}
          onRestoreDriveBackup={props.onRestoreDriveBackup}
          showDashboardPeriodSetting={props.showDashboardPeriodSetting}
          setDashboardPeriod={props.setDashboardPeriod}
          updateCategoryColor={props.updateCategoryColor}
        />
      );
    default:
      return (
        <section className="view-stack">
          <HomeView
            averageDailySpend={props.averageDailySpend}
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
            setActiveView={props.setActiveView}
            setHoveredCategory={props.setHoveredCategory}
            setPayday={props.setPayday}
            transactionPreview={props.transactionPreview}
          />
        </section>
      );
  }
}
