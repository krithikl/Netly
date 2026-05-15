import { NextRequest, NextResponse } from "next/server";
import { toLinkedAccount, type AkahuAccount } from "@/lib/akahu/accounts";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { getMissingAkahuCredentialsNotice, getValidAccessToken } from "@/lib/akahu/token";

const demoAccounts: AkahuAccount[] = [
  {
    _id: "acc_demo_everyday",
    name: "Everyday",
    status: "ACTIVE",
    type: "CHECKING",
    formatted_account: "00-0000-0000000-00",
    balance: {
      available: 2268.42,
      current: 2268.42,
      currency: "NZD"
    },
    meta: {
      holder: "Demo user"
    }
  },
  {
    _id: "acc_demo_bills",
    name: "Bills",
    status: "ACTIVE",
    type: "SAVINGS",
    formatted_account: "00-0000-0000001-00",
    balance: {
      available: 1000,
      current: 1000,
      currency: "NZD"
    },
    meta: {
      holder: "Demo user"
    }
  }
];

// Returns linked Akahu accounts, or demo accounts when the app is in demo mode.
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");

  if (source === "demo") {
    return NextResponse.json(toAccountsPayload(demoAccounts, true, "demo"));
  }

  const { accessToken, appToken } = await getValidAccessToken(request);

  if (!accessToken || !appToken) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      accounts: [],
      primaryAccount: null,
      notice: getMissingAkahuCredentialsNotice(appToken, accessToken)
    });
  }

  try {
    const provider = createAkahuProviderFromEnv();
    const accountResult = await provider.getAccounts({ accessToken, appToken });
    const accounts = accountResult.accounts.map(toLinkedAccount);

    return NextResponse.json({
      source: provider.id,
      connected: true,
      accounts,
      primaryAccount: accounts[0] || null,
      notice: accountResult.notice
    });
  } catch (error) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      accounts: [],
      primaryAccount: null,
      error: error instanceof Error ? error.message : "Unknown Akahu account fetch error"
    }, { status: 502 });
  }
}

// Formats Akahu/demo accounts into the payload expected by useAkahuData.
function toAccountsPayload(accounts: AkahuAccount[], connected: boolean, source: "akahu" | "demo", notice = "") {
  const linkedAccounts = accounts.map(toLinkedAccount);

  return {
    source,
    connected,
    accounts: linkedAccounts,
    primaryAccount: linkedAccounts[0] || null,
    notice
  };
}
