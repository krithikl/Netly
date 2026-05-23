import { NextRequest, NextResponse } from "next/server";
import { getAvailableBalance, toAccountDataFreshness, toLinkedAccount, type AkahuAccount } from "@/lib/akahu/accounts";
import { createAkahuProviderFromEnv } from "@/lib/akahu/provider";
import { getMissingAkahuCredentialsNotice, getValidAccessToken } from "@/lib/akahu/token";

const personalAppManualRefreshCooldownMs = 60 * 60 * 1000;
const fullAppManualRefreshCooldownMs = 15 * 60 * 1000;
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
      availableBalance: null,
      accounts: [],
      accountFreshness: [],
      balanceRefreshedAt: null,
      isStale: false,
      manualRefreshCooldownMs: getManualRefreshCooldownMs(),
      primaryAccount: null,
      retrievedAt: null,
      transactionsRefreshedAt: null,
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
      ...getAccountSnapshotPayload(accountResult.accounts),
      accounts,
      primaryAccount: accounts[0] || null,
      notice: accountResult.notice
    });
  } catch (error) {
    return NextResponse.json({
      source: "akahu",
      connected: false,
      availableBalance: null,
      accounts: [],
      accountFreshness: [],
      balanceRefreshedAt: null,
      manualRefreshCooldownMs: getManualRefreshCooldownMs(),
      primaryAccount: null,
      isStale: false,
      retrievedAt: null,
      transactionsRefreshedAt: null,
      error: error instanceof Error ? error.message : "Unknown Akahu account fetch error"
    }, { status: 502 });
  }
}

// Formats Akahu/demo accounts into the payload expected by useAkahuData.
function toAccountsPayload(accounts: AkahuAccount[], connected: boolean, source: "akahu" | "demo", notice = "") {
  const linkedAccounts = accounts.map(toLinkedAccount);
  const snapshot = source === "demo" ? getDemoAccountSnapshotPayload(accounts) : getAccountSnapshotPayload(accounts);

  return {
    source,
    connected,
    ...snapshot,
    accounts: linkedAccounts,
    primaryAccount: linkedAccounts[0] || null,
    notice
  };
}

// Keeps demo balances usable without implying a real Akahu freshness timestamp.
function getDemoAccountSnapshotPayload(accounts: AkahuAccount[]) {
  return {
    availableBalance: getAvailableBalance(accounts),
    accountFreshness: [],
    balanceRefreshedAt: null,
    isStale: false,
    manualRefreshCooldownMs: getManualRefreshCooldownMs(),
    retrievedAt: null,
    transactionsRefreshedAt: null
  };
}

// Builds the account snapshot fields shared by demo and Akahu user mode.
function getAccountSnapshotPayload(accounts: AkahuAccount[]) {
  const accountFreshness = accounts.map(toAccountDataFreshness);
  const manualRefreshCooldownMs = getManualRefreshCooldownMs();

  return {
    availableBalance: getAvailableBalance(accounts),
    accountFreshness,
    balanceRefreshedAt: getOldestTimestamp(accountFreshness.map((account) => account.balanceRefreshedAt)),
    isStale: hasStaleTimestamp(accountFreshness, manualRefreshCooldownMs),
    manualRefreshCooldownMs,
    retrievedAt: new Date().toISOString(),
    transactionsRefreshedAt: getOldestTimestamp(accountFreshness.map((account) => account.transactionsRefreshedAt))
  };
}

// Uses a conservative Personal App default unless full-app credentials are configured.
function getManualRefreshCooldownMs() {
  const configuredMinutes = Number.parseInt(process.env.AKAHU_MANUAL_REFRESH_COOLDOWN_MINUTES || "", 10);

  if (Number.isFinite(configuredMinutes) && configuredMinutes > 0) {
    return configuredMinutes * 60 * 1000;
  }

  return process.env.AKAHU_APP_SECRET ? fullAppManualRefreshCooldownMs : personalAppManualRefreshCooldownMs;
}

// Uses the oldest account timestamp because the summary should reflect the least fresh account.
function getOldestTimestamp(values: Array<string | null>) {
  const timestamps = values
    .map((value) => value ? Date.parse(value) : Number.NaN)
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.min(...timestamps)).toISOString();
}

// Treats missing or cooldown-expired Akahu refresh metadata as stale so the UI can surface it.
function hasStaleTimestamp(accounts: ReturnType<typeof toAccountDataFreshness>[], refreshCooldownMs: number) {
  if (accounts.length === 0) {
    return false;
  }

  const staleCutoff = Date.now() - refreshCooldownMs;

  return accounts.some((account) => {
    return isMissingOrStale(account.balanceRefreshedAt, staleCutoff)
      || isMissingOrStale(account.transactionsRefreshedAt, staleCutoff);
  });
}

// Checks one Akahu timestamp against the stale cutoff.
function isMissingOrStale(value: string | null, staleCutoff: number) {
  if (!value) {
    return true;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid Akahu refresh timestamp "${value}".`);
  }

  return timestamp < staleCutoff;
}
