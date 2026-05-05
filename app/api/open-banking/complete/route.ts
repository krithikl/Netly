import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { signPrivateKeyJwt } from "@/lib/open-banking/jwt";
import { decodePaymentTestCookie } from "@/lib/open-banking/payment-test";
import { decodeJwtPayload } from "@/lib/open-banking/response-jwt";

type DiscoveryDocument = {
  token_endpoint?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { response?: string; code?: string };
    const responseJwt = body.response?.trim();
    const code = body.code?.trim() || (responseJwt ? getCodeFromResponseJwt(responseJwt) : "");
    const codeVerifier = request.cookies.get("moneyfit_ob_code_verifier")?.value;
    const flow = request.cookies.get("moneyfit_ob_flow")?.value;

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code or response JWT" }, { status: 400 });
    }

    if (!codeVerifier) {
      return NextResponse.json(
        {
          error: "Missing PKCE code verifier cookie. Start the connection again, then paste the latest response."
        },
        { status: 400 }
      );
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
      const cookie = request.cookies.get("moneyfit_payment_test")?.value;

      if (!cookie) {
        return NextResponse.json({ error: "Missing payment test cookie. Start the payment test again." }, { status: 400 });
      }

      const paymentTest = decodePaymentTestCookie(cookie);
      const payment = await client.submitDomesticPayment(paymentTest, { accessToken: token.access_token });
      const response = NextResponse.json({
        status: "payment_submitted",
        message: "Payment test submitted. Refreshing PNZ transactions and balances.",
        paymentId: payment?.Data?.DomesticPaymentId,
        paymentStatus: payment?.Data?.Status,
        consentId: paymentTest.consentId
      });

      clearAuthorizationCookies(response);
      response.cookies.delete("moneyfit_payment_test");
      return response;
    }

    const response = NextResponse.json({
      status: "connected",
      message: "Authorization code exchanged. Transactions will now load from PNZ sandbox where available.",
      expiresIn: token.expires_in
    });

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown completion error" },
      { status: 500 }
    );
  }
}

function getCodeFromResponseJwt(responseJwt: string) {
  const payload = decodeJwtPayload(responseJwt);

  if (typeof payload.code === "string") {
    return payload.code;
  }

  throw new Error("Response JWT did not contain a code claim");
}

function clearAuthorizationCookies(response: NextResponse) {
  response.cookies.delete("moneyfit_ob_state");
  response.cookies.delete("moneyfit_ob_consent");
  response.cookies.delete("moneyfit_ob_code_verifier");
  response.cookies.delete("moneyfit_ob_flow");
}
