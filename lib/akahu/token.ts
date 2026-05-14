import type { NextRequest } from "next/server";

export const akahuAccessTokenCookieName = "netly_akahu_access_token";

// Reads the stored Akahu token cookie from API requests.
export function getValidAccessToken(request: NextRequest) {
  const userToken = request.cookies.get(akahuAccessTokenCookieName)?.value
    || process.env.AKAHU_USER_TOKEN
    || "";

  return {
    accessToken: userToken,
    newCookies: []
  };
}
