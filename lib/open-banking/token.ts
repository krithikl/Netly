import { NextRequest, NextResponse } from "next/server";
import { createOpenBankingClientFromEnv } from "./client";
import { signPrivateKeyJwt } from "./jwt";

export async function getValidAccessToken(request: NextRequest) {
  let accessToken = request.cookies.get("moneyfit_ob_access_token")?.value;
  const refreshToken = request.cookies.get("moneyfit_ob_refresh_token")?.value;
  const newCookies: Array<{ name: string; value: string; maxAge: number }> = [];

  if (!accessToken && refreshToken) {
    try {
      const client = createOpenBankingClientFromEnv();
      const config = client.getConfig();
      const discovery = (await client.discover()) as { token_endpoint?: string };
      const tokenEndpointUrl = discovery.token_endpoint || `${config.baseUrl}/oauth/v2.0/token`;
      
      const clientAssertion = signPrivateKeyJwt({
        audience: tokenEndpointUrl,
        clientId: config.clientId,
        keyId: config.clientKeyId,
        privateKeyPem: config.privateKeyPem
      });

      const token = await client.refreshAccessToken({
        clientAssertion,
        refreshToken,
        tokenEndpoint: new URL(tokenEndpointUrl).pathname
      });

      accessToken = token.access_token;
      newCookies.push({ name: "moneyfit_ob_access_token", value: token.access_token, maxAge: token.expires_in });
      if (token.refresh_token) {
        newCookies.push({ name: "moneyfit_ob_refresh_token", value: token.refresh_token, maxAge: 60 * 60 * 24 * 30 });
      }
    } catch (err) {
      console.error("Failed to refresh PNZ token", err);
      accessToken = undefined;
    }
  }

  return { accessToken, newCookies };
}

export function applyTokenCookies(response: NextResponse, newCookies: Array<{ name: string; value: string; maxAge: number }>) {
  for (const cookie of newCookies) {
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: cookie.maxAge,
      path: "/"
    });
  }
  return response;
}
