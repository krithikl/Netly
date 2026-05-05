import type { CardProduct, CardValue, RecurringMerchant, Transaction } from "./types";

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

export function spendByCategory(transactions: Transaction[]) {
  const totals = new Map<string, number>();

  debitTransactions(transactions).forEach((txn) => {
    totals.set(txn.category, (totals.get(txn.category) || 0) + Math.abs(txn.amount));
  });

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function detectRecurring(transactions: Transaction[]): RecurringMerchant[] {
  const byMerchant = new Map<string, Transaction[]>();

  debitTransactions(transactions).forEach((txn) => {
    byMerchant.set(txn.merchant, [...(byMerchant.get(txn.merchant) || []), txn]);
  });

  return [...byMerchant.entries()]
    .filter(([, txns]) => txns.length > 1)
    .map(([merchant, txns]) => ({
      merchant,
      category: txns[0].category,
      count: txns.length,
      average: sum(txns.map((txn) => Math.abs(txn.amount))) / txns.length
    }))
    .sort((a, b) => b.average - a.average);
}

export function safeToSpend(transactions: Transaction[], currentBalance: number) {
  const expectedBills = detectRecurring(transactions)
    .filter((item) => item.category !== "Groceries" && item.category !== "Fuel")
    .reduce((total, item) => total + item.average, 0);

  return Math.max(currentBalance - expectedBills - 250, 0);
}

export function annualCardValues(transactions: Transaction[], cardProducts: CardProduct[]): CardValue[] {
  const eligibleMonthlySpend = debitTransactions(transactions)
    .filter((txn) => !["Housing", "Income", "Transfers", "Fees", "Needs review"].includes(txn.category))
    .reduce((total, txn) => total + Math.abs(txn.amount), 0);
  const eligibleAnnualSpend = eligibleMonthlySpend * 12;

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
