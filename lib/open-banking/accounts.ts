export type PnzAccount = {
  AccountId?: string;
  Currency?: string;
  Nickname?: string;
  Description?: string;
  AccountType?: string;
  AccountSubType?: string;
  Account?: {
    SchemeName?: string;
    Identification?: string;
    Name?: string;
    SecondaryIdentification?: string;
  };
};

export type PnzAccountsResponse = {
  Data?: {
    Account?: PnzAccount[];
  };
  Links?: {
    Self?: string;
    First?: string;
    Last?: string;
  };
  Meta?: Record<string, unknown>;
};

export type NormalizedAccount = {
  accountId: string;
  displayName: string;
  identification: string;
  currency: string;
  accountType: string;
  accountSubType: string;
  ownerName?: string;
};

export function normalizePnzAccounts(response: PnzAccountsResponse) {
  return (response.Data?.Account || []).map((account) => {
    const displayName =
      usable(account.Nickname) ||
      usable(account.Description) ||
      usable(account.Account?.Name) ||
      usable(account.AccountSubType) ||
      usable(account.AccountId) ||
      "PNZ account";

    return {
      accountId: account.AccountId || account.Account?.Identification || "PNZ account",
      displayName,
      identification: account.Account?.Identification || account.AccountId || "Unknown account",
      currency: account.Currency || "NZD",
      accountType: account.AccountType || "Account",
      accountSubType: account.AccountSubType || ""
    };
  });
}

function usable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.toLowerCase() !== "string" ? trimmed : "";
}
