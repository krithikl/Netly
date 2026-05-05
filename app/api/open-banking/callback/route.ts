import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { signPrivateKeyJwt } from "@/lib/open-banking/jwt";
import { decodePaymentTestCookie } from "@/lib/open-banking/payment-test";
import { decodeJwtPayload } from "@/lib/open-banking/response-jwt";

type DiscoveryDocument = {
  token_endpoint?: string;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const responseJwt = url.searchParams.get("response");
  const directCode = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get("moneyfit_ob_state")?.value;
  const consentId = request.cookies.get("moneyfit_ob_consent")?.value;
  const flow = request.cookies.get("moneyfit_ob_flow")?.value;

  if (!responseJwt && !directCode) {
    return NextResponse.json({
      status: state && expectedState && state === expectedState ? "authorized" : "callback_received",
      message: "Sandbox callback received without an authorization response.",
      consentId,
      query: Object.fromEntries(url.searchParams.entries())
    });
  }

  try {
    const authorization = directCode
      ? { code: directCode, state }
      : getAuthorizationFromResponseJwt(responseJwt!);
    const { code } = authorization;
    const codeVerifier = request.cookies.get("moneyfit_ob_code_verifier")?.value;

    if (expectedState && authorization.state && authorization.state !== expectedState) {
      return redirectWithStatus(request, "state_mismatch");
    }

    if (!codeVerifier) {
      return redirectWithStatus(request, "missing_verifier");
    }

    const client = createOpenBankingClientFromEnv();
    const config = client.getConfig();
    const discovery = (await client.discover()) as DiscoveryDocument;
    const tokenEndpointUrl = discovery.token_endpoint || `${config.baseUrl}/oauth/v2.0/token`;
    const tokenEndpointPath = new URL(tokenEndpointUrl).pathname;
    const clientAssertion = signPrivateKeyJwt({
      audience: tokenEndpointUrl,
      clientId: config.clientId,
      keyId: config.clientKeyId,
      privateKeyPem: config.privateKeyPem
    });
    const token = await client.exchangeAuthorizationCode({
      clientAssertion,
      code,
      codeVerifier,
      tokenEndpoint: tokenEndpointPath
    });

    if (flow === "payment_test") {
      return submitPaymentTestAndRedirect(request, token.access_token);
    }

    const response = NextResponse.redirect(new URL("/?connected=1", request.url));
    response.cookies.set("moneyfit_ob_access_token", token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: token.expires_in,
      path: "/"
    });

    if (token.refresh_token) {
      response.cookies.set("moneyfit_ob_refresh_token", token.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/"
      });
    }

    response.cookies.delete("moneyfit_ob_response");
    clearAuthorizationCookies(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "callback_failed";
    return redirectWithStatus(request, encodeURIComponent(message));
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const url = new URL(request.url);
  const responseJwt = form.get("response");
  const code = form.get("code");
  const state = form.get("state");

  if (typeof responseJwt === "string") {
    url.searchParams.set("response", responseJwt);
  }

  if (typeof code === "string") {
    url.searchParams.set("code", code);
  }

  if (typeof state === "string") {
    url.searchParams.set("state", state);
  }

  return GET(new NextRequest(url, { headers: request.headers }));
}

function getAuthorizationFromResponseJwt(responseJwt: string) {
  const payload = decodeJwtPayload(responseJwt);

  if (typeof payload.code === "string") {
    return {
      code: payload.code,
      state: typeof payload.state === "string" ? payload.state : undefined
    };
  }

  throw new Error("Response JWT did not contain a code claim");
}

function redirectWithStatus(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/?connectionError=${status}`, request.url));
}

async function submitPaymentTestAndRedirect(request: NextRequest, accessToken: string) {
  try {
    const cookie = request.cookies.get("moneyfit_payment_test")?.value;

    if (!cookie) {
      throw new Error("Missing payment test cookie. Start the payment test again.");
    }

    const paymentTest = decodePaymentTestCookie(cookie);
    const client = createOpenBankingClientFromEnv();
    const payment = await client.submitDomesticPayment(paymentTest, { accessToken });
    const paymentId = payment?.Data?.DomesticPaymentId;
    const status = payment?.Data?.Status;
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("paymentTest", "1");
    redirectUrl.searchParams.set("paymentStatus", status || "submitted");
    redirectUrl.searchParams.set("consentId", paymentTest.consentId);

    if (paymentId) {
      redirectUrl.searchParams.set("paymentId", paymentId);
    }

    const response = NextResponse.redirect(redirectUrl);
    clearAuthorizationCookies(response);
    response.cookies.delete("moneyfit_payment_test");
    return response;
  } catch (error) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("paymentTest", "error");
    redirectUrl.searchParams.set("paymentError", error instanceof Error ? error.message : "Unknown payment submission error");
    const response = NextResponse.redirect(redirectUrl);
    clearAuthorizationCookies(response);
    response.cookies.delete("moneyfit_payment_test");
    return response;
  }
}

function clearAuthorizationCookies(response: NextResponse) {
  response.cookies.delete("moneyfit_ob_state");
  response.cookies.delete("moneyfit_ob_consent");
  response.cookies.delete("moneyfit_ob_code_verifier");
  response.cookies.delete("moneyfit_ob_flow");
}
