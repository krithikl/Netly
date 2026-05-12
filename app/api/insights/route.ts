import { NextResponse } from "next/server";
import { cardProducts, currentBalance, transactions } from "@/lib/mock-data";
import {
  annualCardValues,
  detectRecurring,
  generateInsights,
  safeToSpend,
  spendByCategory
} from "@/lib/insights";

// Legacy/demo insights endpoint that returns mock-derived dashboard data.
export function GET() {
  return NextResponse.json({
    categories: spendByCategory(transactions),
    recurring: detectRecurring(transactions),
    safeToSpend: safeToSpend(transactions, currentBalance),
    cardValues: annualCardValues(transactions, cardProducts),
    insights: generateInsights(transactions, cardProducts, currentBalance)
  });
}
