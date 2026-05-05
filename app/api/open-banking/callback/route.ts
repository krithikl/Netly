import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get("moneyfit_ob_state")?.value;
  const consentId = request.cookies.get("moneyfit_ob_consent")?.value;
  const responseJwt = url.searchParams.get("response");

  // If we received a response JWT from authorization, store it and redirect back to the app
  if (responseJwt) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("moneyfit_ob_response", responseJwt, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 5 * 60, // 5 minutes
      path: "/"
    });
    return response;
  }

  return NextResponse.json({
    status: state && expectedState && state === expectedState ? "authorized" : "callback_received",
    message: "Sandbox callback received. Token exchange and account sync are the next implementation step.",
    consentId,
    query: Object.fromEntries(url.searchParams.entries())
  });
}
