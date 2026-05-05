import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import { signPrivateKeyJwt } from "@/lib/open-banking/jwt";

export async function GET() {
  try {
    const client = createOpenBankingClientFromEnv();
    const config = client.getConfig();
    const tokenEndpointUrl = `${config.baseUrl}/oauth/v2.0/token`;

    const clientAssertion = signPrivateKeyJwt({
      audience: tokenEndpointUrl,
      clientId: config.clientId,
      keyId: config.clientKeyId,
      privateKeyPem: config.privateKeyPem
    });

    const tokenResponse = await fetch(tokenEndpointUrl, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "x-fapi-interaction-id": randomUUID()
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "openid accounts payments",
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: clientAssertion
      }).toString()
    });

    const tokenText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (error) {
      return NextResponse.json({
        error: "Invalid JSON from token endpoint",
        status: tokenResponse.status,
        responseText: tokenText.substring(0, 500)
      }, { status: 500 });
    }

    if (!tokenResponse.ok) {
      return NextResponse.json({
        error: "Token request failed",
        status: tokenResponse.status,
        tokenData
      }, { status: tokenResponse.status });
    }

    const sandboxHost = "https://obep-sandbox.glueware.dev";
    const customersResponse = await fetch(
      `${sandboxHost}/middleware-nz-sandbox/v2.0/data/info/customers`,
      {
        headers: {
          "accept": "application/json",
          "authorization": `Bearer ${tokenData.access_token}`,
          "x-fapi-interaction-id": randomUUID()
        }
      }
    );

    const customersText = await customersResponse.text();
    let customersData;
    try {
      customersData = JSON.parse(customersText);
    } catch (error) {
      return NextResponse.json({
        error: "Invalid JSON from sandbox customers endpoint",
        status: customersResponse.status,
        responseText: customersText.substring(0, 500)
      }, { status: 500 });
    }

    if (!customersResponse.ok) {
      return NextResponse.json({
        error: "Customers request failed",
        status: customersResponse.status,
        customersData
      }, { status: customersResponse.status });
    }

    return NextResponse.json({
      message: "✅ Test customers retrieved successfully",
      customers: customersData
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
