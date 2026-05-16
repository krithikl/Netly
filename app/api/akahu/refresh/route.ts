import { NextRequest, NextResponse } from "next/server";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { getMissingAkahuCredentialsNotice, getValidAccessToken } from "@/lib/akahu/token";

// Requests Akahu to refresh connected account data on demand.
export async function POST(request: NextRequest) {
  const { accessToken, appToken } = await getValidAccessToken(request);

  if (!accessToken || !appToken) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      notice: getMissingAkahuCredentialsNotice(appToken, accessToken)
    }, { status: 401 });
  }

  try {
    const provider = createAkahuProviderFromEnv();
    const result = await provider.requestRefresh({ accessToken, appToken });

    return NextResponse.json({
      source: provider.id,
      connected: true,
      requestedAt: new Date().toISOString(),
      notice: result.notice
    });
  } catch (error) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      error: error instanceof Error ? error.message : "Unknown Akahu refresh request error"
    }, { status: 502 });
  }
}
