# MVP Architecture

## Product Wedge

The MVP should avoid being a generic budgeting app.

The sharp version is:

> Connect open banking data and show what changed, what is recurring, what is safe to spend, and whether the user has the right card/account setup for their actual spending.

## First User Journey

1. User lands on dashboard.
2. User connects sandbox bank account or imports mock transactions.
3. App retrieves accounts, balances, and transactions.
4. App categorizes transactions.
5. App shows:
   - safe-to-spend estimate
   - top spending categories
   - recurring payments
   - card/reward comparison
6. User saves a scenario for later comparison.

## Recommended Production Stack

- Next.js app router
- TypeScript
- Postgres
- Drizzle ORM
- Supabase Auth or Auth.js
- Vercel for MVP hosting
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
- consent_id
- access_token_encrypted
- refresh_token_encrypted
- expires_at
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
- updated_at

### transactions

- id
- account_id
- provider_transaction_id
- booking_date
- amount
- currency
- credit_debit_indicator
- merchant_name
- description
- category
- raw_json

### recurring_merchants

- id
- user_id
- merchant_name
- category
- average_amount
- cadence
- confidence
- last_seen_at

### card_products

- id
- name
- annual_fee
- earn_rate
- perks_value
- notes
- source_url
- updated_at

### reward_scenarios

- id
- user_id
- name
- spend_profile_json
- best_card_id
- estimated_annual_value
- created_at

## Security Baseline

- Keep PNZ client private key only in server environment variables.
- Do not send access tokens to the browser.
- Encrypt access and refresh tokens before storing.
- Store raw API responses only if needed for audit/debugging.
- Minimize permissions in account-access consent.
- Add audit logs for connection, sync, token refresh, and consent revocation.
- Make CSV/manual import available as a fallback for privacy-conscious users.

## Open Banking MVP Permissions

From `paymentsapi.yaml`, the first MVP likely needs:

- `ReadAccountsDetail`
- `ReadBalances`
- `ReadTransactionsDetail`
- `ReadTransactionsCredits`
- `ReadTransactionsDebits`

Avoid payment-initiation scopes until the product actually needs them.

