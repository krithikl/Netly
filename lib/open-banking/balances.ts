import { getAkahuAccounts, getAvailableBalance, type AkahuAccountsResponse } from "@/lib/open-banking/accounts";

export function getAkahuAvailableBalance(response: AkahuAccountsResponse) {
  return getAvailableBalance(getAkahuAccounts(response));
}
