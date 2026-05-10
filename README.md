# Netly

Netly helps New Zealanders see where their money is going, spot repeat spending, and compare whether a different card could give better value.

It connects to Akahu for account and transaction data, uses Akahu merchant/category enrichment where available, and falls back to demo data while you are building locally.

## Features

- Spending dashboard with balance, safe-to-spend, income, and review signals
- Akahu-shaped transaction feed with merchant and category enrichment
- Budget and recurring-payment views
- Card fit comparison for annual eligible spend
- Custom category overrides and category colour settings
- Demo mode for no-cost local testing

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Vanilla CSS
- Chart.js
- Akahu API

## Run Locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` and add Akahu values when testing real data. You can also paste a Personal App User Access Token in the Connect page during development.

## Akahu Schemas

Akahu documents the account and transaction response models here:

- Transaction model: `https://developers.akahu.nz/docs/the-transaction-model`
- Account model: `https://developers.akahu.nz/me/docs/the-account-model`

Akahu fields can vary by app permissions, account type, and integration type. Keep local transaction types permissive for optional `merchant`, `category`, `meta`, pending rows, and enrichment data. Keep account types permissive for optional `balance`, `formatted_account`, `meta`, `refreshed`, and connection/provider fields.

## Cost

This MVP is designed to build and test for free locally. Keep using demo mode, Akahu Personal App development access, and free hosting/database tiers until the product value is proven.
