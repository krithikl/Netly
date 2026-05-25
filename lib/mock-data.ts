import dummyTransactions from "@/lib/akahu/dummy-transactions.json";
import type { CardProduct, Transaction } from "./types";

export const payday = "2026-05-15";

export const currentBalance = 3268.42;

export const cardProducts: CardProduct[] = [
  {
    name: "Current debit card baseline",
    issuer: "Your bank",
    network: "Visa",
    tier: "Debit",
    annualFee: 0,
    cashbackRate: 0,
    perks: [],
    rewardProgram: "None",
    earnDescription: "No credit-card rewards.",
    sourceUrl: "https://www.sorted.org.nz/guides/debt/credit-cards/",
    lastVerified: "May 2026",
    brandColor: "#455a64",
    note: "Baseline with no rewards, perks, or annual fee."
  },
  {
    name: "American Express Airpoints Card",
    issuer: "American Express",
    network: "American Express",
    tier: "No annual fee",
    annualFee: 0,
    cashbackRate: 1 / 100,
    perks: [
      {
        name: "Welcome offer",
        description: "50 bonus Airpoints Dollars when eligible new card members meet the spend requirement.",
        counted: false,
        valueLabel: "50 Airpoints Dollars",
        valuationNote: "Not counted because it is one-time and eligibility-dependent."
      },
      {
        name: "Additional cards",
        description: "Up to 4 additional cards with no extra annual card fee.",
        counted: false,
        valueLabel: "$0 additional card fee",
        valuationNote: "Shown as a feature only because value depends on household card use."
      }
    ],
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$100 eligible spend = 1 Airpoints Dollar.",
    sourceUrl: "https://www.americanexpress.com/amex/nz/credit-cards/airnz-base-credit-card/",
    lastVerified: "May 2026",
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
    perks: [
      {
        name: "Welcome offer",
        description: "300 bonus Airpoints Dollars when eligible new card members meet the spend requirement.",
        counted: false,
        valueLabel: "300 Airpoints Dollars",
        valuationNote: "Not counted because it is one-time and eligibility-dependent."
      },
      {
        name: "Priority Pass lounge passes",
        description: "2 complimentary Priority Pass visits per 12-month membership period.",
        counted: false,
        valuationNote: "No dollar estimate because Netly is not using third-party lounge prices for perk value."
      },
      {
        name: "Centurion Lounge entries",
        description: "2 complimentary entries per calendar year at the Sydney or Melbourne Centurion Lounge.",
        counted: false,
        valuationNote: "No dollar estimate because the value depends on travel route and usage."
      },
      {
        name: "Koru membership discount",
        description: "Discounts on the Koru joining fee and annual membership fee while holding the card.",
        counted: false,
        valueLabel: "Save $255 joining fee and $145 p.a.",
        valuationNote: "Not counted because it only applies if the user buys Koru membership."
      },
      {
        name: "Travel insurance",
        description: "Complimentary domestic and international travel insurance when trip payment conditions are met.",
        counted: false,
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      },
      {
        name: "Smartphone screen cover",
        description: "Screen repair cover when the card payment conditions are met.",
        counted: false,
        valueLabel: "Up to $500 per claim",
        valuationNote: "Not counted because claims are conditional and subject to excess, limits, and exclusions."
      }
    ],
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$70 eligible spend = 1 Airpoints Dollar.",
    sourceUrl: "https://www.americanexpress.com/nz/credit-cards/airpoints-cards/airpoints-platinum-card/",
    sourceLinks: [
      {
        label: "Additional card benefits",
        url: "https://www.americanexpress.com/nz/credit-cards/manage-your-card/additional-card/"
      }
    ],
    lastVerified: "May 2026",
    brandColor: "#006fcf",
    note: "High Airpoints earn rate with travel, lounge, Koru, and protection benefits listed separately."
  },
  {
    name: "American Express Airpoints Platinum Reserve",
    issuer: "American Express",
    network: "American Express",
    tier: "Platinum Reserve",
    availability: "unavailable",
    annualFee: 395,
    cashbackRate: 1 / 70,
    perks: [
      {
        name: "Limited public benefit detail",
        description: "Amex rates and additional-card pages still mention this card, but a current product page was not found.",
        counted: false,
        valuationNote: "Not counted because benefits cannot be cleanly verified from a current public product page."
      },
      {
        name: "Smartphone screen cover",
        description: "Screen repair cover is listed for additional-card benefits when card payment conditions are met.",
        counted: false,
        valueLabel: "Up to $500 per claim",
        valuationNote: "Not counted because this card is marked unavailable and claims are conditional."
      }
    ],
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$70 eligible spend = 1 Airpoints Dollar.",
    sourceUrl: "https://www.americanexpress.com/nz/content/credit-cards/rates-and-fees/",
    sourceLinks: [
      {
        label: "Additional card benefits",
        url: "https://www.americanexpress.com/nz/credit-cards/manage-your-card/additional-card/"
      }
    ],
    lastVerified: "May 2026",
    brandColor: "#1f4f7a",
    note: "Legacy/off-market Amex option. It is excluded from default recommendations."
  },
  {
    name: "ASB Visa Light",
    issuer: "ASB",
    network: "Visa",
    tier: "Low rate",
    annualFee: 0,
    cashbackRate: 0,
    perks: [
      {
        name: "Smart Rate",
        description: "0% p.a. fixed interest for 6 months can apply to eligible single purchases of $1,000 or more.",
        counted: false,
        valuationNote: "Not counted because it is an interest feature, not a card reward or automatic perk."
      }
    ],
    rewardProgram: "None",
    earnDescription: "No rewards; designed around no account fee and a lower purchase rate.",
    sourceUrl: "https://www.asb.co.nz/credit-cards/visa-light.html",
    lastVerified: "May 2026",
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
    perks: [
      {
        name: "Plan-linked Spend fee",
        description: "Spend costs $12 annually for Sharesies plan customers, or $25 annually without a plan.",
        counted: false,
        valueLabel: "$12 on plan, $25 without plan",
        valuationNote: "The card model uses the lower annual fee as the default but does not count this as a perk."
      }
    ],
    rewardProgram: "Investback",
    earnDescription: "1% Investback on eligible purchases, invested weekly.",
    sourceUrl: "https://www.sharesies.nz/spend",
    sourceLinks: [
      {
        label: "Sharesies pricing",
        url: "https://www.sharesies.nz/pricing"
      }
    ],
    lastVerified: "May 2026",
    brandColor: "#ff7ab6",
    note: "Debit benchmark with 1% Investback and a $12 annual Spend fee for Sharesies plan customers."
  },
  {
    name: "ASB Visa Rewards",
    issuer: "ASB",
    network: "Visa",
    tier: "Rewards",
    annualFee: 40,
    cashbackRate: 1 / 150,
    perks: [],
    rewardProgram: "True Rewards",
    earnDescription: "$150 eligible spend = 1 True Rewards dollar.",
    sourceUrl: "https://www.asb.co.nz/credit-cards/visa-rewards.html",
    lastVerified: "May 2026",
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
    perks: [
      {
        name: "Overseas travel insurance",
        description: "Access to overseas travel insurance, subject to policy terms and eligibility.",
        counted: false,
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      }
    ],
    rewardProgram: "True Rewards",
    earnDescription: "$100 eligible spend = 1 True Rewards dollar.",
    sourceUrl: "https://www.asb.co.nz/credit-cards/visa-platinum-rewards.html",
    lastVerified: "May 2026",
    brandColor: "#f9b000",
    note: "Higher ASB earn rate with overseas travel insurance listed but not dollar-valued."
  },
  {
    name: "ANZ Airpoints Visa Platinum",
    issuer: "ANZ",
    network: "Visa",
    tier: "Platinum",
    annualFee: 150,
    cashbackRate: 1 / 110,
    perks: [
      {
        name: "Overseas travel insurance",
        description: "Overseas travel insurance when at least half of prepaid travel expenses are paid with the card.",
        counted: false,
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      },
      {
        name: "Koru membership benefit",
        description: "No Koru joining fee and a discount off standard 12-month individual Koru membership.",
        counted: false,
        valueLabel: "Save $270 joining fee and $145 annual fee",
        valuationNote: "Not counted because it only applies if the user buys Koru membership."
      },
      {
        name: "Status points and Visa privileges",
        description: "50% bonus Status Points on qualifying Air New Zealand flights, plus Visa Concierge and Visa offers.",
        counted: false,
        valuationNote: "No dollar estimate because value depends on flight and offer usage."
      }
    ],
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$110 eligible spend = 1 Airpoints Dollar.",
    sourceUrl: "https://www.anz.co.nz/personal/credit-cards/airpoints-visa-platinum/",
    lastVerified: "May 2026",
    brandColor: "#0073cf",
    note: "Airpoints Visa with travel insurance, Koru, and status benefits listed separately."
  },
  {
    name: "Westpac Airpoints Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "Standard",
    annualFee: 70,
    cashbackRate: 1 / 150,
    perks: [
      {
        name: "Airpoints Dollars Advance",
        description: "Access to 50 Airpoints Dollars Advance when short of a reward.",
        counted: false,
        valueLabel: "50 Airpoints Dollars Advance",
        valuationNote: "Not counted because it is an advance, not extra annual value."
      },
      {
        name: "Mastercard experiences",
        description: "Access to Mastercard Presale, Preferred tickets, and Priceless Experiences.",
        counted: false,
        valuationNote: "No dollar estimate because value depends on event availability and usage."
      }
    ],
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$150 eligible spend = 1 Airpoints Dollar up to monthly tier cap.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/airpoints/westpac-airpoints-mastercard/",
    sourceLinks: [
      {
        label: "Westpac fees",
        url: "https://www.westpac.co.nz/assets/About-us/legal-information-privacy/documents/Transaction-and-service-fees-Personal-Banking-Westpac-NZ.pdf?vanity=%2Ftransactionandservicefees"
      }
    ],
    lastVerified: "May 2026",
    brandColor: "#d50000",
    note: "Lower-fee Airpoints Mastercard; earn rate is tiered by monthly spend."
  },
  {
    name: "Westpac Airpoints Platinum Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "Platinum",
    annualFee: 125,
    cashbackRate: 1 / 110,
    perks: [
      {
        name: "Koru membership benefit",
        description: "Koru joining fee waived and discount off a 12-month individual membership.",
        counted: false,
        valueLabel: "Joining fee waived and $145 discount",
        valuationNote: "Not counted because it only applies if the user buys Koru membership."
      },
      {
        name: "Travel insurance",
        description: "Up to 35 days of overseas travel insurance per round trip.",
        counted: false,
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      },
      {
        name: "Purchase and warranty protection",
        description: "Extended warranty insurance up to 12 months and 90 days purchase protection.",
        counted: false,
        valuationNote: "No dollar estimate because claims are conditional and subject to policy terms."
      }
    ],
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$110 eligible spend = 1 Airpoints Dollar up to monthly tier cap.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/airpoints/westpac-airpoints-platinum-mastercard/",
    sourceLinks: [
      {
        label: "Westpac fees",
        url: "https://www.westpac.co.nz/assets/About-us/legal-information-privacy/documents/Transaction-and-service-fees-Personal-Banking-Westpac-NZ.pdf?vanity=%2Ftransactionandservicefees"
      }
    ],
    lastVerified: "May 2026",
    brandColor: "#d50000",
    note: "Airpoints Platinum Mastercard with Koru, travel, and purchase protection benefits listed separately."
  },
  {
    name: "Westpac Airpoints World Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "World",
    annualFee: 310,
    cashbackRate: 1 / 95,
    perks: [
      {
        name: "Valet parking vouchers",
        description: "2 complimentary valet parking eVouchers each year.",
        counted: false,
        valueLabel: "2 eVouchers",
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      },
      {
        name: "Koru membership benefit",
        description: "Koru joining fee waived and discount off a 12-month individual membership.",
        counted: false,
        valueLabel: "Joining fee waived and $145 discount",
        valuationNote: "Not counted because it only applies if the user buys Koru membership."
      },
      {
        name: "Priority Pass lounge access",
        description: "Priority Pass lounge access to participating airport lounges.",
        counted: false,
        valuationNote: "No dollar estimate because access and visit costs depend on usage and lounge terms."
      },
      {
        name: "Travel insurance",
        description: "Up to 120 days of overseas travel insurance per round trip.",
        counted: false,
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      },
      {
        name: "Purchase and warranty protection",
        description: "Extended warranty insurance up to 12 months and 90 days purchase protection.",
        counted: false,
        valuationNote: "No dollar estimate because claims are conditional and subject to policy terms."
      },
      {
        name: "Account fee waiver",
        description: "Annual fee is refunded if the spend requirement is met between fee charges.",
        counted: false,
        valueLabel: "$310 p.a. if $50,000 spend condition is met",
        valuationNote: "Not counted because it depends on reaching the issuer spend threshold."
      }
    ],
    rewardProgram: "Airpoints Dollars",
    earnDescription: "$95 eligible spend = 1 Airpoints Dollar up to monthly tier cap.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/airpoints/westpac-airpoints-world-mastercard/",
    sourceLinks: [
      {
        label: "Westpac fees",
        url: "https://www.westpac.co.nz/assets/About-us/legal-information-privacy/documents/Transaction-and-service-fees-Personal-Banking-Westpac-NZ.pdf?vanity=%2Ftransactionandservicefees"
      }
    ],
    lastVerified: "May 2026",
    brandColor: "#b00020",
    note: "Premium Airpoints Mastercard with travel, lounge, valet, Koru, and protection benefits listed separately."
  },
  {
    name: "Westpac hotpoints Platinum Mastercard",
    issuer: "Westpac",
    network: "Mastercard",
    tier: "Platinum",
    annualFee: 70,
    cashbackRate: 0,
    perks: [
      {
        name: "Travel insurance",
        description: "Overseas travel insurance for up to 35 days per round trip.",
        counted: false,
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      },
      {
        name: "Purchase and warranty protection",
        description: "Extended warranty insurance up to 12 months and 90 days purchase protection.",
        counted: false,
        valuationNote: "No dollar estimate because claims are conditional and subject to policy terms."
      },
      {
        name: "Mastercard experiences",
        description: "Access to Mastercard Travel and Lifestyle Services, Presale, Preferred tickets, and Priceless Experiences.",
        counted: false,
        valuationNote: "No dollar estimate because value depends on offer availability and usage."
      }
    ],
    rewardProgram: "hotpoints",
    earnDescription: "1.5 hotpoints per $1 up to monthly tier cap; dollar conversion not publicly modelled.",
    sourceUrl: "https://www.westpac.co.nz/credit-cards/hotpoints/hotpoints-platinum-mastercard/",
    sourceLinks: [
      {
        label: "Westpac fees",
        url: "https://www.westpac.co.nz/assets/About-us/legal-information-privacy/documents/Transaction-and-service-fees-Personal-Banking-Westpac-NZ.pdf?vanity=%2Ftransactionandservicefees"
      },
      {
        label: "hotpoints help",
        url: "https://www.westpac.co.nz/help/how-do-i-know-how-many-hotpoints-ive-earned/"
      }
    ],
    lastVerified: "May 2026",
    brandColor: "#d50000",
    note: "Earns hotpoints, but Netly does not estimate a cash reward rate until the public dollar conversion is modelled."
  },
  {
    name: "TSB Platinum Mastercard",
    issuer: "TSB",
    network: "Mastercard",
    tier: "Platinum",
    annualFee: 90,
    cashbackRate: 1 / 100,
    perks: [
      {
        name: "Mobile phone insurance",
        description: "Mobile phone insurance under the card insurance terms.",
        counted: false,
        valuationNote: "No dollar estimate because claims are conditional and subject to policy terms."
      },
      {
        name: "Price and purchase protection",
        description: "Price Protection Insurance and Purchase Protection Insurance under the card insurance terms.",
        counted: false,
        valuationNote: "No dollar estimate because claims are conditional and subject to policy terms."
      },
      {
        name: "Travel insurance",
        description: "Domestic and international travel insurance under the card insurance terms.",
        counted: false,
        valuationNote: "No dollar estimate because the issuer does not state a cash value."
      },
      {
        name: "Mastercard experiences",
        description: "Access to Mastercard cardholder offers and Priceless experiences.",
        counted: false,
        valuationNote: "No dollar estimate because value depends on offer availability and usage."
      }
    ],
    rewardProgram: "Cashback",
    earnDescription: "$1 cashback per $100 eligible spend.",
    sourceUrl: "https://www.tsb.co.nz/accounts-and-cards/cards/platinum-mastercard",
    lastVerified: "May 2026",
    brandColor: "#00a3ad",
    note: "Straightforward cashback card with insurance and Mastercard benefits listed separately."
  }
];

const budgetHistoryDemoTransactions: Array<{ amount: number; date: string; id: string }> = [
  { amount: -600, date: "2026-04-15", id: "txn_demo_budget_april_2026_a" },
  { amount: -720, date: "2026-03-15", id: "txn_demo_budget_march_2026_a" },
  { amount: -1000, date: "2026-02-15", id: "txn_demo_budget_february_2026_a" },
  { amount: -1400, date: "2026-01-15", id: "txn_demo_budget_january_2026_a" },
  { amount: -1800, date: "2025-12-15", id: "txn_demo_budget_december_2025_a" },
  { amount: -2200, date: "2025-11-15", id: "txn_demo_budget_november_2025_a" },
  { amount: -2600, date: "2025-10-15", id: "txn_demo_budget_october_2025_a" },
  { amount: -3000, date: "2025-09-15", id: "txn_demo_budget_september_2025_a" },
  { amount: -3400, date: "2025-08-15", id: "txn_demo_budget_august_2025_a" },
  { amount: -3800, date: "2025-07-15", id: "txn_demo_budget_july_2025_a" }
];

export const transactions: Transaction[] = getDemoTransactions(dummyTransactions);

function getDemoTransactions(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error("Invalid demo transaction data: expected lib/akahu/dummy-transactions.json to contain an items array.");
  }

  return [
    ...(payload.items as Transaction[]),
    ...budgetHistoryDemoTransactions.map(getBudgetHistoryDemoTransaction)
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBudgetHistoryDemoTransaction({ amount, date, id }: { amount: number; date: string; id: string }): Transaction {
  return {
    _account: "acc_demo_everyday",
    _connection: "conn_demo_budget_history",
    _id: id,
    amount,
    category: {
      _id: "cat_budget_demo",
      groups: {
        personal_finance: {
          _id: "group_budget_demo",
          name: "Budget demo"
        }
      },
      name: "Budget demo"
    },
    created_at: `${date}T02:20:00.000Z`,
    date: `${date}T12:00:00.000Z`,
    description: "Budget history demo spend",
    merchant: {
      _id: "merchant_demo_budget_history",
      name: "Budget history demo"
    },
    meta: {
      particulars: "BUDGET DEMO",
      reference: id
    },
    netly: {
      accountCurrency: "NZD",
      accountName: "Everyday"
    },
    type: "EFTPOS",
    updated_at: `${date}T05:45:00.000Z`
  };
}
