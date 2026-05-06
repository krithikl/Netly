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

export type DomesticPaymentInitiation = {
  InstructedAmount: {
    Amount: string;
    Currency: "NZD";
  };
  InstructionIdentification: string;
  RemittanceInformation: {
    Reference: {
      CreditorReference: {
        Reference: string;
        Particulars: string;
        Code: string;
      };
      CreditorName: string;
    };
  };
  CreditorAccount: {
    Identification: string;
    SchemeName: "BECSElectronicCredit";
    SecondaryIdentification?: string;
    Name: string;
  };
  DebtorAccountRelease: boolean;
  EndToEndIdentification: string;
};

export type DomesticPaymentRisk = {
  EndUserAppName: string;
  EndUserAppVersion: string;
  PaymentContextCode: string;
  MerchantName: string;
  MerchantNZBN: string;
  MerchantCategoryCode: string;
  MerchantCustomerIdentification: string;
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

  getConfig() {
    return this.config;
  }

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

  async createDomesticPaymentConsent(
    input: {
      initiation: DomesticPaymentInitiation;
      risk: DomesticPaymentRisk;
    },
    token: PnzTokenSet
  ) {
    return this.postJson(
      `/open-banking-nz/${this.config.apiVersion}/domestic-payment-consents`,
      {
        Data: {
          Consent: input.initiation
        },
        Risk: input.risk
      },
      token,
      {
        "x-idempotency-key": crypto.randomUUID()
      }
    );
  }

  async submitDomesticPayment(
    input: {
      consentId: string;
      initiation: DomesticPaymentInitiation;
      risk: DomesticPaymentRisk;
    },
    token: PnzTokenSet
  ) {
    return this.postJson(
      `/open-banking-nz/${this.config.apiVersion}/domestic-payments`,
      {
        Data: {
          ConsentId: input.consentId,
          Initiation: input.initiation
        },
        Risk: input.risk
      },
      token,
      {
        "x-idempotency-key": crypto.randomUUID()
      }
    );
  }

  async getAccounts(token: PnzTokenSet) {
    return this.getJson(`/open-banking-nz/${this.config.apiVersion}/accounts`, token);
  }

  async getBalances(token: PnzTokenSet) {
    return this.getJson(`/open-banking-nz/${this.config.apiVersion}/balances`, token);
  }

  async getTransactions(token: PnzTokenSet, from?: string, to?: string) {
    const params = this.transactionDateParams(from, to);

    return this.getJson(
      `/open-banking-nz/${this.config.apiVersion}/transactions${params}`,
      token
    );
  }

  async getAllTransactions(token: PnzTokenSet, from?: string, to?: string) {
    const params = this.transactionDateParams(from, to);

    return this.getAllPages(`/open-banking-nz/${this.config.apiVersion}/transactions${params}`, token);
  }

  async getAccountTransactions(token: PnzTokenSet, accountId: string, from?: string, to?: string) {
    const params = this.transactionDateParams(from, to);

    return this.getJson(
      `/open-banking-nz/${this.config.apiVersion}/accounts/${encodeURIComponent(accountId)}/transactions${params}`,
      token
    );
  }

  async getAllAccountTransactions(token: PnzTokenSet, accountId: string, from?: string, to?: string) {
    const params = this.transactionDateParams(from, to);

    return this.getAllPages(
      `/open-banking-nz/${this.config.apiVersion}/accounts/${encodeURIComponent(accountId)}/transactions${params}`,
      token
    );
  }

  async getClientCredentialsToken(clientAssertion: string, tokenEndpoint = "/oauth/v2.0/token") {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "openid accounts payments",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientAssertion
    });

    const response = await fetch(`${this.config.baseUrl}${tokenEndpoint}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "x-fapi-interaction-id": crypto.randomUUID()
      },
      body
    });

    return this.parseResponse(response) as Promise<{
      access_token: string;
      expires_in: number;
      token_type: string;
    }>;
  }

  async pushAuthorizationRequest(requestJwt: string, clientAssertion: string) {
    const body = new URLSearchParams({
      request: requestJwt,
      client_assertion: clientAssertion,
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    });

    const response = await fetch(`${this.config.baseUrl}/oauth/v2.0/par`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "x-fapi-interaction-id": crypto.randomUUID()
      },
      body
    });

    return this.parseResponse(response) as Promise<{
      request_uri: string;
      expires_in: number;
    }>;
  }

  async exchangeAuthorizationCode({
    clientAssertion,
    code,
    codeVerifier,
    tokenEndpoint = "/oauth/v2.0/token"
  }: {
    clientAssertion: string;
    code: string;
    codeVerifier: string;
    tokenEndpoint?: string;
  }) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientAssertion
    });

    const response = await fetch(`${this.config.baseUrl}${tokenEndpoint}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "x-fapi-interaction-id": crypto.randomUUID()
      },
      body
    });

    return this.parseResponse(response) as Promise<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      id_token?: string;
    }>;
  }

  private async getJson(path: string, token?: PnzTokenSet) {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      headers: this.headers(token)
    });

    return this.parseResponse(response);
  }

  private transactionDateParams(from?: string, to?: string) {
    const params = new URLSearchParams();

    if (from) {
      params.set("fromBookingDateTime", from);
    }

    if (to) {
      params.set("toBookingDateTime", to);
    }

    const query = params.toString();
    return query ? `?${query}` : "";
  }

  private async getAllPages(path: string, token?: PnzTokenSet) {
    const pages: unknown[] = [];
    let nextPath: string | undefined = path;
    let pageCount = 0;

    while (nextPath && pageCount < 10) {
      const page = await this.getJson(nextPath, token) as {
        Data?: {
          Transaction?: unknown[];
        };
        Links?: {
          Next?: string;
        };
      };

      pages.push(page);
      pageCount += 1;
      nextPath = page.Links?.Next ? this.toPath(page.Links.Next) : undefined;
    }

    return {
      pages,
      Data: {
        Transaction: pages.flatMap((page) =>
          (page as { Data?: { Transaction?: unknown[] } }).Data?.Transaction || []
        )
      }
    };
  }

  private async postJson(path: string, body: unknown, token?: PnzTokenSet, extraHeaders: Record<string, string> = {}) {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...this.headers(token),
        "content-type": "application/json",
        ...extraHeaders
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

  private toPath(value: string) {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      return `${url.pathname}${url.search}`;
    }

    return value;
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
