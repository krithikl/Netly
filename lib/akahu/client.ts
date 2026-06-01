import type { AkahuAccount, AkahuAccountsResponse } from "@/lib/akahu/accounts";
import type { AkahuTransactionsResponse } from "@/lib/akahu/normalize";

type AkahuConfig = {
  baseUrl: string;
  appToken?: string;
  appSecret?: string;
  oauthScope: string;
  requestTimeoutMs: number;
  redirectUri: string;
  oauthUrl: string;
};

export type AkahuToken = {
  appToken?: string;
  userToken: string;
};

export type AkahuTransactionQuery = {
  cursor?: string;
  end?: string;
  start?: string;
};

// Low-level Akahu HTTP client used only by the provider/server routes.
export class AkahuClient {
  constructor(private readonly config: AkahuConfig) {}

  getConfig() {
    return this.config;
  }

  getAuthorizationUrl(state: string, email?: string) {
    const url = new URL(this.config.oauthUrl);
    const appToken = this.getConfiguredAppToken("Akahu OAuth authorization");

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", appToken);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", this.config.oauthScope);
    url.searchParams.set("state", state);

    if (email) {
      url.searchParams.set("email", email);
    }

    return url.toString();
  }

  async exchangeAuthorizationCode(code: string) {
    this.assertAppSecret();
    const appToken = this.getConfiguredAppToken("Akahu OAuth code exchange");

    return this.postJson<{ success?: boolean; access_token?: string; error?: string; error_description?: string }>("/token", {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: appToken,
      client_secret: this.config.appSecret
    });
  }

  async getAccounts(token: AkahuToken) {
    return this.getJson<AkahuAccountsResponse>("/accounts", token);
  }

  async requestRefresh(token: AkahuToken) {
    const response = await this.fetchAkahu("/refresh", {
      method: "POST",
      headers: this.userHeaders(token),
      cache: "no-store"
    });

    return this.readResponse<{ success?: boolean; message?: string }>(response);
  }

  async getTransactions(token: AkahuToken, query: AkahuTransactionQuery = {}) {
    return this.getAllItems<AkahuTransactionsResponse>(addTransactionQueryToPath("/transactions", query), token);
  }

  async getTransactionsPage(token: AkahuToken, query: AkahuTransactionQuery = {}) {
    return this.getJson<AkahuTransactionsResponse>(addTransactionQueryToPath("/transactions", query), token);
  }

  async getAccountTransactions(token: AkahuToken, accountId: string) {
    return this.getAllItems<AkahuTransactionsResponse>(`/accounts/${encodeURIComponent(accountId)}/transactions`, token);
  }

  // Loads settled transactions from Akahu's booked transaction feed.
  async getTransactionsForAccounts(token: AkahuToken, accounts: AkahuAccount[]): Promise<AkahuTransactionsResponse> {
    return this.getTransactions(token);
  }

  // Loads one settled transaction page without mixing in volatile rows.
  async getTransactionsPageForAccounts(token: AkahuToken, accounts: AkahuAccount[], query: AkahuTransactionQuery = {}): Promise<AkahuTransactionsResponse> {
    return this.getTransactionsPage(token, query);
  }

  private async getJson<T>(path: string, token: AkahuToken) {
    const response = await this.fetchAkahu(path, {
      headers: this.userHeaders(token),
      cache: "no-store"
    });

    return this.readResponse<T>(response);
  }

  // Keeps requesting pages until Akahu has no next page
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
    const response = await this.fetchAkahu(path, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    return this.readResponse<T>(response);
  }

  // Wraps Akahu fetch calls so network failures include the endpoint and root cause.
  private async fetchAkahu(path: string, init: RequestInit) {
    const url = this.buildUrl(path);

    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs)
      });
    } catch (error) {
      throw new Error(`Akahu API network request failed for ${url}: ${formatFetchFailure(error)}`);
    }
  }

  private buildUrl(path: string) {
    if (path.startsWith("http")) {
      return path;
    }

    return `${this.config.baseUrl}${path}`;
  }

  private userHeaders(token: AkahuToken) {
    const appToken = token.appToken || this.getConfiguredAppToken("Akahu API request");

    return {
      Authorization: `Bearer ${token.userToken}`,
      "X-Akahu-Id": appToken
    };
  }

  // Include Akahu's response text when an API request fails
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

  private getConfiguredAppToken(context: string) {
    if (!this.config.appToken) {
      throw new Error(`AKAHU_APP_TOKEN is required for ${context}.`);
    }

    return this.config.appToken;
  }
}

// Creates an Akahu client from environment variables
export function createAkahuClientFromEnv() {
  const appToken = process.env.AKAHU_APP_TOKEN;

  return new AkahuClient({
    baseUrl: process.env.AKAHU_BASE_URL || "https://api.akahu.io/v1",
    appToken,
    appSecret: process.env.AKAHU_APP_SECRET,
    oauthScope: process.env.AKAHU_OAUTH_SCOPE || "ONEOFF TRANSACTIONS ACCOUNT",
    requestTimeoutMs: getAkahuRequestTimeoutMs(),
    redirectUri: process.env.AKAHU_REDIRECT_URI || `${process.env.APP_BASE_URL || "http://localhost:3000"}/api/akahu/callback`,
    oauthUrl: process.env.AKAHU_OAUTH_URL || "https://oauth.akahu.nz"
  });
}

function addCursorToPath(path: string, cursor?: string | null) {
  if (!cursor) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cursor=${encodeURIComponent(cursor)}`;
}

function addTransactionQueryToPath(path: string, query: AkahuTransactionQuery) {
  const params = new URLSearchParams();

  if (query.start) {
    params.set("start", query.start);
  }

  if (query.end) {
    params.set("end", query.end);
  }

  if (query.cursor) {
    params.set("cursor", query.cursor);
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
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

// Reads the Akahu request timeout with a conservative default for user-facing flows.
function getAkahuRequestTimeoutMs() {
  const configuredTimeout = Number.parseInt(process.env.AKAHU_REQUEST_TIMEOUT_MS || "", 10);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return 12000;
}

// Preserves Node fetch failure causes that are otherwise collapsed into "fetch failed".
function formatFetchFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown fetch failure.";
  }

  const cause = getErrorCause(error);
  return cause ? `${error.message}. ${cause}` : error.message;
}

// Extracts common undici/Node cause metadata without assuming a specific error class.
function getErrorCause(error: Error) {
  const cause = error.cause;

  if (cause instanceof Error) {
    return cause.message;
  }

  if (isRecord(cause)) {
    const code = typeof cause.code === "string" ? cause.code : "";
    const message = typeof cause.message === "string" ? cause.message : "";
    return [code, message].filter(Boolean).join(": ");
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
