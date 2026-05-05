import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { createPkcePair, signAuthorizationRequest, signPrivateKeyJwt } from "@/lib/open-banking/jwt";

type DiscoveryDocument = {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
};

export async function GET() {
  try {
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
    const now = Date.now();
    const consent = await client.createAccountAccessConsent(
      {
        transactionFromDateTime: new Date(now - 1000 * 60 * 60 * 24 * 365).toISOString(),
        transactionToDateTime: new Date(now + 1000 * 60 * 60 * 24 * 365).toISOString(),
        expirationDateTime: new Date(now + 1000 * 60 * 60 * 24 * 90).toISOString()
      },
      { accessToken: token.access_token }
    );

    const consentId = consent?.Data?.ConsentId;

    if (!consentId) {
      return NextResponse.json({ error: "PNZ consent response did not include Data.ConsentId", consent }, { status: 502 });
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

    const response = NextResponse.redirect(authorizeUrl);
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

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown open banking start error",
        hint: "If PNZ returns invalid_request for redirect_uri, update PNZ_REDIRECT_URI so it exactly matches a callback URI registered for this client in the PNZ sandbox portal."
      },
      { status: 500 }
    );
  }
}
