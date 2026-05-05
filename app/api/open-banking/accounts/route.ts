import { NextRequest, NextResponse } from "next/server";
import { normalizePnzAccounts, type PnzAccountsResponse } from "@/lib/open-banking/accounts";
import { createOpenBankingClientFromEnv } from "@/lib/open-banking/client";
import sandboxCustomers from "@/data/pnz-sandbox-customers.json";

type SandboxCustomer = {
  Username?: string;
  Accounts?: Array<{
    AccountId?: string;
    Account?: {
      Identification?: string;
    };
  }>;
};

const demoAccountsResponse: PnzAccountsResponse = {
  Data: {
    Account: [
      {
        AccountId: "OBA-DEMO-EVERYDAY-00",
        Currency: "NZD",
        Nickname: "Demo Everyday",
        Description: "Demo Everyday",
        AccountType: "Personal",
        AccountSubType: "CurrentAccount",
        Account: {
          SchemeName: "BECSElectronicCredit",
          Identification: "99-0000-1234567-00",
          Name: "CurrentAccount",
          SecondaryIdentification: "ID2-DEMO-EVERYDAY-00"
        }
      }
    ]
  },
  Links: {
    Self: "/open-banking-nz/v2.3/accounts"
  },
  Meta: {
    TotalPages: 1
  }
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedSource = url.searchParams.get("source");
  const accessToken = request.cookies.get("moneyfit_ob_access_token")?.value;

  if (requestedSource === "demo") {
    const accounts = normalizePnzAccounts(demoAccountsResponse).map((account) => ({
      ...account,
      ownerName: "Demo user"
    }));

    return NextResponse.json({
      source: "mock",
      connected: false,
      accounts,
      primaryAccount: accounts[0] || null,
      rawCount: demoAccountsResponse.Data?.Account?.length || 0
    });
  }

  if (!accessToken) {
    return NextResponse.json({
      source: "pnz-sandbox",
      connected: false,
      accounts: [],
      primaryAccount: null,
      notice: "No PNZ sandbox user is connected. Connect a bank or switch to demo data."
    });
  }

  try {
    const client = createOpenBankingClientFromEnv();
    const response = await client.getAccounts({ accessToken });
    const accounts = normalizePnzAccounts(response).map((account) => ({
      ...account,
      ownerName: getSandboxOwnerName(account.accountId, account.identification)
    }));

    return NextResponse.json({
      source: "pnz-sandbox",
      connected: true,
      accounts,
      primaryAccount: accounts[0] || null,
      rawCount: response?.Data?.Account?.length || 0,
      notice:
        accounts.length === 0
          ? "PNZ connected, but the sandbox returned no accounts."
          : undefined
    });
  } catch (error) {
    return NextResponse.json(
      {
        source: "pnz-sandbox",
        connected: false,
        accounts: [],
        primaryAccount: null,
        error: error instanceof Error ? error.message : "Unknown PNZ account fetch error"
      },
      { status: 200 }
    );
  }
}

function getSandboxOwnerName(accountId: string, identification: string) {
  const customers = sandboxCustomers.customers.Customers as SandboxCustomer[];
  const owner = customers.find((customer) =>
    customer.Accounts?.some((account) =>
      account.AccountId === accountId ||
      account.Account?.Identification === identification
    )
  );

  return owner?.Username;
}
