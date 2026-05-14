import { NextRequest, NextResponse } from "next/server";
import { akahuAccessTokenCookieName } from "@/lib/akahu/token";

// Saves a pasted/manual Akahu user token for local development connection flows.
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({
      error: "Invalid JSON body. Send { \"userToken\": \"...\" }."
    }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.userToken !== "string") {
    return NextResponse.json({
      error: "Missing userToken. Send { \"userToken\": \"...\" }."
    }, { status: 400 });
  }

  const userToken = body.userToken.trim();

  if (!userToken) {
    return NextResponse.json({ error: "Paste an Akahu User Access Token to complete the dev connection." }, { status: 400 });
  }

  const response = NextResponse.json({ message: "Akahu user token saved. Transactions will now load from Akahu." });
  response.cookies.set(akahuAccessTokenCookieName, userToken, {
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
