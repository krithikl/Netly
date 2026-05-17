import { NextResponse } from "next/server";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { akahuStateCookieName, getAkahuStateCookieOptions } from "@/lib/akahu/token";

// Starts Akahu OAuth and stores a state cookie for callback validation.
export async function GET() {
  try {
    const provider = createAkahuProviderFromEnv();
    const state = crypto.randomUUID();
    const response = NextResponse.redirect(provider.getAuthorizationUrl(state));

    response.cookies.set(akahuStateCookieName, state, getAkahuStateCookieOptions());

    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not start Akahu authorization."
    }, { status: 500 });
  }
}
