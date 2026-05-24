import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBudgetCategoryBreakdown,
  getBudgetChartCategories,
  getBudgetDaysLeft,
  getBudgetPeriod,
  getBudgetPeriodProgress,
  getBudgetPeriodTransactions,
  getBudgetSpendFromBreakdown
} from "../features/budgets/budgetLogic.ts";

test("budget breakdown aggregates selected debit categories with counts and shares", () => {
  const foodOlder = getTransaction("food-older", "Food", -35, "2026-05-10");
  const foodNewer = getTransaction("food-newer", "Food", -25, "2026-05-12");
  const transport = getTransaction("transport-1", "Transport", -40, "2026-05-11");
  const breakdown = getBudgetCategoryBreakdown([
    foodOlder,
    foodNewer,
    transport,
    getTransaction("income", "Food", 100),
    getTransaction("ignored", "Housing", -300)
  ], ["Food", "Transport", "Gifts"]);

  assert.deepEqual(breakdown.map(({ transactions, ...item }) => item), [
    {
      amount: 60,
      category: "Food",
      percentOfSpending: 0.6,
      transactionCount: 2
    },
    {
      amount: 40,
      category: "Transport",
      percentOfSpending: 0.4,
      transactionCount: 1
    }
  ]);
  assert.deepEqual(breakdown[0].transactions, [foodNewer, foodOlder]);
  assert.equal(breakdown[0].transactions[0], foodNewer);
  assert.deepEqual(breakdown[1].transactions, [transport]);
  assert.equal(getBudgetSpendFromBreakdown(breakdown), 100);
});

test("budget chart categories omit zero-spend rows", () => {
  const breakdown = getBudgetCategoryBreakdown([
    getTransaction("food", "Food", -10)
  ], ["Food", "Gifts"]);

  assert.deepEqual(getBudgetChartCategories(breakdown), [
    {
      amount: 10,
      category: "Food"
    }
  ]);
});

test("budget periods support monthly weekly and anchored fortnightly resets", () => {
  const referenceDate = new Date("2026-05-24T12:00:00");
  const monthlyPeriod = getBudgetPeriod("monthly", "2026-05-01", referenceDate);
  const weeklyPeriod = getBudgetPeriod("weekly", "2026-05-20", referenceDate);
  const fortnightlyPeriod = getBudgetPeriod("fortnightly", "2026-05-10", referenceDate);

  assert.equal(toInputDate(monthlyPeriod.startDate), "2026-05-01");
  assert.equal(toInputDate(monthlyPeriod.endDate), "2026-05-31");
  assert.equal(toInputDate(monthlyPeriod.filterEndDate), "2026-05-24");
  assert.equal(toInputDate(weeklyPeriod.startDate), "2026-05-20");
  assert.equal(toInputDate(weeklyPeriod.endDate), "2026-05-26");
  assert.equal(toInputDate(fortnightlyPeriod.startDate), "2026-05-24");
  assert.equal(toInputDate(fortnightlyPeriod.endDate), "2026-06-06");
  assert.equal(getBudgetDaysLeft(monthlyPeriod, referenceDate), 7);
  assert.equal(Math.round(getBudgetPeriodProgress(weeklyPeriod, referenceDate)), 67);
});

test("budget period transactions filter to the active cadence window", () => {
  const transactions = [
    getTransaction("before", "Food", -10, "2026-05-19"),
    getTransaction("inside", "Food", -20, "2026-05-22"),
    getTransaction("after", "Food", -30, "2026-05-27")
  ];

  assert.deepEqual(
    getBudgetPeriodTransactions(transactions, "weekly", "2026-05-20", new Date("2026-05-24T12:00:00")).map((transaction) => transaction._id),
    ["inside"]
  );
});

function getTransaction(id, category, amount, date = "2026-05-12") {
  return {
    _id: id,
    amount,
    category: {
      groups: {
        personal_finance: {
          name: category
        }
      },
      name: category
    },
    date,
    description: id
  };
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
