import { NextRequest, NextResponse } from "next/server";
import { akahuUserTokenCookieName } from "@/lib/open-banking/token";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { response?: string; userToken?: string };
  const userToken = (body.userToken || body.response || "").trim();

  if (!userToken) {
    return NextResponse.json({ error: "Paste an Akahu User Access Token to complete the dev connection." }, { status: 400 });
  }

  const response = NextResponse.json({ message: "Akahu user token saved. Transactions will now load from Akahu." });
  response.cookies.set(akahuUserTokenCookieName, userToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}
