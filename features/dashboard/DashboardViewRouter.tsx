import { BudgetsPage } from "@/features/budgets/BudgetsPage";
import { CardFitPage } from "@/features/card-fit/CardFitPage";
import { ConnectPage } from "@/features/connect/ConnectPage";
import { HomePage } from "@/features/home/HomePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";

import type { Budget, CardFitBasis, CardFitExplanation, CardValue, PeriodOption, RecurringMerchant, Transaction, TransactionDateRange } from "@/lib/types";
import type { CategoryEditScope } from "@/lib/category-rules";
import type { DriveBackupState } from "@/hooks/useDriveBackup";
import type { AkahuDataFreshness, TransactionAccountOption, TransactionFilter, TransactionSort, View } from "@/lib/app/types";
import type { AkahuManualTokens } from "@/hooks/useAkahuConnection";

export type SharedDashboardPageProps = {
  activeView: View;
  categoryColors: Record<string, string>;
  isConnected: boolean;
  isLoadingTransactions: boolean;
  setActiveView: (view: View) => void;
};

export type HomePageStateProps = {
  averageDailySpend: number;
  availableBalance: number | null;
  chartCategories: { category: string; amount: number }[];
  chartTotal: number;
  expensesCount: number;
  hoveredCategory: string | null;
  income: number;
  insights: string[];
  monthlySpend: number;
  payday: string;
  paydayPatternDate: string;
  reviewCount: number;
  setHoveredCategory: (category: string | null) => void;
  setPayday: (payday: string) => void;
  transactionPreview: Transaction[];
};

export type TransactionsPageStateProps = {
  accountOptions: TransactionAccountOption[];
  isLoadingAllTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  onCreateCategory: (category: string) => void;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onLoadAllTransactions: () => void;
  onLoadMoreTransactions: () => void;
  query: string;
  setQuery: (query: string) => void;
  setTransactionAccounts: (accounts: string[]) => void;
  setTransactionCategory: (categories: string[]) => void;
  setTransactionDateRange: (dateRange: TransactionDateRange) => void;
  setTransactionFilter: (filter: TransactionFilter) => void;
  setTransactionSort: (sort: TransactionSort) => void;
  syncResult: string;
  transactionAccounts: string[];
  transactionCategory: string[];
  transactionCategoryOptions: string[];
  transactionDateRange: TransactionDateRange;
  transactionFilter: TransactionFilter;
  transactionsHasMore: boolean;
  transactionSort: TransactionSort;
  visibleTransactions: Transaction[];
};

export type BudgetsPageStateProps = {
  budgets: Budget[];
  categories: { category: string; amount: number }[];
  onRecurringClick: (merchant: string) => void;
  recurring: RecurringMerchant[];
};

export type CardFitPageStateProps = {
  cardBasis: CardFitBasis;
  cardFitSourceLabel: string;
  cardFitWindowLabel: string;
  cardFitExplanation: CardFitExplanation | null;
  cards: CardValue[];
  hasCardEligibleSpend: boolean;
  isLoadingCardFitTransactions: boolean;
};

export type ConnectPageStateProps = {
  completeAkahuConnection: (tokens?: AkahuManualTokens) => Promise<void>;
  manualTokens: AkahuManualTokens;
  onManualTokensChange: (tokens: AkahuManualTokens) => void;
  setSyncResult: (value: string) => void;
  syncResult: string;
};

export type SettingsPageStateProps = {
  akahuDataFreshness: AkahuDataFreshness;
  dataMode: "user" | "demo";
  dashboardPeriod: PeriodOption;
  driveBackup: DriveBackupState;
  onConnectDriveBackup: () => Promise<void>;
  onDisconnectDriveBackup: () => void;
  onRestoreDriveBackup: () => Promise<void>;
  showDashboardPeriodSetting: boolean;
  setDashboardPeriod: (period: PeriodOption) => void;
  settingsCategoryOptions: string[];
  updateCategoryColor: (category: string, color: string) => void;
  deleteCategory: (category: string) => void;
};

// Complete page state passed from useNetlyApp into DashboardViewRouter and its child pages.
export type DashboardViewRouterProps = SharedDashboardPageProps
  & HomePageStateProps
  & TransactionsPageStateProps
  & BudgetsPageStateProps
  & CardFitPageStateProps
  & ConnectPageStateProps
  & SettingsPageStateProps
  & {
    onReviewNeedsReview: () => void;
  };

// Chooses the live page component from the active view value produced by routing/sidebar state.
export function DashboardViewRouter(props: DashboardViewRouterProps) {
  switch (props.activeView) {
    case "transactions":
      return (
        <TransactionsPage
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
      return <BudgetsPage budgets={props.budgets} categories={props.categories} categoryColors={props.categoryColors} onRecurringClick={props.onRecurringClick} recurring={props.recurring} />;
    case "cards":
      return (
        <CardFitPage
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
        <ConnectPage
          completeAkahuConnection={props.completeAkahuConnection}
          manualTokens={props.manualTokens}
          onManualTokensChange={props.onManualTokensChange}
          setSyncResult={props.setSyncResult}
          syncResult={props.syncResult}
        />
      );
    case "settings":
      return (
        <SettingsPage
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
          <HomePage
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
