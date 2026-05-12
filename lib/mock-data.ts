import dummyTransactions from "@/lib/akahu/dummy-transactions.json";
import type { Budget, CardProduct, Transaction } from "./types";

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

export const transactions: Transaction[] = (dummyTransactions as { items?: Transaction[] }).items || [];
