import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBudgetCategoryBreakdown,
  getBudgetChartCategories,
  getBudgetDaysLeft,
  getBudgetHistoryPeriodSnapshots,
  getBudgetPeriod,
  getBudgetPeriodProgress,
  getBudgetPeriodTransactions,
  getBudgetTransactionsInPeriod,
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

test("budget periods support monthly yearly weekly and anchored fortnightly resets", () => {
  const referenceDate = new Date("2026-05-24T12:00:00");
  const monthlyPeriod = getBudgetPeriod("monthly", "2026-05-01", referenceDate);
  const yearlyPeriod = getBudgetPeriod("yearly", "2026-01-01", referenceDate);
  const weeklyPeriod = getBudgetPeriod("weekly", "2026-05-20", referenceDate);
  const fortnightlyPeriod = getBudgetPeriod("fortnightly", "2026-05-10", referenceDate);

  assert.equal(toInputDate(monthlyPeriod.startDate), "2026-05-01");
  assert.equal(toInputDate(monthlyPeriod.endDate), "2026-05-31");
  assert.equal(toInputDate(monthlyPeriod.filterEndDate), "2026-05-24");
  assert.equal(toInputDate(yearlyPeriod.startDate), "2026-01-01");
  assert.equal(toInputDate(yearlyPeriod.endDate), "2026-12-31");
  assert.equal(toInputDate(yearlyPeriod.filterEndDate), "2026-05-24");
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

test("budget history snapshots include completed periods with frozen budget config", () => {
  const snapshots = getBudgetHistoryPeriodSnapshots({
    categoryNames: ["Food", "Transport"],
    cadence: "monthly",
    createdAt: "2026-02-14",
    id: "budget-spending",
    limit: 800,
    name: "Spending money",
    periodAnchorDate: "2026-02-14"
  }, new Date("2026-05-24T12:00:00"));

  assert.deepEqual(snapshots.map((snapshot) => ({
    id: snapshot.id,
    periodEndDate: snapshot.periodEndDate,
    periodStartDate: snapshot.periodStartDate
  })), [
    {
      id: "budget-spending:2026-02-01:2026-02-28",
      periodEndDate: "2026-02-28",
      periodStartDate: "2026-02-01"
    },
    {
      id: "budget-spending:2026-03-01:2026-03-31",
      periodEndDate: "2026-03-31",
      periodStartDate: "2026-03-01"
    },
    {
      id: "budget-spending:2026-04-01:2026-04-30",
      periodEndDate: "2026-04-30",
      periodStartDate: "2026-04-01"
    }
  ]);
  assert.deepEqual(snapshots[0].categoryNames, ["Food", "Transport"]);
  assert.equal(snapshots[0].limit, 800);
});

test("budget history snapshots start at the active cadence history start", () => {
  const snapshots = getBudgetHistoryPeriodSnapshots({
    categoryNames: ["Food"],
    cadence: "weekly",
    createdAt: "2026-05-15",
    id: "budget-spending",
    limit: 200,
    name: "Spending money",
    periodAnchorDate: "2026-05-15"
  }, new Date("2026-05-29T12:00:00"));

  assert.deepEqual(snapshots.map((snapshot) => ({
    id: snapshot.id,
    periodEndDate: snapshot.periodEndDate,
    periodStartDate: snapshot.periodStartDate
  })), [
    {
      id: "budget-spending:2026-05-15:2026-05-21",
      periodEndDate: "2026-05-21",
      periodStartDate: "2026-05-15"
    },
    {
      id: "budget-spending:2026-05-22:2026-05-28",
      periodEndDate: "2026-05-28",
      periodStartDate: "2026-05-22"
    }
  ]);
});

test("budget transactions can be filtered to an explicit historical range", () => {
  const transactions = [
    getTransaction("before", "Food", -10, "2026-04-30"),
    getTransaction("inside", "Food", -20, "2026-05-15"),
    getTransaction("after", "Food", -30, "2026-06-01")
  ];

  assert.deepEqual(
    getBudgetTransactionsInPeriod(transactions, {
      startDate: new Date("2026-05-01T12:00:00"),
      endDate: new Date("2026-05-31T12:00:00"),
      filterEndDate: new Date("2026-05-31T12:00:00")
    }).map((transaction) => transaction._id),
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
