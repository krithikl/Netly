# Akahu Open Banking Flow

## Development Flow

1. Create an Akahu Personal App.
2. Add `AKAHU_APP_TOKEN` to `.env.local`.
3. Paste the Personal App User Access Token into Netly's Connect page, or set `AKAHU_USER_TOKEN` locally.
4. Netly stores the token in an httpOnly cookie for local development.
5. Netly fetches Akahu accounts and account transactions.

Note: Akahu Demo Bank enduring connections support account data, but they do not currently return transaction data. Use Netly demo mode for local transaction UI testing, or connect a transaction-capable real institution when testing Akahu transactions.

## OAuth Flow

1. User clicks Connect.
2. Netly redirects to `https://oauth.akahu.nz`.
3. Akahu returns to `/api/open-banking/callback` with an authorization code.
4. Netly exchanges the code at Akahu's `/token` endpoint.
5. The returned User Access Token is stored server-side.

## API Calls

Netly currently uses:

- `GET https://api.akahu.io/v1/accounts`
- `GET https://api.akahu.io/v1/accounts/{id}/transactions`
- `GET https://api.akahu.io/v1/accounts/{id}/transactions/pending`

Requests use:

- `Authorization: Bearer <Akahu User Access Token>`
- `X-Akahu-Id: <Akahu App ID Token>`

## Enrichment

Use Akahu fields directly where possible:

- `merchant.name` for merchant display
- `category.groups.personal_finance.name` for dashboard categories
- `category.name` for the more detailed Akahu category
- `meta.particulars`, `meta.code`, and `meta.reference` for payment details
