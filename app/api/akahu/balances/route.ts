import { NextRequest, NextResponse } from "next/server";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { getValidAccessToken } from "@/lib/akahu/token";
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
    const provider = createAkahuProviderFromEnv();
    const balance = await provider.getBalance({ accessToken });

    return NextResponse.json({
      source: provider.id,
      connected: true,
      availableBalance: balance.availableBalance,
      rawAccounts: balance.rawAccounts,
      notice: balance.notice
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
