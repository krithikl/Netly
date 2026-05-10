import type { NextRequest, NextResponse } from "next/server";

export const akahuUserTokenCookieName = "netly_akahu_user_token";

export function getValidAccessToken(request: NextRequest) {
  const userToken = request.cookies.get(akahuUserTokenCookieName)?.value || process.env.AKAHU_USER_TOKEN || "";

  return {
    accessToken: userToken,
    newCookies: []
  };
}

export function applyTokenCookies(_response: NextResponse, _cookies: Array<{ name: string; value: string; maxAge?: number }>) {
  return;
}
