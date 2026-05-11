import { categorizeTransactions } from "./categorization";
import dummyTransactions from "@/lib/open-banking/dummy-transactions.json";
import type { Budget, CardProduct, RawBankTransaction, Transaction } from "./types";

export const payday = "2026-05-15";

export const currentBalance = 3268.42;

export const budgets: Budget[] = [
  { category: "Housing", limit: 1200 },
  { category: "Groceries", limit: 760 },
  { category: "Travel", limit: 450 },
  { category: "Eating out", limit: 340 },
  { category: "Fuel", limit: 320 },
  { category: "Shopping", limit: 280 },
  { category: "Transport", limit: 260 },
  { category: "Entertainment", limit: 240 },
  { category: "Utilities", limit: 220 },
  { category: "Health", limit: 180 }
];

export const cardProducts: CardProduct[] = [
  {
    name: "Current debit card baseline",
    issuer: "Your bank",
    network: "Visa",
    tier: "Debit",
    annualFee: 0,
    cashbackRate: 0,
    perksValue: 0,
    rewardProgram: "None",
    earnDescription: "No credit-card rewards.",
    sourceUrl: "https://www.sorted.org.nz/guides/debt/credit-cards/",
    brandColor: "#455a64",
    note: "Baseline with no rewards or annual fee."
  },
  {
    name: "American Express Airpoints Card",
    issuer: "American Express",
    network: "American Express",
    tier: "No annual fee",
    annualFee: 0,
    cashbackRate: 1 / 100,
    perksValue: 0,
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$100 eligible spend = 1 Airpoints Dollar.",
    sourceUrl: "https://www.americanexpress.com/nz/credit-cards/airnz-base-credit-card/index.shtml",
    brandColor: "#006fcf",
    note: "No annual fee Airpoints option; Amex acceptance may vary by merchant."
  },
  {
    name: "American Express Airpoints Platinum",
    issuer: "American Express",
    network: "American Express",
    tier: "Platinum",
    annualFee: 195,
    cashbackRate: 1 / 70,
    perksValue: 120,
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$70 eligible spend = 1 Airpoints Dollar.",
    sourceUrl: "https://www.americanexpress.com/nz/credit-cards/airpoints-cards/airpoints-platinum-card/",
    brandColor: "#006fcf",
    note: "High Airpoints earn rate plus estimated value for travel insurance and lounge/status benefits."
  },
  {
    name: "American Express Airpoints Platinum Reserve",
    issuer: "American Express",
    network: "American Express",
    tier: "Platinum Reserve",
    annualFee: 395,
    cashbackRate: 1 / 70,
    perksValue: 210,
    rewardProgram: "Airpoints Dollars",
    earnDescription: "Premium Airpoints card; fee and perks are higher than Platinum.",
    sourceUrl: "https://www.americanexpress.com/nz/content/credit-cards/rates-and-fees/",
    brandColor: "#1f4f7a",
    note: "Premium option included to test high-fee/high-perk comparison behaviour."
  },
  {
    name: "ASB Visa Light",
    issuer: "ASB",
    network: "Visa",
    tier: "Low rate",
    annualFee: 0,
    cashbackRate: 0,
    perksValue: 0,
    rewardProgram: "None",
    earnDescription: "No rewards; designed around low/no fees and lower purchase rate.",
    sourceUrl: "https://www.asb.co.nz/credit-cards/visa-light.html",
    brandColor: "#f9b000",
    note: "Useful benchmark for users who may carry a balance or want no annual fee."
  },
  {
    name: "Sharesies Debit Mastercard",
    issuer: "Sharesies",
    network: "Mastercard",
    tier: "Debit",
    annualFee: 12,
    cashbackRate: 0.01,
    perksValue: 0,
    rewardProgram: "Investback",
    earnDescription: "1% Investback on eligible purchases, invested weekly.",
    sourceUrl: "https://www.sharesies.nz/spend",
    brandColor: "#ff7ab6",
    note: "Debit benchmark with $12 annual Spend fee for Sharesies plan customers; fee is $25 if not on a plan. Investback and fees can change."
  },
  {
    name: "ASB Visa Rewards",
    issuer: "ASB",
    network: "Visa",
    tier: "Rewards",
    annualFee: 45,
    cashbackRate: 1 / 150,
    perksValue: 0,
    rewardProgram: "True Rewards",
    earnDescription: "$150 eligible spend = 1 True Rewards dollar.",
    sourceUrl: "https://www.asb.co.nz/credit-cards/visa-rewards.html",
    brandColor: "#f9b000",
    note: "Low-fee Visa rewards card with broad acceptance."
  },
  {
    name: "ASB Visa Platinum Rewards",
    issuer: "ASB",
    network: "Visa",
    tier: "Platinum",
    annualFee: 80,
    cashbackRate: 1 / 100,
    perksValue: 80,
    rewardProgram: "True Rewards",
    earnDescription: "$100 eligible spend = 1 True Rewards dollar.",
    sourceUrl: "https://www.asb.co.nz/credit-cards/visa-platinum-rewards.html",
    brandColor: "#f9b000",
    note: "Higher earn rate with estimated travel-insurance value."
  },
  {
    name: "ANZ Airpoints Visa Platinum",
    issuer: "ANZ",
    network: "Visa",
    tier: "Platinum",
    annualFee: 150,
    cashbackRate: 1 / 110,
    perksValue: 70,
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$110 eligible spend = 1 Airpoints Dollar.",
    sourceUrl: "https://www.anz.co.nz/personal/credit-cards/",
    brandColor: "#0073cf",
    note: "Airpoints Visa with estimated travel-insurance value; exact terms should be verified."
  },
  {
    name: "Westpac Airpoints Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "Standard",
    annualFee: 70,
    cashbackRate: 1 / 150,
    perksValue: 0,
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$150 eligible spend = 1 Airpoints Dollar up to monthly tier cap.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/airpoints/westpac-airpoints-mastercard/",
    brandColor: "#d50000",
    note: "Lower-fee Airpoints Mastercard; earn rate is tiered by monthly spend."
  },
  {
    name: "Westpac Airpoints Platinum Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "Platinum",
    annualFee: 145,
    cashbackRate: 1 / 110,
    perksValue: 85,
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$110 eligible spend = 1 Airpoints Dollar up to monthly tier cap.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/airpoints/westpac-airpoints-platinum-mastercard/",
    brandColor: "#d50000",
    note: "Airpoints Platinum Mastercard with estimated Koru/travel benefit value."
  },
  {
    name: "Westpac Airpoints World Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "World",
    annualFee: 390,
    cashbackRate: 1 / 95,
    perksValue: 210,
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$95 eligible spend = 1 Airpoints Dollar up to monthly tier cap.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/airpoints/westpac-airpoints-world-mastercard/",
    brandColor: "#b00020",
    note: "Premium Airpoints Mastercard with estimated valet/Koru/travel benefit value."
  },
  {
    name: "Westpac hotpoints Platinum Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "Platinum",
    annualFee: 145,
    cashbackRate: 0.006,
    perksValue: 80,
    rewardProgram: "hotpoints",
    earnDescription: "1.5 hotpoints per $1 up to monthly tier cap; cash value estimated.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/hotpoints/hotpoints-platinum-mastercard/",
    brandColor: "#d50000",
    note: "Included with a conservative cash-equivalent placeholder until hotpoints redemption tables are modelled."
  },
  {
    name: "TSB Platinum Mastercard",
    issuer: "TSB",
    network: "Mastercard",
    tier: "Platinum",
    annualFee: 90,
    cashbackRate: 1 / 100,
    perksValue: 70,
    rewardProgram: "Cashback",
    earnDescription: "$1 cashback per $100 eligible spend.",
    sourceUrl: "https://www.tsb.co.nz/cards/platinum-mastercard",
    brandColor: "#00a3ad",
    note: "Straightforward cashback card with estimated insurance benefit value."
  }
];

export const rawBankTransactions: RawBankTransaction[] = [
  { id: "txn_001", date: "2026-05-04", description: "VISA DEBIT NEW WORLD METRO AUCKLAND 0312", account: "Everyday", amount: -84.3, status: "Booked" },
  { id: "txn_002", date: "2026-05-04", description: "AT HOP TOPUP 4028 AUCKLAND", account: "Everyday", amount: -12.0, status: "Booked" },
  { id: "txn_003", date: "2026-05-03", description: "WOOLWORTHS MT EDEN 9201", account: "Everyday", amount: -126.4, status: "Booked" },
  { id: "txn_004", date: "2026-05-03", description: "BEST UGLY BAGELS NEWMARKET", account: "Everyday", amount: -24.8, status: "Booked" },
  { id: "txn_005", date: "2026-05-02", description: "PAYROLL SALARY ACME LTD", account: "Everyday", amount: 2860.0, status: "Booked" },
  { id: "txn_006", date: "2026-05-02", description: "MERCURY ENERGY ONLINE BILLPAY", account: "Bills", amount: -142.2, status: "Booked" },
  { id: "txn_007", date: "2026-05-01", description: "SPOTIFY P2F2A STOCKHOLM", account: "Everyday", amount: -16.99, status: "Booked" },
  { id: "txn_008", date: "2026-05-01", description: "UBER TRIP HELP.UBER.COM", account: "Everyday", amount: -23.5, status: "Booked" },
  { id: "txn_009", date: "2026-04-30", description: "COFFEE LAB 0421 AUCKLAND", account: "Everyday", amount: -7.5, status: "Booked" },
  { id: "txn_010", date: "2026-04-30", description: "PNS ROYAL OAK EFTPOS 7739", account: "Everyday", amount: -92.35, status: "Booked" },
  { id: "txn_011", date: "2026-04-29", description: "Z ENERGY GREENLANE 6601", account: "Everyday", amount: -88.0, status: "Booked" },
  { id: "txn_012", date: "2026-04-28", description: "NETFLIX.COM 8665797172", account: "Bills", amount: -18.49, status: "Booked" },
  { id: "txn_013", date: "2026-04-28", description: "KMART ST LUKES 10139", account: "Everyday", amount: -46.0, status: "Booked" },
  { id: "txn_014", date: "2026-04-27", description: "BEST UGLY BAGELS NEWMARKET", account: "Everyday", amount: -21.8, status: "Booked" },
  { id: "txn_015", date: "2026-04-26", description: "AUTOPAY RENT PROPERTY 12A", account: "Bills", amount: -720.0, status: "Booked" },
  { id: "txn_016", date: "2026-04-25", description: "CHEMIST WAREHOUSE ONLINE", account: "Everyday", amount: -34.7, status: "Booked" },
  { id: "txn_017", date: "2026-04-24", description: "UBER TRIP HELP.UBER.COM", account: "Everyday", amount: -19.4, status: "Booked" },
  { id: "txn_018", date: "2026-04-23", description: "WOOLWORTHS MT EDEN 9201", account: "Everyday", amount: -117.2, status: "Booked" },
  { id: "txn_019", date: "2026-04-22", description: "HOYTS SYLVIA PARK TICKETS", account: "Everyday", amount: -39.0, status: "Booked" },
  { id: "txn_020", date: "2026-04-21", description: "HALLENSTEIN BROTHERS QUEEN ST", account: "Everyday", amount: -129.99, status: "Booked" },
  { id: "txn_021", date: "2026-04-20", description: "SPARK NZ MOBILE AUTOPAY", account: "Bills", amount: -65.0, status: "Booked" },
  { id: "txn_022", date: "2026-04-19", description: "AKL AIRPORT PARKING ONLINE", account: "Everyday", amount: -52.0, status: "Booked" },
  { id: "txn_023", date: "2026-04-18", description: "SPOTIFY P2F2A STOCKHOLM", account: "Everyday", amount: -16.99, status: "Booked" },
  { id: "txn_024", date: "2026-04-17", description: "FARRO FRESH GREY LYNN", account: "Everyday", amount: -76.8, status: "Booked" },
  { id: "txn_025", date: "2026-04-16", description: "AMANO BRITOMART AUCKLAND", account: "Everyday", amount: -86.4, status: "Booked" },
  { id: "txn_026", date: "2026-04-15", description: "Z STATION PONSONBY 4921", account: "Everyday", amount: -74.3, status: "Booked" },
  { id: "txn_027", date: "2026-04-14", description: "APPLE.COM/BILL ICLOUD", account: "Bills", amount: -1.69, status: "Booked" },
  { id: "txn_028", date: "2026-04-13", description: "BUNNINGS MT ROSKILL", account: "Everyday", amount: -67.4, status: "Booked" },
  { id: "txn_029", date: "2026-04-12", description: "AUTOPAY RENT PROPERTY 12A", account: "Bills", amount: -720.0, status: "Booked" },
  { id: "txn_030", date: "2026-04-11", description: "TRANSFER TO SAVINGS 38-9000", account: "Everyday", amount: -350.0, status: "Booked" },
  { id: "txn_031", date: "2026-04-10", description: "PAYROLL SALARY ACME LTD", account: "Everyday", amount: 2860.0, status: "Booked" },
  { id: "txn_032", date: "2026-04-09", description: "WOOLWORTHS MT EDEN 9201", account: "Everyday", amount: -108.35, status: "Booked" },
  { id: "txn_033", date: "2026-04-08", description: "LIME RIDE AUCKLAND", account: "Everyday", amount: -8.2, status: "Booked" },
  { id: "txn_034", date: "2026-04-07", description: "DISNEY PLUS MONTHLY", account: "Bills", amount: -14.99, status: "Booked" },
  { id: "txn_035", date: "2026-04-06", description: "WISE FX FEE CARD PAYMENT", account: "Everyday", amount: -6.15, status: "Booked" },
  { id: "txn_036", date: "2026-04-05", description: "COUNTDOWN ONLINE 943929", account: "Everyday", amount: -151.7, status: "Booked" },
  { id: "txn_037", date: "2026-04-04", description: "BURGER BURGER PONSONBY", account: "Everyday", amount: -62.8, status: "Booked" },
  { id: "txn_038", date: "2026-04-03", description: "AUCKLAND TRANSPORT HOP", account: "Everyday", amount: -20.0, status: "Booked" },
  { id: "txn_039", date: "2026-04-02", description: "SOUTHERN CROSS HEALTH", account: "Bills", amount: -83.5, status: "Booked" },
  { id: "txn_040", date: "2026-04-01", description: "SPOTIFY P2F2A STOCKHOLM", account: "Everyday", amount: -16.99, status: "Booked" },
  { id: "txn_041", date: "2026-05-05", description: "UBER EATS PENDING", account: "Everyday", amount: -41.2, status: "Pending" },
  { id: "txn_042", date: "2026-05-07", description: "AUTOPAY RENT PROPERTY 12A", account: "Bills", amount: -720.0, status: "Upcoming" },
  { id: "txn_043", date: "2026-05-09", description: "DISNEY PLUS MONTHLY", account: "Bills", amount: -14.99, status: "Upcoming" },
  { id: "txn_044", date: "2026-05-10", description: "SPARK NZ MOBILE AUTOPAY", account: "Bills", amount: -65.0, status: "Upcoming" },
  { id: "txn_045", date: "2026-05-04", description: "SQ *R4X9 CENTRAL 8882", account: "Everyday", amount: -29.8, status: "Booked" },
  { id: "txn_046", date: "2026-04-26", description: "TST* MCR 928 AUCKLAND", account: "Everyday", amount: -54.1, status: "Booked" },
  { id: "txn_047", date: "2026-04-18", description: "CARD PURCHASE 4YH8K9", account: "Everyday", amount: -18.0, status: "Booked" },
  { id: "txn_048", date: "2026-03-29", description: "PAYROLL SALARY ACME LTD", account: "Everyday", amount: 2860.0, status: "Booked" },
  { id: "txn_049", date: "2026-03-28", description: "AUTOPAY RENT PROPERTY 12A", account: "Bills", amount: -720.0, status: "Booked" },
  { id: "txn_050", date: "2026-03-27", description: "WOOLWORTHS MT EDEN 9201", account: "Everyday", amount: -104.2, status: "Booked" },
  { id: "txn_051", date: "2026-03-25", description: "Z ENERGY GREENLANE 6601", account: "Everyday", amount: -81.4, status: "Booked" },
  { id: "txn_052", date: "2026-03-22", description: "SPOTIFY P2F2A STOCKHOLM", account: "Everyday", amount: -16.99, status: "Booked" },
  { id: "txn_053", date: "2026-03-20", description: "NEW WORLD METRO AUCKLAND 0312", account: "Everyday", amount: -96.7, status: "Booked" },
  { id: "txn_054", date: "2026-03-18", description: "UBER TRIP HELP.UBER.COM", account: "Everyday", amount: -31.2, status: "Booked" },
  { id: "txn_055", date: "2026-03-16", description: "AMANO BRITOMART AUCKLAND", account: "Everyday", amount: -74.5, status: "Booked" },
  { id: "txn_056", date: "2026-03-14", description: "DISNEY PLUS MONTHLY", account: "Bills", amount: -14.99, status: "Booked" },
  { id: "txn_057", date: "2026-03-11", description: "BUNNINGS MT ROSKILL", account: "Everyday", amount: -119.2, status: "Booked" },
  { id: "txn_058", date: "2026-03-08", description: "SOUTHERN CROSS HEALTH", account: "Bills", amount: -83.5, status: "Booked" },
  { id: "txn_059", date: "2026-03-05", description: "COUNTDOWN ONLINE 943929", account: "Everyday", amount: -139.45, status: "Booked" },
  { id: "txn_060", date: "2026-02-28", description: "PAYROLL SALARY ACME LTD", account: "Everyday", amount: 2860.0, status: "Booked" },
  { id: "txn_061", date: "2026-02-27", description: "AUTOPAY RENT PROPERTY 12A", account: "Bills", amount: -720.0, status: "Booked" },
  { id: "txn_062", date: "2026-02-25", description: "PAKNSAVE ROYAL OAK EFTPOS", account: "Everyday", amount: -183.6, status: "Booked" },
  { id: "txn_063", date: "2026-02-22", description: "SPOTIFY P2F2A STOCKHOLM", account: "Everyday", amount: -16.99, status: "Booked" },
  { id: "txn_064", date: "2026-02-20", description: "HALLENSTEIN BROTHERS QUEEN ST", account: "Everyday", amount: -92.0, status: "Booked" },
  { id: "txn_065", date: "2026-02-17", description: "AKL AIRPORT PARKING ONLINE", account: "Everyday", amount: -48.0, status: "Booked" },
  { id: "txn_066", date: "2026-02-14", description: "NETFLIX.COM 8665797172", account: "Bills", amount: -18.49, status: "Booked" },
  { id: "txn_067", date: "2026-02-12", description: "FARRO FRESH GREY LYNN", account: "Everyday", amount: -88.15, status: "Booked" },
  { id: "txn_068", date: "2026-02-09", description: "SQ *BEACH ROAD 0019", account: "Everyday", amount: -64.3, status: "Booked" },
  { id: "txn_069", date: "2026-01-28", description: "AUTOPAY RENT PROPERTY 12A", account: "Bills", amount: -720.0, status: "Booked" },
  { id: "txn_070", date: "2026-01-26", description: "WOOLWORTHS MT EDEN 9201", account: "Everyday", amount: -132.8, status: "Booked" },
  { id: "txn_071", date: "2026-01-21", description: "SPOTIFY P2F2A STOCKHOLM", account: "Everyday", amount: -16.99, status: "Booked" },
  { id: "txn_072", date: "2026-01-16", description: "Z ENERGY GREENLANE 6601", account: "Everyday", amount: -76.4, status: "Booked" }
];

const demoAkahuCategories: Record<string, { name: string; group: string }> = {
  Groceries: { name: "Supermarkets & Groceries", group: "Groceries" },
  "Eating out": { name: "Cafes & Restaurants", group: "Lifestyle" },
  Transport: { name: "Public Transport", group: "Transport" },
  Fuel: { name: "Fuel", group: "Transport" },
  Housing: { name: "Rent", group: "Housing" },
  Utilities: { name: "Utilities", group: "Bills" },
  Shopping: { name: "Retail", group: "Shopping" },
  Subscriptions: { name: "Subscriptions", group: "Entertainment" },
  Health: { name: "Health & Pharmacy", group: "Health" },
  Insurance: { name: "Insurance", group: "Insurance" },
  Education: { name: "Education", group: "Education" },
  Entertainment: { name: "Movies & Events", group: "Entertainment" },
  Travel: { name: "Travel", group: "Travel" },
  Transfers: { name: "Account Transfers", group: "Transfers" },
  Fees: { name: "Bank Fees", group: "Fees" },
  Income: { name: "Salary & Wages", group: "Income" },
  "Needs review": { name: "Uncategorised", group: "Needs review" }
};

const demoMerchantWebsites: Record<string, string> = {
  Woolworths: "https://www.woolworths.co.nz/",
  "New World": "https://www.newworld.co.nz/",
  "Pak'nSave": "https://www.paknsave.co.nz/",
  Spotify: "https://www.spotify.com/nz/",
  Netflix: "https://www.netflix.com/nz/",
  "Z Energy": "https://z.co.nz/",
  Kmart: "https://www.kmart.co.nz/",
  "Chemist Warehouse": "https://www.chemistwarehouse.co.nz/"
};

export const transactions: Transaction[] = (dummyTransactions as { items?: Transaction[] }).items || [];

function toAkahuDemoTransaction(txn: ReturnType<typeof categorizeTransactions>[number], index: number): Transaction {
  const account = getDemoAccount(txn.account);
  const category = getDemoAkahuCategory(txn.category);
  const merchant = getDemoMerchant(txn.merchant);
  const pending = txn.status === "Pending";

  return {
    _id: pending ? undefined : txn.id.replace("txn_", "trans_demo_"),
    _account: account.id,
    _connection: "conn_demo_netly",
    created_at: getDemoCreatedAt(txn.date),
    updated_at: getDemoUpdatedAt(txn.date),
    date: `${txn.date}T12:00:00.000Z`,
    description: txn.rawDescription,
    amount: txn.amount,
    balance: getDemoBalanceAfterTransaction(txn, index),
    type: getDemoTransactionType(txn),
    merchant,
    category,
    meta: getDemoTransactionMeta(txn),
    pending,
    netly: {
      accountName: txn.account,
      accountCurrency: account.currency
    }
  };
}

function getDemoAccount(accountName: string) {
  if (accountName === "Bills") {
    return {
      id: "acc_demo_bills",
      currency: "NZD",
      openingBalance: 1000
    };
  }

  return {
    id: "acc_demo_everyday",
    currency: "NZD",
    openingBalance: 2268.42
  };
}

function getDemoAkahuCategory(category: string) {
  const categoryDetails = demoAkahuCategories[category] || {
    name: category,
    group: category
  };

  return {
    _id: `nzfcc_demo_${slugify(categoryDetails.name)}`,
    name: categoryDetails.name,
    groups: {
      personal_finance: {
        _id: `group_demo_${slugify(categoryDetails.group)}`,
        name: categoryDetails.group
      }
    }
  };
}

function getDemoMerchant(merchantName: string) {
  return {
    _id: `merchant_demo_${slugify(merchantName)}`,
    name: merchantName,
    website: demoMerchantWebsites[merchantName]
  };
}

function getDemoCreatedAt(date: string) {
  return `${date}T14:20:00.000Z`;
}

function getDemoUpdatedAt(date: string) {
  return `${date}T18:45:00.000Z`;
}

function getDemoBalanceAfterTransaction(txn: ReturnType<typeof categorizeTransactions>[number], index: number) {
  const account = getDemoAccount(txn.account);
  const trend = txn.account === "Bills" ? index * 3.25 : index * 7.15;
  return Number((account.openingBalance + txn.amount - trend).toFixed(2));
}

function getDemoTransactionType(txn: ReturnType<typeof categorizeTransactions>[number]) {
  if (txn.amount > 0 && txn.category === "Income") {
    return "DIRECT CREDIT";
  }

  if (txn.category === "Transfers") {
    return "TRANSFER";
  }

  if (txn.category === "Fees") {
    return "FEE";
  }

  if (txn.rawDescription.includes("AUTOPAY")) {
    return "STANDING ORDER";
  }

  if (txn.rawDescription.includes("VISA") || txn.rawDescription.includes("EFTPOS") || txn.rawDescription.includes("CARD")) {
    return "EFTPOS";
  }

  return txn.amount > 0 ? "CREDIT" : "DEBIT";
}

function getDemoTransactionMeta(txn: ReturnType<typeof categorizeTransactions>[number]) {
  const baseMeta = {
    particulars: getDemoParticulars(txn),
    code: getDemoCode(txn),
    reference: getDemoReference(txn),
    other_account: getDemoOtherAccount(txn),
    card_suffix: getDemoCardSuffix(txn),
    logo: `https://cdn.akahu.nz/logos/merchants/merchant_demo_${slugify(txn.merchant)}.png`
  };

  if (txn.rawDescription.includes("WISE")) {
    return {
      ...baseMeta,
      conversion: {
        amount: 3.49,
        currency: "USD",
        rate: 0.57
      }
    };
  }

  return baseMeta;
}

function getDemoParticulars(txn: ReturnType<typeof categorizeTransactions>[number]) {
  if (txn.category === "Housing") {
    return "Rent";
  }

  if (txn.category === "Income") {
    return "Salary";
  }

  if (txn.category === "Transfers") {
    return "Savings";
  }

  return txn.merchant.slice(0, 12);
}

function getDemoCode(txn: ReturnType<typeof categorizeTransactions>[number]) {
  if (txn.category === "Housing") {
    return "HOME";
  }

  if (txn.category === "Income") {
    return "PAY";
  }

  if (txn.category === "Transfers") {
    return "MOVE";
  }

  return txn.category.slice(0, 4).toUpperCase();
}

function getDemoReference(txn: ReturnType<typeof categorizeTransactions>[number]) {
  if (txn.category === "Housing") {
    return "Property 12A";
  }

  if (txn.category === "Income") {
    return "Acme payroll";
  }

  return txn.rawDescription.slice(0, 18);
}

function getDemoOtherAccount(txn: ReturnType<typeof categorizeTransactions>[number]) {
  if (txn.category === "Income") {
    return "12-3000-1234567-00";
  }

  if (txn.category === "Housing") {
    return "06-0411-9876543-00";
  }

  if (txn.category === "Transfers") {
    return "38-9000-1234567-00";
  }

  return undefined;
}

function getDemoCardSuffix(txn: ReturnType<typeof categorizeTransactions>[number]) {
  return txn.amount < 0 && txn.category !== "Housing" && txn.category !== "Transfers" ? "1234" : undefined;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
