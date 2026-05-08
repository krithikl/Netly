import type { AkahuAccount, AkahuAccountsResponse } from "@/lib/open-banking/accounts";
import type { AkahuTransactionsResponse } from "@/lib/open-banking/normalize";

type AkahuConfig = {
  baseUrl: string;
  appToken: string;
  appSecret?: string;
  redirectUri: string;
  oauthUrl: string;
};

export type AkahuToken = {
  userToken: string;
};

export class AkahuClient {
  constructor(private readonly config: AkahuConfig) {}

  getConfig() {
    return this.config;
  }

  getAuthorizationUrl(state: string, email?: string) {
    const url = new URL(this.config.oauthUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.appToken);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", "ENDURING_CONSENT");
    url.searchParams.set("state", state);

    if (email) {
      url.searchParams.set("email", email);
    }

    return url.toString();
  }

  async exchangeAuthorizationCode(code: string) {
    this.assertAppSecret();

    return this.postJson<{ success?: boolean; access_token?: string; error?: string; error_description?: string }>("/token", {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.appToken,
      client_secret: this.config.appSecret
    });
  }

  async getAccounts(token: AkahuToken) {
    return this.getJson<AkahuAccountsResponse>("/accounts", token);
  }

  async getTransactions(token: AkahuToken) {
    return this.getAllItems<AkahuTransactionsResponse>("/transactions", token);
  }

  async getPendingTransactions(token: AkahuToken) {
    return this.getAllItems<AkahuTransactionsResponse>("/transactions/pending", token);
  }

  async getAccountTransactions(token: AkahuToken, accountId: string) {
    return this.getAllItems<AkahuTransactionsResponse>(`/accounts/${encodeURIComponent(accountId)}/transactions`, token);
  }

  async getAccountPendingTransactions(token: AkahuToken, accountId: string) {
    return this.getAllItems<AkahuTransactionsResponse>(`/accounts/${encodeURIComponent(accountId)}/transactions/pending`, token);
  }

  async getTransactionsForAccounts(token: AkahuToken, accounts: AkahuAccount[]): Promise<AkahuTransactionsResponse> {
    const transactionGroups: AkahuTransactionsResponse[] = await Promise.all([
      this.getTransactions(token),
      this.getPendingTransactions(token)
    ]);

    return combineItems(transactionGroups);
  }

  private async getJson<T>(path: string, token: AkahuToken) {
    const response = await fetch(this.buildUrl(path), {
      headers: this.userHeaders(token),
      cache: "no-store"
    });

    return this.readResponse<T>(response);
  }

  private async getAllItems<T extends { items?: unknown[]; cursor?: { next?: string } }>(path: string, token: AkahuToken): Promise<T> {
    let nextCursor: string | null | undefined = undefined;
    const items: unknown[] = [];
    let lastPayload: T | null = null;

    do {
      const pagePath = addCursorToPath(path, nextCursor);
      const payload: T = await this.getJson<T>(pagePath, token);
      lastPayload = payload;
      items.push(...(payload.items || []));
      nextCursor = payload.cursor?.next;
    } while (nextCursor);

    return {
      ...(lastPayload || {}),
      items
    } as T;
  }

  private async postJson<T>(path: string, body: unknown) {
    const response = await fetch(this.buildUrl(path), {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    return this.readResponse<T>(response);
  }

  private buildUrl(path: string) {
    if (path.startsWith("http")) {
      return path;
    }

    return `${this.config.baseUrl}${path}`;
  }

  private userHeaders(token: AkahuToken) {
    return {
      Authorization: `Bearer ${token.userToken}`,
      "X-Akahu-Id": this.config.appToken
    };
  }

  private async readResponse<T>(response: Response) {
    const body = await readJsonBody(response);

    if (!response.ok) {
      throw new Error(`Akahu API request failed: ${response.status} ${response.url} ${JSON.stringify(body)}`);
    }

    return body as T;
  }

  private assertAppSecret() {
    if (!this.config.appSecret) {
      throw new Error("AKAHU_APP_SECRET is required for OAuth code exchange.");
    }
  }
}

export function createOpenBankingClientFromEnv() {
  const appToken = process.env.AKAHU_APP_TOKEN;

  if (!appToken) {
    throw new Error("Missing required Akahu environment variable: AKAHU_APP_TOKEN");
  }

  return new AkahuClient({
    baseUrl: process.env.AKAHU_BASE_URL || "https://api.akahu.io/v1",
    appToken,
    appSecret: process.env.AKAHU_APP_SECRET,
    redirectUri: process.env.AKAHU_REDIRECT_URI || `${process.env.APP_BASE_URL || "http://localhost:3000"}/api/open-banking/callback`,
    oauthUrl: process.env.AKAHU_OAUTH_URL || "https://oauth.akahu.nz"
  });
}

function combineItems<T extends { success?: boolean; items?: unknown[] }>(responses: T[]) {
  return {
    success: responses.every((response) => response.success !== false),
    items: responses.flatMap((response) => response.items || [])
  } as T;
}

function addCursorToPath(path: string, cursor?: string | null) {
  if (!cursor) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cursor=${encodeURIComponent(cursor)}`;
}

async function readJsonBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
