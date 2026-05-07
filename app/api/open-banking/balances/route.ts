import { NextRequest, NextResponse } from "next/server";
import { pnzMockBalancesResponse } from "@/lib/mock-data";
import { normalizePnzBalances } from "@/lib/open-banking/balances";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { getValidAccessToken, applyTokenCookies } from "@/lib/open-banking/token";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedSource = url.searchParams.get("source");
  const { accessToken, newCookies } = await getValidAccessToken(request);

  if (requestedSource === "demo") {
    const normalized = normalizePnzBalances(pnzMockBalancesResponse);

    return NextResponse.json({
      source: "mock",
      connected: false,
      availableBalance: normalized.availableBalance,
      balances: normalized.selectedBalances,
      rawCount: pnzMockBalancesResponse.Data?.Balance?.length || 0
    });
  }

  if (!accessToken) {
    const responseObj = NextResponse.json({
      source: "pnz-sandbox",
      connected: false,
      availableBalance: null,
      balances: [],
      notice: "No PNZ sandbox user is connected. Connect a bank or switch to demo data."
    });
    return applyTokenCookies(responseObj, newCookies);
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const response = await client.getBalances({ accessToken });
    const normalized = normalizePnzBalances(response);

    const responseObj = NextResponse.json({
      source: "pnz-sandbox",
      connected: true,
      availableBalance: normalized.availableBalance,
      balances: normalized.selectedBalances,
      rawCount: response?.Data?.Balance?.length || 0,
      notice:
        normalized.selectedBalances.length === 0
          ? "PNZ connected, but the sandbox returned no balances."
          : undefined
    });
    return applyTokenCookies(responseObj, newCookies);
  } catch (error) {
    return NextResponse.json(
      {
        source: "pnz-sandbox",
        connected: false,
        availableBalance: null,
        balances: [],
        error: error instanceof Error ? error.message : "Unknown PNZ balance fetch error"
      },
      { status: 200 }
    );
  }
}
