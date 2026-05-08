# MoneyFit

MoneyFit helps New Zealanders see where their money is going, spot repeat spending, and compare whether a different card could give better value.

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

## Cost

This MVP is designed to build and test for free locally. Keep using demo mode, Akahu Personal App development access, and free hosting/database tiers until the product value is proven.
