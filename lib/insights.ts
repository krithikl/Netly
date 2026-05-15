import type { CardFitBasis, CardFitDriver, CardFitExplanation, CardProduct, CardValue, RecurringMerchant, Transaction } from "./types";
import {
  getTransactionCategory,
  getTransactionDate,
  getTransactionMerchant,
  getTransactionStatus
} from "@/lib/transaction-display";
import { categoriesMatch, getRawAkahuCategory, getRawAkahuPersonalFinanceCategory, normalizeCategoryLabel } from "@/lib/category-rules";
import { needsReviewCategory } from "@/lib/categories";

const cardExcludedAkahuGroups = new Set(["Housing"]);
const cardExcludedAkahuCategories = [
  "Cash withdrawals",
  "Debt repayments",
  "Foreign exchange and money transfer services",
  "Rent for permanent accommodation",
  "Student loans",
  "Tax payments"
];
const cardExcludedTransactionTypeTerms = ["atm", "cash withdrawal", "loan", "tax", "transfer"];
const cardFitWindowDays = 365;
const defaultComparisonCardName = "Current debit card baseline";
const cardFitDriverLimit = 3;
const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, exact = false) {
  return getMoneyFormatter(exact).format(amount);
}

export function debitTransactions(transactions: Transaction[]) {
  return transactions.filter((txn) => txn.amount < 0);
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

// Groups spending by category and puts the biggest categories first
// Aggregates transaction spend by category for charts and budgets.
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
// Detects recurring merchants for the Budgets view.
export function detectRecurring(transactions: Transaction[]): RecurringMerchant[] {
  const byMerchant = new Map<string, Transaction[]>();

  debitTransactions(transactions).forEach((txn) => {
    const merchant = getTransactionMerchant(txn);
    const merchantTransactions = byMerchant.get(merchant);

    if (merchantTransactions) {
      merchantTransactions.push(txn);
    } else {
      byMerchant.set(merchant, [txn]);
    }
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
  const expectedRecurringOutgoings = detectRecurring(transactions)
    .filter((item) => item.category !== "Food" && item.category !== "Transport")
    .reduce((total, item) => total + item.average, 0);

  return Math.max(currentBalance - expectedRecurringOutgoings - 250, 0);
}

// Works out the spend that can count toward card rewards
export function cardFitBasis(transactions: Transaction[], windowDays = cardFitWindowDays): CardFitBasis {
  const debitEntries = transactions.reduce<Array<{ transaction: Transaction; time: number }>>((entries, transaction) => {
    if (transaction.amount >= 0 || getTransactionStatus(transaction) !== "Booked") {
      return entries;
    }

    const time = Date.parse(getTransactionDate(transaction));

    if (Number.isFinite(time)) {
      entries.push({ transaction, time });
    }

    return entries;
  }, []);
  const latestTime = Math.max(...debitEntries.map((entry) => entry.time));
  const latestTransactionDate = Number.isFinite(latestTime) ? new Date(latestTime).toISOString().slice(0, 10) : null;
  const windowStart = Number.isFinite(latestTime) ? latestTime - (windowDays - 1) * 24 * 60 * 60 * 1000 : 0;
  const windowEntries = Number.isFinite(latestTime) ? debitEntries.filter((entry) => entry.time >= windowStart) : [];
  const categoryTotals = new Map<string, number>();
  let eligibleTransactionCount = 0;
  let eligibleSpend = 0;

  windowEntries.forEach(({ transaction }) => {
    if (isCardExcludedTransaction(transaction)) {
      return;
    }

    const category = getTransactionCategory(transaction);
    const amount = Math.abs(transaction.amount);
    eligibleTransactionCount += 1;
    eligibleSpend += amount;
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
  });

  const eligibleAnnualSpend = eligibleSpend;

  return {
    windowDays,
    transactionCount: windowEntries.length,
    eligibleTransactionCount,
    excludedTransactionCount: windowEntries.length - eligibleTransactionCount,
    eligibleSpend,
    eligibleAnnualSpend,
    latestTransactionDate,
    categories: [...categoryTotals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  };
}

function isCardExcludedTransaction(transaction: Transaction) {
  if (getTransactionCategory(transaction) === needsReviewCategory) {
    return true;
  }

  const rawGroup = getRawAkahuPersonalFinanceCategory(transaction);
  const rawCategory = getRawAkahuCategory(transaction);

  if ([...cardExcludedAkahuGroups].some((group) => categoriesMatch(rawGroup, group))) {
    return true;
  }

  if (cardExcludedAkahuCategories.some((category) => categoriesMatch(rawCategory, category))) {
    return true;
  }

  const transactionType = normalizeCategoryLabel(transaction.type);

  return cardExcludedTransactionTypeTerms.some((term) => transactionType.includes(term));
}

// Ranks cards by rewards, perks, and fees
export function annualCardValues(transactions: Transaction[], cardProducts: CardProduct[]): CardValue[] {
  const basis = cardFitBasis(transactions);

  return annualCardValuesForBasis(basis, cardProducts);
}

function annualCardValuesForBasis(basis: CardFitBasis, cardProducts: CardProduct[]): CardValue[] {
  return cardProducts
    .map((card) => getAnnualCardValue(card, basis.eligibleAnnualSpend))
    .sort(compareCardValues);
}

// Returns the card spend estimate and ranked card list together
// Ranks cards by estimated annual value from eligible transaction spend.
export function calculateCardFit(transactions: Transaction[], cardProducts: CardProduct[], comparisonCard?: CardProduct) {
  const basis = cardFitBasis(transactions);
  const cards = annualCardValuesForBasis(basis, cardProducts);
  const comparisonCardValue = comparisonCard
    ? getAnnualCardValue(comparisonCard, basis.eligibleAnnualSpend)
    : getDefaultComparisonCard(cards);

  return {
    basis,
    cards,
    explanation: buildCardFitExplanation(basis, cards, comparisonCardValue)
  };
}

function getAnnualCardValue(card: CardProduct, eligibleAnnualSpend: number): CardValue {
  const grossRewards = eligibleAnnualSpend * card.cashbackRate;
  const perksValue = getCardPerksValue(card);

  return {
    ...card,
    perksValue,
    grossRewards,
    eligibleAnnualSpend,
    annualValue: grossRewards + perksValue - card.annualFee
  };
}

function compareCardValues(a: CardValue, b: CardValue) {
  if (isCardAvailable(a) !== isCardAvailable(b)) {
    return isCardAvailable(a) ? -1 : 1;
  }

  return b.annualValue - a.annualValue;
}

function isCardAvailable(card: CardProduct) {
  return card.availability !== "unavailable";
}

function getCardPerksValue(card: CardProduct) {
  return sum(card.perks
    .filter((perk) => perk.counted)
    .map((perk) => perk.estimatedAnnualValue ?? 0));
}

function buildCardFitExplanation(
  basis: CardFitBasis,
  cards: CardValue[],
  comparisonCard: CardValue | undefined
): CardFitExplanation | null {
  const recommendedCard = cards[0];

  if (!recommendedCard || !comparisonCard || basis.eligibleAnnualSpend <= 0 || basis.eligibleTransactionCount <= 0) {
    return null;
  }

  const grossRewardsDelta = recommendedCard.grossRewards - comparisonCard.grossRewards;
  const perksDelta = recommendedCard.perksValue - comparisonCard.perksValue;
  const annualFeeDelta = comparisonCard.annualFee - recommendedCard.annualFee;

  return {
    recommendedCardName: recommendedCard.name,
    comparisonCardName: comparisonCard.name,
    annualDelta: recommendedCard.annualValue - comparisonCard.annualValue,
    grossRewardsDelta,
    perksDelta,
    annualFeeDelta,
    drivers: getCardFitDrivers(basis, recommendedCard)
  };
}

function getDefaultComparisonCard(cards: CardValue[]) {
  return cards.find((card) => card.name === defaultComparisonCardName)
    || cards.find((card) => card.tier === "Debit" && card.cashbackRate === 0 && card.annualFee === 0)
    || cards[0];
}

function getCardFitDrivers(basis: CardFitBasis, recommendedCard: CardValue): CardFitDriver[] {
  return basis.categories
    .slice(0, cardFitDriverLimit)
    .map((item) => ({
      category: item.category,
      annualSpend: item.amount,
      estimatedRewardValue: item.amount * recommendedCard.cashbackRate,
      shareOfEligibleSpend: basis.eligibleAnnualSpend > 0 ? item.amount / basis.eligibleAnnualSpend : 0
    }));
}

// Builds the short insight messages shown on the dashboard
// Builds the short insight strings shown on the Home dashboard.
export function generateInsights(transactions: Transaction[], cardProducts: CardProduct[], currentBalance: number | null) {
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
    getSafeToSpendInsight(transactions, currentBalance)
  ];
}

function getSafeToSpendInsight(transactions: Transaction[], currentBalance: number | null) {
  if (currentBalance === null) {
    return "Safe-to-spend will update after Akahu returns the current account balance.";
  }

  return `${formatMoney(safeToSpend(transactions, currentBalance))} looks safe to spend after likely bills and a buffer.`;
}

function getMoneyFormatter(exact: boolean) {
  const key = exact ? "exact" : "rounded";
  const formatter = moneyFormatters.get(key);

  if (formatter) {
    return formatter;
  }

  const nextFormatter = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: exact ? 2 : 0
  });

  moneyFormatters.set(key, nextFormatter);
  return nextFormatter;
}
