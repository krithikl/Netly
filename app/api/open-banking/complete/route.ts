import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { signPrivateKeyJwt } from "@/lib/open-banking/jwt";
import { decodeJwtPayload } from "@/lib/open-banking/response-jwt";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { response?: string; code?: string };
    const responseJwt = body.response?.trim();
    const code = body.code?.trim() || (responseJwt ? getCodeFromResponseJwt(responseJwt) : "");
    const codeVerifier = request.cookies.get("moneyfit_ob_code_verifier")?.value;

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
    const discovery = await client.discover();
    const tokenEndpointUrl =
      typeof discovery === "object" && discovery && "token_endpoint" in discovery
        ? String(discovery.token_endpoint)
        : `${config.baseUrl}/oauth/v2.0/token`;
    const clientAssertion = signPrivateKeyJwt({
      audience: tokenEndpointUrl,
      clientId: config.clientId,
      keyId: config.clientKeyId,
      privateKeyPem: config.privateKeyPem
    });
    const token = await client.exchangeAuthorizationCode({
      clientAssertion,
      code,
      codeVerifier
    });

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
