import { NextResponse } from "next/server";
import {
  akahuAccessTokenCookieName,
  akahuAppTokenCookieName,
  akahuStateCookieName,
  getAkahuStateCookieOptions,
  getAkahuTokenCookieOptions
} from "@/lib/akahu/token";

// Clears browser-stored Akahu credentials without deleting the encrypted local archive.
export async function POST() {
  const response = NextResponse.json({
    message: getDisconnectMessage(),
    envCredentialsAvailable: hasConfiguredEnvCredentials()
  });

  expireCookie(response, akahuAccessTokenCookieName, getAkahuTokenCookieOptions());
  expireCookie(response, akahuAppTokenCookieName, getAkahuTokenCookieOptions());
  expireCookie(response, akahuStateCookieName, getAkahuStateCookieOptions());

  return response;
}

function expireCookie(response: NextResponse, name: string, options: ReturnType<typeof getAkahuTokenCookieOptions>) {
  response.cookies.set(name, "", {
    ...options,
    maxAge: 0
  });
}

function getDisconnectMessage() {
  if (hasConfiguredEnvCredentials()) {
    return "Akahu browser connection cleared. Environment Akahu tokens are still configured for local development.";
  }

  return "Akahu disconnected. Local encrypted transaction history remains on this device.";
}

function hasConfiguredEnvCredentials() {
  return Boolean(process.env.AKAHU_APP_TOKEN || process.env.AKAHU_USER_TOKEN);
}
