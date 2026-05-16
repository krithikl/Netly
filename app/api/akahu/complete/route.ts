import { NextRequest, NextResponse } from "next/server";
import { akahuAccessTokenCookieName, akahuAppTokenCookieName } from "@/lib/akahu/token";
import { encryptAkahuCookieValue } from "@/lib/akahu/secure-cookie";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";

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

  try {
    const provider = createAkahuProviderFromEnv();
    await provider.getAccounts({ accessToken: userToken, appToken });
  } catch (error) {
    return NextResponse.json({
      error: getAkahuCredentialValidationError(error)
    }, { status: getCredentialValidationStatus(error) });
  }

  let encryptedAppToken: string;
  let encryptedUserToken: string;

  try {
    encryptedAppToken = await encryptAkahuCookieValue(appToken);
    encryptedUserToken = await encryptAkahuCookieValue(userToken);
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
    maxAge: 60 * 60 * 24 * 30
  });
  response.cookies.set(akahuAccessTokenCookieName, encryptedUserToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Converts Akahu auth failures into Connect-page credential messages.
function getAkahuCredentialValidationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Akahu credential validation error.";

  if (isAkahuAuthErrorMessage(message)) {
    return "Akahu credentials were rejected. Check AKAHU_APP_TOKEN and AKAHU_USER_TOKEN.";
  }

  return `Could not validate Akahu credentials before saving them: ${message}`;
}

// Keeps rejected credentials distinct from upstream/network validation failures.
function getCredentialValidationStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return isAkahuAuthErrorMessage(message) ? 401 : 502;
}

function isAkahuAuthErrorMessage(message: string) {
  return /\b(401|403|unauthori[sz]ed|forbidden|invalid_token|invalid client|access denied)\b/i.test(message);
}
