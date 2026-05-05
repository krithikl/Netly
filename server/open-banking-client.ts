type PnzConfig = {
  baseUrl: string;
  apiVersion: string;
  clientId: string;
  clientKeyId: string;
  redirectUri: string;
  privateKeyPem: string;
};

type PnzTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
};

type CreateConsentInput = {
  transactionFromDateTime: string;
  transactionToDateTime: string;
  expirationDateTime: string;
};

const DEFAULT_PERMISSIONS = [
  "ReadAccountsDetail",
  "ReadBalances",
  "ReadTransactionsDetail",
  "ReadTransactionsCredits",
  "ReadTransactionsDebits"
];

export class OpenBankingClient {
  constructor(private readonly config: PnzConfig) {}

  async discover() {
    return this.getJson("/.well-known/openid-configuration");
  }

  async createAccountAccessConsent(input: CreateConsentInput, token: PnzTokenSet) {
    return this.postJson(
      `/open-banking-nz/${this.config.apiVersion}/account-access-consents`,
      {
        Data: {
          Consent: {
            Permissions: DEFAULT_PERMISSIONS,
            TransactionFromDateTime: input.transactionFromDateTime,
            TransactionToDateTime: input.transactionToDateTime,
            ExpirationDateTime: input.expirationDateTime
          }
        },
        Risk: {}
      },
      token
    );
  }

  async getAccounts(token: PnzTokenSet) {
    return this.getJson(`/open-banking-nz/${this.config.apiVersion}/accounts`, token);
  }

  async getBalances(token: PnzTokenSet) {
    return this.getJson(`/open-banking-nz/${this.config.apiVersion}/balances`, token);
  }

  async getTransactions(token: PnzTokenSet, from: string, to: string) {
    const params = new URLSearchParams({
      fromBookingDateTime: from,
      toBookingDateTime: to
    });

    return this.getJson(
      `/open-banking-nz/${this.config.apiVersion}/transactions?${params.toString()}`,
      token
    );
  }

  private async getJson(path: string, token?: PnzTokenSet) {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      headers: this.headers(token)
    });

    return this.parseResponse(response);
  }

  private async postJson(path: string, body: unknown, token?: PnzTokenSet) {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...this.headers(token),
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    return this.parseResponse(response);
  }

  private headers(token?: PnzTokenSet) {
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-fapi-interaction-id": crypto.randomUUID()
    };

    if (token) {
      headers.authorization = `Bearer ${token.accessToken}`;
    }

    return headers;
  }

  private async parseResponse(response: Response) {
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(`PNZ API request failed: ${response.status} ${JSON.stringify(body)}`);
    }

    return body;
  }
}

export function createOpenBankingClientFromEnv() {
  const required = [
    "PNZ_BASE_URL",
    "PNZ_API_VERSION",
    "PNZ_CLIENT_ID",
    "PNZ_CLIENT_KEY_ID",
    "PNZ_REDIRECT_URI",
    "PNZ_CLIENT_PRIVATE_KEY"
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return new OpenBankingClient({
    baseUrl: process.env.PNZ_BASE_URL!,
    apiVersion: process.env.PNZ_API_VERSION!,
    clientId: process.env.PNZ_CLIENT_ID!,
    clientKeyId: process.env.PNZ_CLIENT_KEY_ID!,
    redirectUri: process.env.PNZ_REDIRECT_URI!,
    privateKeyPem: process.env.PNZ_CLIENT_PRIVATE_KEY!
  });
}
