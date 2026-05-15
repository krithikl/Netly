import type { NextRequest } from "next/server";
import { decryptAkahuCookieValue } from "@/lib/akahu/secure-cookie";

export const akahuAppTokenCookieName = "netly_akahu_app_token";
export const akahuAccessTokenCookieName = "netly_akahu_access_token";

// Reads the stored Akahu token cookies from API requests.
export async function getValidAccessToken(request: NextRequest) {
  const appToken = await readEncryptedCookieOrEnv(request, akahuAppTokenCookieName, "AKAHU_APP_TOKEN");
  const userToken = await readEncryptedCookieOrEnv(request, akahuAccessTokenCookieName, "AKAHU_USER_TOKEN");

  return {
    appToken,
    accessToken: userToken,
    newCookies: []
  };
}

// Prefers encrypted browser cookies and uses env tokens only for local setup.
async function readEncryptedCookieOrEnv(request: NextRequest, cookieName: string, envName: string) {
  const cookieValue = request.cookies.get(cookieName)?.value;

  if (cookieValue) {
    return decryptAkahuCookieValue(cookieValue);
  }

  return process.env[envName] || "";
}

export function getMissingAkahuCredentialsNotice(appToken: string, accessToken: string) {
  if (!appToken && !accessToken) {
    return "No Akahu app token or user token is connected. Connect Akahu or switch to demo data.";
  }

  if (!appToken) {
    return "No Akahu app token is connected. Add AKAHU_APP_TOKEN on the Connect page or switch to demo data.";
  }

  return "No Akahu user token is connected. Connect Akahu or switch to demo data.";
}
