import assert from "node:assert/strict";
import { test } from "node:test";
import { filterTransactionsByPeriod } from "../lib/periods.ts";

test("This month uses the current calendar month instead of the latest transaction month", () => {
  const transactions = [
    getTransaction("may-food", "2026-05-31"),
    getTransaction("june-food", "2026-06-01"),
    getTransaction("future-food", "2026-06-02")
  ];

  assert.deepEqual(
    filterTransactionsByPeriod(transactions, "This month", new Date("2026-06-01T12:00:00")).map((transaction) => transaction._id),
    ["june-food"]
  );
});

test("rolling dashboard periods end on the current calendar day", () => {
  const transactions = [
    getTransaction("before-30", "2026-05-01"),
    getTransaction("start-30", "2026-05-02"),
    getTransaction("start-90", "2026-03-03"),
    getTransaction("before-90", "2026-03-02"),
    getTransaction("today", "2026-06-01"),
    getTransaction("future", "2026-06-02")
  ];
  const referenceDate = new Date("2026-06-01T12:00:00");

  assert.deepEqual(
    filterTransactionsByPeriod(transactions, "30 days", referenceDate).map((transaction) => transaction._id),
    ["start-30", "today"]
  );
  assert.deepEqual(
    filterTransactionsByPeriod(transactions, "90 days", referenceDate).map((transaction) => transaction._id),
    ["before-30", "start-30", "start-90", "today"]
  );
});

test("All dashboard period keeps every transaction unchanged", () => {
  const transactions = [
    getTransaction("old", "2025-01-01"),
    getTransaction("future", "2026-06-02")
  ];

  assert.equal(filterTransactionsByPeriod(transactions, "All", new Date("2026-06-01T12:00:00")), transactions);
});

function getTransaction(id, date) {
  return {
    _id: id,
    amount: -10,
    category: {
      groups: {
        personal_finance: {
          name: "Food"
        }
      },
      name: "Food"
    },
    date,
    description: id
  };
}
