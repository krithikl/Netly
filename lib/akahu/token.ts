import type { NextRequest, NextResponse } from "next/server";

export const akahuUserTokenCookieName = "netly_akahu_user_token";
export const akahuAccessTokenCookieName = "netly_akahu_access_token";

// Reads the stored Akahu token cookie from API requests.
export function getValidAccessToken(request: NextRequest) {
  const userToken = request.cookies.get(akahuAccessTokenCookieName)?.value
    || request.cookies.get(akahuUserTokenCookieName)?.value
    || process.env.AKAHU_USER_TOKEN
    || "";

  return {
    accessToken: userToken,
    newCookies: []
  };
}

// Applies Akahu token cookies to a Next.js response.
export function applyTokenCookies(_response: NextResponse, _cookies: Array<{ name: string; value: string; maxAge?: number }>) {
  return;
}
