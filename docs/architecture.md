# MVP Architecture

## Product Wedge

MoneyFit should avoid becoming a generic budgeting app.

The sharp version is:

> Connect open banking data and show what changed, what is recurring, what is safe to spend, and whether the user has the right card/account setup for their actual spending.

## Current Provider Direction

MoneyFit now treats Akahu as the open banking provider for this branch. The UI should use Akahu-shaped data as much as possible:

- Accounts use Akahu account fields such as `_id`, `name`, `formatted_account`, `balance`, `type`, and `meta`.
- Transactions use Akahu fields such as `_id`, `_account`, `date`, `description`, `amount`, `type`, `merchant`, `category`, and `meta`.
- Categories should come from Akahu enrichment first, especially `category.groups.personal_finance.name`.
- MoneyFit-specific display helpers are allowed for labels, filtering, charting, and card-fit calculations.

## First User Journey

1. User lands on the dashboard.
2. User connects Akahu or switches to demo mode.
3. App retrieves accounts and transactions.
4. App uses Akahu merchant and category enrichment where available.
5. App shows safe-to-spend, top categories, recurring payments, and card/reward comparison.
6. User can override categories and customise colours.

## Recommended Production Stack

- Next.js App Router
- TypeScript
- Postgres
- Drizzle ORM
- Supabase Auth or Auth.js
- Vercel for MVP hosting
- Inngest or Trigger.dev for background sync later
- Expo React Native later

## Data Model Draft

### users

- id
- email
- created_at

### bank_connections

- id
- user_id
- provider
- akahu_user_token_encrypted
- status
- created_at

### accounts

- id
- connection_id
- provider_account_id
- name
- type
- currency
- current_balance
- available_balance
- raw_json
- updated_at

### transactions

- id
- account_id
- provider_transaction_id
- date
- amount
- type
- merchant_name
- description
- akahu_category_name
- akahu_personal_finance_category
- raw_json

### transaction_category_overrides

- id
- user_id
- transaction_id
- category
- created_at

### card_products

- id
- name
- annual_fee
- earn_rate
- perks_value
- notes
- source_url
- updated_at

## Security Baseline

- Do not send Akahu user tokens to browser JavaScript.
- Use httpOnly cookies locally until database token storage exists.
- Encrypt Akahu user tokens before storing them in a database.
- Store raw API responses only if needed for audit/debugging.
- Request the smallest Akahu scopes needed for accounts and transactions.
- Add audit logs for connection, sync, token updates, and disconnection.
