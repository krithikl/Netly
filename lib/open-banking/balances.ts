export type PnzBalance = {
  AccountId?: string;
  Type?: string;
  Amount?: {
    Amount?: string;
    Currency?: string;
  };
  CreditDebitIndicator?: "Credit" | "Debit";
  DateTime?: string;
};

export type PnzBalancesResponse = {
  Data?: {
    Balance?: PnzBalance[];
  };
  Links?: {
    Self?: string;
    First?: string;
    Prev?: string;
    Next?: string;
    Last?: string;
  };
  Meta?: Record<string, unknown>;
};

export type NormalizedBalance = {
  accountId: string;
  type: string;
  amount: number;
  currency: string;
  dateTime?: string;
};

const balanceTypePriority = [
  "ForwardAvailable",
  "InterimAvailable",
  "ClosingAvailable",
  "InterimBooked",
  "ClosingBooked",
  "Current"
];

export function normalizePnzBalances(response: PnzBalancesResponse) {
  const balances = (response.Data?.Balance || []).map(toNormalizedBalance);
  const selectedByAccount = new Map<string, NormalizedBalance>();

  balances.forEach((balance) => {
    const current = selectedByAccount.get(balance.accountId);

    if (!current || getBalancePriority(balance.type) < getBalancePriority(current.type)) {
      selectedByAccount.set(balance.accountId, balance);
    }
  });

  const selectedBalances = [...selectedByAccount.values()];

  return {
    availableBalance: selectedBalances.reduce((total, balance) => total + balance.amount, 0),
    balances,
    selectedBalances
  };
}

function toNormalizedBalance(balance: PnzBalance): NormalizedBalance {
  const amount = Number(balance.Amount?.Amount || 0);
  const sign = balance.CreditDebitIndicator === "Debit" ? -1 : 1;

  return {
    accountId: balance.AccountId || "PNZ account",
    type: balance.Type || "Unknown",
    amount: sign * Math.abs(amount),
    currency: balance.Amount?.Currency || "NZD",
    dateTime: balance.DateTime
  };
}

function getBalancePriority(type: string) {
  const index = balanceTypePriority.indexOf(type);
  return index === -1 ? balanceTypePriority.length : index;
}
