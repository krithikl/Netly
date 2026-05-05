import { NextRequest, NextResponse } from "next/server";
import { transactions as mockTransactions } from "@/lib/mock-data";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { normalizePnzTransactions } from "@/lib/open-banking/normalize";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("moneyfit_ob_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({
      source: "mock",
      connected: false,
      transactions: mockTransactions
    });
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 120);
    const response = await client.getTransactions(
      { accessToken },
      from.toISOString().slice(0, 19),
      now.toISOString().slice(0, 19)
    );

    return NextResponse.json({
      source: "pnz-sandbox",
      connected: true,
      transactions: normalizePnzTransactions(response)
    });
  } catch (error) {
    return NextResponse.json(
      {
        source: "mock",
        connected: false,
        error: error instanceof Error ? error.message : "Unknown PNZ transaction fetch error",
        transactions: mockTransactions
      },
      { status: 200 }
    );
  }
}
