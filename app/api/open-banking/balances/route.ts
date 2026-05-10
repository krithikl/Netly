import { NextRequest, NextResponse } from "next/server";
import { getAkahuAccounts, getAvailableBalance } from "@/lib/open-banking/accounts";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { getValidAccessToken } from "@/lib/open-banking/token";
import { currentBalance } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");

  if (source === "demo") {
    return NextResponse.json({
      source: "demo",
      connected: true,
      availableBalance: currentBalance,
      rawAccounts: []
    });
  }

  const { accessToken } = getValidAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      availableBalance: null,
      notice: "No Akahu user token is connected. Connect Akahu or switch to demo data."
    });
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const response = await client.getAccounts({ userToken: accessToken });
    const accounts = getAkahuAccounts(response);
    const availableBalance = getAvailableBalance(accounts);
    const notice = availableBalance === null ? "Akahu connected, but no account balances were returned." : "";

    return NextResponse.json({
      source: "akahu",
      connected: true,
      availableBalance,
      rawAccounts: accounts,
      notice
    });
  } catch (error) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      availableBalance: null,
      error: error instanceof Error ? error.message : "Unknown Akahu balance fetch error"
    }, { status: 502 });
  }
}
