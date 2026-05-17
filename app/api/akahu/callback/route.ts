import { NextRequest, NextResponse } from "next/server";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { akahuAccessTokenCookieName, akahuStateCookieName, getAkahuTokenCookieOptions } from "@/lib/akahu/token";
import { encryptAkahuCookieValue } from "@/lib/akahu/secure-cookie";

// Handles Akahu OAuth redirect, validates state, stores token cookies, and redirects home.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(akahuStateCookieName)?.value;

  if (error) {
    return redirectWithStatus(request, `connect_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return redirectWithStatus(request, "connect_error=missing_code");
  }

  if (expectedState && state !== expectedState) {
    return redirectWithStatus(request, "connect_error=state_mismatch");
  }

  try {
    const provider = createAkahuProviderFromEnv();
    const accessToken = await provider.exchangeAuthorizationCode(code);

    const response = redirectWithStatus(request, "connected=1");
    response.cookies.set(akahuAccessTokenCookieName, await encryptAkahuCookieValue(accessToken), getAkahuTokenCookieOptions());
    response.cookies.delete(akahuStateCookieName);

    return response;
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : "Akahu token exchange failed.";
    return redirectWithStatus(request, `connect_error=${encodeURIComponent(message)}`);
  }
}

// Builds the post-OAuth redirect back to the app with a status query string.
function redirectWithStatus(request: NextRequest, query: string) {
  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/?${query}`);
}
