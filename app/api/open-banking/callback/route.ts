import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { akahuUserTokenCookieName } from "@/lib/open-banking/token";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get("moneyfit_akahu_state")?.value;

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
    const client = createOpenBankingClientFromEnv();
    const token = await client.exchangeAuthorizationCode(code);

    if (!token.access_token) {
      const description = token.error_description || token.error || "missing_access_token";
      return redirectWithStatus(request, `connect_error=${encodeURIComponent(description)}`);
    }

    const response = redirectWithStatus(request, "connected=1");
    response.cookies.set(akahuUserTokenCookieName, token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
    response.cookies.delete("moneyfit_akahu_state");

    return response;
  } catch (exchangeError) {
    const message = exchangeError instanceof Error ? exchangeError.message : "Akahu token exchange failed.";
    return redirectWithStatus(request, `connect_error=${encodeURIComponent(message)}`);
  }
}

function redirectWithStatus(request: NextRequest, query: string) {
  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/?${query}`);
}
