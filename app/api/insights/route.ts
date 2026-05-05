import { NextResponse } from "next/server";
import { cardProducts, currentBalance, transactions } from "@/lib/mock-data";
import {
  annualCardValues,
  detectRecurring,
  generateInsights,
  safeToSpend,
  spendByCategory
} from "@/lib/insights";

export function GET() {
  return NextResponse.json({
    categories: spendByCategory(transactions),
    recurring: detectRecurring(transactions),
    safeToSpend: safeToSpend(transactions, currentBalance),
    cardValues: annualCardValues(transactions, cardProducts),
    insights: generateInsights(transactions, cardProducts, currentBalance)
  });
}
