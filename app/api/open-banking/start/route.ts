import { NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";

export async function GET() {
  try {
    const client = createOpenBankingClientFromEnv();
    const state = crypto.randomUUID();
    const response = NextResponse.redirect(client.getAuthorizationUrl(state));

    response.cookies.set("netly_akahu_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60
    });

    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not start Akahu authorization."
    }, { status: 500 });
  }
}
