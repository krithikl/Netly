import { NextRequest, NextResponse } from "next/server";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { getMissingAkahuCredentialsNotice, getValidAccessToken } from "@/lib/akahu/token";
import { currentBalance } from "@/lib/mock-data";

// Returns available balance for Akahu mode or the demo account balance.
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");

  if (source === "demo") {
    return NextResponse.json({
      source: "demo",
      connected: true,
      availableBalance: currentBalance
    });
  }

  const { accessToken, appToken } = getValidAccessToken(request);

  if (!accessToken || !appToken) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      availableBalance: null,
      notice: getMissingAkahuCredentialsNotice(appToken, accessToken)
    });
  }

  try {
    const provider = createAkahuProviderFromEnv();
    const balance = await provider.getBalance({ accessToken, appToken });

    return NextResponse.json({
      source: provider.id,
      connected: true,
      availableBalance: balance.availableBalance,
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
