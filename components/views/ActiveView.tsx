import { BudgetsView } from "@/components/views/BudgetsView";
import { CardFitView } from "@/components/views/CardFitView";
import { ConnectView } from "@/components/views/ConnectView";
import { HomeView } from "@/components/views/HomeView";
import { PaymentTestView } from "@/components/views/PaymentTestView";
import { SettingsView } from "@/components/views/SettingsView";
import { TransactionsView } from "@/components/views/TransactionsView";
import type { ActiveViewProps } from "@/lib/app/view-props";

export function ActiveView(props: ActiveViewProps) {
  switch (props.activeView) {
    case "transactions":
      return (
        <TransactionsView
          categoryColors={props.categoryColors}
          categoryOptions={props.transactionCategoryOptions}
          isLoadingTransactions={props.isLoadingTransactions}
          onCategoryChange={props.onCategoryChange}
          onCreateCategory={props.onCreateCategory}
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
      return <BudgetsView budgets={props.budgets} categories={props.categories} categoryColors={props.categoryColors} recurring={props.recurring} />;
    case "cards":
      return (
        <CardFitView
          basis={props.cardBasis}
          cardFitSourceLabel={props.cardFitSourceLabel}
          cardFitWindowLabel={props.cardFitWindowLabel}
          cards={props.cards}
          hasCardEligibleSpend={props.hasCardEligibleSpend}
        />
      );
    case "payment":
      return (
        <PaymentTestView
          categoryColors={props.categoryColors}
          isLoadingTransactions={props.isLoadingTransactions}
          isStartingPaymentTest={props.isStartingPaymentTest}
          onRefreshTransactions={props.onRefreshUserTransactions}
          onStartPaymentTest={props.onStartPaymentTest}
          paymentBalanceDelta={props.paymentBalanceDelta}
          paymentFeedNote={props.paymentFeedNote}
          paymentTestForm={props.paymentTestForm}
          paymentTestHelp={props.paymentTestHelp}
          paymentTestResult={props.paymentTestResult}
          paymentTransactionDelta={props.paymentTransactionDelta}
          recentTransactions={props.workingTransactions.slice(0, 6)}
          syncResult={props.syncResult}
          updatePaymentTestForm={props.updatePaymentTestForm}
        />
      );
    case "connect":
      return (
        <ConnectView
          completeOpenBankingConnection={props.completeOpenBankingConnection}
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
            reviewCount={props.reviewCount}
            safeToSpendAmount={props.safeToSpendAmount}
            setActiveView={props.setActiveView}
            setHoveredCategory={props.setHoveredCategory}
            transactionPreview={props.transactionPreview}
            upcomingCount={props.upcomingCount}
            upcomingTotal={props.upcomingTotal}
          />
        </section>
      );
  }
}
