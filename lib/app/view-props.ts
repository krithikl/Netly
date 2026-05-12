import type { Budget, CardFitBasis, CardFitExplanation, CardValue, RecurringMerchant, Transaction, TransactionDateRange } from "@/lib/types";
import type { TransactionFilter, TransactionSort, View } from "@/lib/app/types";

export type SharedViewProps = {
  activeView: View;
  categoryColors: Record<string, string>;
  isConnected: boolean;
  isLoadingTransactions: boolean;
  setActiveView: (view: View) => void;
};

export type HomeViewStateProps = {
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
  safeToSpendAmount: number;
  setHoveredCategory: (category: string | null) => void;
  setPayday: (payday: string) => void;
  transactionPreview: Transaction[];
};

export type TransactionsViewStateProps = {
  isLoadingMoreTransactions: boolean;
  onCreateCategory: (category: string) => void;
  onCategoryChange: (transactionId: string, category: string) => void;
  onLoadMoreTransactions: () => void;
  onRefreshUserTransactions: () => void;
  query: string;
  setQuery: (query: string) => void;
  setTransactionCategory: (categories: string[]) => void;
  setTransactionDateRange: (dateRange: TransactionDateRange) => void;
  setTransactionFilter: (filter: TransactionFilter) => void;
  setTransactionSort: (sort: TransactionSort) => void;
  syncResult: string;
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
};

export type ConnectViewStateProps = {
  completeAkahuConnection: (responseValue?: string) => Promise<void>;
  connectionResponse: string;
  onConnectionResponseChange: (value: string) => void;
  setSyncResult: (value: string) => void;
  syncResult: string;
};

export type SettingsViewStateProps = {
  updateCategoryColor: (category: string, color: string) => void;
  deleteCategory: (category: string) => void;
};

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
