import type { Budget, CardFitBasis, CardFitExplanation, CardValue, PeriodOption, RecurringMerchant, Transaction, TransactionDateRange } from "@/lib/types";
import type { CategoryEditScope } from "@/lib/category-rules";
import type { DriveBackupState } from "@/hooks/useDriveBackup";
import type { AkahuDataFreshness, TransactionAccountOption, TransactionFilter, TransactionSort, View } from "@/lib/app/types";
import type { AkahuManualTokens } from "@/hooks/useAkahuConnection";

export type SharedViewProps = {
  activeView: View;
  categoryColors: Record<string, string>;
  isConnected: boolean;
  isLoadingTransactions: boolean;
  setActiveView: (view: View) => void;
};

export type HomeViewStateProps = {
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
  safeToSpendAmount: number | null;
  setHoveredCategory: (category: string | null) => void;
  setPayday: (payday: string) => void;
  transactionPreview: Transaction[];
};

export type TransactionsViewStateProps = {
  accountOptions: TransactionAccountOption[];
  isLoadingAllTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  onCreateCategory: (category: string) => void;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onLoadAllTransactions: () => void;
  onLoadMoreTransactions: () => void;
  onRefreshUserTransactions: () => void;
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
  workingTransactions: Transaction[];
};

export type BudgetsViewStateProps = {
  budgets: Budget[];
  categories: { category: string; amount: number }[];
  onRecurringClick: (merchant: string) => void;
  recurring: RecurringMerchant[];
};

export type CardFitViewStateProps = {
  cardBasis: CardFitBasis;
  cardFitSourceLabel: string;
  cardFitWindowLabel: string;
  cardFitExplanation: CardFitExplanation | null;
  cards: CardValue[];
  hasCardEligibleSpend: boolean;
  isLoadingCardFitTransactions: boolean;
};

export type ConnectViewStateProps = {
  completeAkahuConnection: (tokens?: AkahuManualTokens) => Promise<void>;
  manualTokens: AkahuManualTokens;
  onManualTokensChange: (tokens: AkahuManualTokens) => void;
  setSyncResult: (value: string) => void;
  syncResult: string;
};

export type SettingsViewStateProps = {
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

// Complete view model passed from useNetlyApp into ActiveView and its child screens.
export type ActiveViewProps = SharedViewProps
  & HomeViewStateProps
  & TransactionsViewStateProps
  & BudgetsViewStateProps
  & CardFitViewStateProps
  & ConnectViewStateProps
  & SettingsViewStateProps
  & {
    onReviewNeedsReview: () => void;
  };
