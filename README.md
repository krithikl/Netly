# MoneyFit MVP

MoneyFit is a web-first MVP for a NZ open-banking financial helper.

The first product wedge is:

> Connect or import transactions, understand where money is going, and estimate whether a different card or account setup would give better value.

This folder currently contains a dependency-free browser prototype so the product shape can be reviewed without installing Node. The implementation target is still:

- Next.js
- TypeScript
- Postgres
- Drizzle or Prisma
- Server-only PNZ API integration
- Expo React Native later

## Run The App

Install dependencies and start the hot-reloading Next.js dev server:

```powershell
cd C:\Users\krith\Downloads\test\mvp
npm install
npm run dev
```

Then open:

`http://127.0.0.1:3000`

Next.js hot reloads React pages and API routes during development. Changes to files such as `app/page.tsx`, `app/api/**/route.ts`, and `lib/**/*.ts` should be picked up without restarting the server.

## What Is In Scope

- Spending dashboard
- Mock transaction import
- Category summary
- Safe-to-spend estimate
- Recurring payment detection
- Card/reward value comparison
- Open banking integration notes based on `paymentsapi.yaml`

## What Is Not In Scope Yet

- Payments
- Real production bank connections
- AI chat
- Stored credentials
- User accounts
- Subscription billing

## Security Notes

The PNZ private key must stay server-side only. Never expose it in browser JavaScript.

Use `.env.local` for real sandbox credentials and keep it ignored by git.
