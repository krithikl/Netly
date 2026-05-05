import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { createPkcePair, signAuthorizationRequest, signPrivateKeyJwt } from "@/lib/open-banking/jwt";
import { buildPaymentTestRequest, encodePaymentTestCookie, type PaymentTestInput } from "@/lib/open-banking/payment-test";

type DiscoveryDocument = {
  authorization_endpoint?: string;
  token_endpoint?: string;
};

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as PaymentTestInput;
    const paymentTest = buildPaymentTestRequest(input);
    const client = createOpenBankingClientFromEnv();
    const config = client.getConfig();
    const discovery = (await client.discover()) as DiscoveryDocument;
    const tokenEndpointUrl = discovery.token_endpoint || `${config.baseUrl}/oauth/v2.0/token`;
    const authorizationEndpoint = discovery.authorization_endpoint || `${config.baseUrl}/oauth/v2.0/authorize`;
    const tokenEndpointPath = new URL(tokenEndpointUrl).pathname;

    const clientAssertion = signPrivateKeyJwt({
      audience: tokenEndpointUrl,
      clientId: config.clientId,
      keyId: config.clientKeyId,
      privateKeyPem: config.privateKeyPem
    });

    const token = await client.getClientCredentialsToken(clientAssertion, tokenEndpointPath);
    const consent = await client.createDomesticPaymentConsent(paymentTest, {
      accessToken: token.access_token
    });
    const consentId = consent?.Data?.ConsentId;

    if (!consentId) {
      return NextResponse.json({ error: "PNZ payment consent response did not include Data.ConsentId", consent }, { status: 502 });
    }

    const state = randomUUID();
    const nonce = randomUUID();
    const pkce = createPkcePair();
    const requestJwt = signAuthorizationRequest({
      audience: authorizationEndpoint,
      claims: {
        id_token: {
          ConsentId: {
            value: consentId,
            essential: true
          },
          acr: {
            value: "urn:openbanking:nz:ca",
            essential: true
          }
        }
      },
      codeChallenge: pkce.challenge,
      clientId: config.clientId,
      keyId: config.clientKeyId,
      nonce,
      privateKeyPem: config.privateKeyPem,
      redirectUri: config.redirectUri,
      responseMode: "jwt",
      responseType: "code",
      scope: "openid accounts payments",
      state
    });

    const pushedAuth = await client.pushAuthorizationRequest(requestJwt, clientAssertion);
    const authorizeUrl = new URL(authorizationEndpoint);
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("request_uri", pushedAuth.request_uri);

    const response = NextResponse.json({
      authorizationUrl: authorizeUrl.toString(),
      consentId,
      amount: paymentTest.initiation.InstructedAmount.Amount,
      creditorName: paymentTest.initiation.CreditorAccount.Name
    });

    response.cookies.set("moneyfit_ob_flow", "payment_test", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/"
    });
    response.cookies.set("moneyfit_ob_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/"
    });
    response.cookies.set("moneyfit_ob_consent", consentId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/"
    });
    response.cookies.set("moneyfit_ob_code_verifier", pkce.verifier, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/"
    });
    response.cookies.set(
      "moneyfit_payment_test",
      encodePaymentTestCookie({
        consentId,
        ...paymentTest
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/"
      }
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown payment test start error"
      },
      { status: 500 }
    );
  }
}
