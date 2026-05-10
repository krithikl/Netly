import type { CardFitBasis, CardProduct, CardValue, RecurringMerchant, Transaction } from "./types";
import {
  getTransactionCategory,
  getTransactionDate,
  getTransactionMerchant,
  getTransactionStatus
} from "@/lib/transaction-display";

const cardExcludedCategories = new Set(["Housing", "Income", "Transfers", "Fees", "Needs review"]);
const cardFitWindowDays = 365;

export function formatMoney(amount: number, exact = false) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: exact ? 2 : 0
  }).format(amount);
}

export function debitTransactions(transactions: Transaction[]) {
  return transactions.filter((txn) => txn.amount < 0);
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

// Groups spending by category and puts the biggest categories first
export function spendByCategory(transactions: Transaction[]) {
  const totals = new Map<string, number>();

  debitTransactions(transactions).forEach((txn) => {
    const category = getTransactionCategory(txn);
    totals.set(category, (totals.get(category) || 0) + Math.abs(txn.amount));
  });

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// Finds merchants that appear more than once and estimates their average cost
export function detectRecurring(transactions: Transaction[]): RecurringMerchant[] {
  const byMerchant = new Map<string, Transaction[]>();

  debitTransactions(transactions).forEach((txn) => {
    const merchant = getTransactionMerchant(txn);
    byMerchant.set(merchant, [...(byMerchant.get(merchant) || []), txn]);
  });

  return [...byMerchant.entries()]
    .filter(([, txns]) => txns.length > 1)
    .map(([merchant, txns]) => ({
      merchant,
      category: getTransactionCategory(txns[0]),
      count: txns.length,
      average: sum(txns.map((txn) => Math.abs(txn.amount))) / txns.length
    }))
    .sort((a, b) => b.average - a.average);
}

// Estimates money left after likely bills and a fixed buffer
export function safeToSpend(transactions: Transaction[], currentBalance: number) {
  const expectedBills = detectRecurring(transactions)
    .filter((item) => item.category !== "Groceries" && item.category !== "Fuel")
    .reduce((total, item) => total + item.average, 0);

  return Math.max(currentBalance - expectedBills - 250, 0);
}

// Works out the spend that can count toward card rewards
export function cardFitBasis(transactions: Transaction[], windowDays = cardFitWindowDays): CardFitBasis {
  const debits = debitTransactions(transactions)
    .filter((txn) => getTransactionStatus(txn) !== "Upcoming")
    .filter((txn) => !Number.isNaN(Date.parse(getTransactionDate(txn))));
  const latestTime = Math.max(...debits.map((txn) => Date.parse(getTransactionDate(txn))));
  const latestTransactionDate = Number.isFinite(latestTime) ? new Date(latestTime).toISOString().slice(0, 10) : null;
  const windowStart = Number.isFinite(latestTime) ? latestTime - (windowDays - 1) * 24 * 60 * 60 * 1000 : 0;
  const windowTransactions = Number.isFinite(latestTime) ? debits.filter((txn) => Date.parse(getTransactionDate(txn)) >= windowStart) : [];
  const eligibleTransactions = windowTransactions.filter((txn) => !cardExcludedCategories.has(getTransactionCategory(txn)));
  const eligibleSpend = sum(eligibleTransactions.map((txn) => Math.abs(txn.amount)));
  const categoryTotals = new Map<string, number>();

  eligibleTransactions.forEach((txn) => {
    const category = getTransactionCategory(txn);
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(txn.amount));
  });

  const eligibleAnnualSpend = eligibleSpend;

  return {
    windowDays,
    transactionCount: windowTransactions.length,
    eligibleTransactionCount: eligibleTransactions.length,
    excludedTransactionCount: windowTransactions.length - eligibleTransactions.length,
    eligibleSpend,
    eligibleAnnualSpend,
    latestTransactionDate,
    categories: [...categoryTotals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  };
}

// Ranks cards by rewards, perks, and fees
export function annualCardValues(transactions: Transaction[], cardProducts: CardProduct[]): CardValue[] {
  const basis = cardFitBasis(transactions);
  const eligibleAnnualSpend = basis.eligibleAnnualSpend;

  return cardProducts
    .map((card) => {
      const grossRewards = eligibleAnnualSpend * card.cashbackRate;

      return {
        ...card,
        grossRewards,
        eligibleAnnualSpend,
        annualValue: grossRewards + card.perksValue - card.annualFee
      };
    })
    .sort((a, b) => b.annualValue - a.annualValue);
}

// Returns the card spend estimate and ranked card list together
export function calculateCardFit(transactions: Transaction[], cardProducts: CardProduct[]) {
  return {
    basis: cardFitBasis(transactions),
    cards: annualCardValues(transactions, cardProducts)
  };
}

// Builds the short insight messages shown on the dashboard
export function generateInsights(transactions: Transaction[], cardProducts: CardProduct[], currentBalance: number) {
  const categories = spendByCategory(transactions);
  const recurring = detectRecurring(transactions);
  const bestCard = annualCardValues(transactions, cardProducts)[0];
  const top = categories[0];

  const topInsight = top
    ? `${top.category} is your largest spend category at ${formatMoney(top.amount)} this period.`
    : "No spending categories were detected in this period.";

  const recurringInsight = recurring.length
    ? `${recurring.length} recurring merchants were detected from repeated payments.`
    : "No recurring spending was detected in this period.";

  const cardInsight = bestCard
    ? `${bestCard.name} has the strongest estimated annual value at ${formatMoney(bestCard.annualValue)}.`
    : "No card value recommendation is available yet.";

  return [
    topInsight,
    recurringInsight,
    cardInsight,
    `${formatMoney(safeToSpend(transactions, currentBalance))} looks safe to spend after likely bills and a buffer.`
  ];
}
