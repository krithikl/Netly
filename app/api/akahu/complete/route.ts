import { NextRequest, NextResponse } from "next/server";
import { akahuAccessTokenCookieName, akahuAppTokenCookieName } from "@/lib/akahu/token";
import { encryptAkahuCookieValue } from "@/lib/akahu/secure-cookie";

// Saves pasted/manual Akahu tokens for local development connection flows.
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({
      error: "Invalid JSON body. Send { \"appToken\": \"...\", \"userToken\": \"...\" }."
    }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.appToken !== "string" || typeof body.userToken !== "string") {
    return NextResponse.json({
      error: "Missing Akahu tokens. Send { \"appToken\": \"...\", \"userToken\": \"...\" }."
    }, { status: 400 });
  }

  const appToken = body.appToken.trim();
  const userToken = body.userToken.trim();

  if (!appToken) {
    return NextResponse.json({ error: "Enter AKAHU_APP_TOKEN to complete the dev connection." }, { status: 400 });
  }

  if (!userToken) {
    return NextResponse.json({ error: "Enter AKAHU_USER_TOKEN to complete the dev connection." }, { status: 400 });
  }

  let encryptedAppToken: string;
  let encryptedUserToken: string;

  try {
    encryptedAppToken = encryptAkahuCookieValue(appToken);
    encryptedUserToken = encryptAkahuCookieValue(userToken);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not encrypt Akahu token cookies."
    }, { status: 500 });
  }

  const response = NextResponse.json({ message: "Akahu tokens saved for this browser session. Transactions will now load from Akahu." });
  response.cookies.set(akahuAppTokenCookieName, encryptedAppToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  response.cookies.set(akahuAccessTokenCookieName, encryptedUserToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
