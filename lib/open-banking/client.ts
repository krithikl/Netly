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

  async getAccountTransactions(token: PnzTokenSet, accountId: string, from: string, to: string) {
    const params = new URLSearchParams({
      fromBookingDateTime: from,
      toBookingDateTime: to
    });

    return this.getJson(
      `/open-banking-nz/${this.config.apiVersion}/accounts/${encodeURIComponent(accountId)}/transactions?${params.toString()}`,
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
