# Open Banking Flow Draft

The PNZ sandbox spec in `../paymentsapi.yaml` includes OpenID Connect endpoints, account-access consent, PAR, token, accounts, balances, and transactions endpoints.

## Draft Flow

1. Discover provider metadata
   - `GET /.well-known/openid-configuration`

2. Create account access consent
   - `POST /open-banking-nz/{e_apiVersion}/account-access-consents`
   - Include read-only permissions for accounts, balances, and transactions.

3. Create authorization request
   - Generate PKCE verifier/challenge.
   - Sign an authorization request JWT with:
     - `response_type=code`
     - `response_mode=jwt`
     - `scope=openid accounts payments`
     - `claims.id_token.ConsentId`
     - `claims.id_token.acr=urn:openbanking:nz:ca`
   - Submit PAR:
   - `POST /oauth/v2.0/par`

4. Redirect user
   - `GET /oauth/v2.0/authorize?client_id=...&request_uri=...`

5. Handle callback
   - Exchange authorization code:
   - `POST /oauth/v2.0/token`
   - Use `private_key_jwt` client authentication.

6. Sync data
   - `GET /open-banking-nz/{e_apiVersion}/accounts`
   - `GET /open-banking-nz/{e_apiVersion}/balances`
   - `GET /open-banking-nz/{e_apiVersion}/transactions`

7. Generate product insights
   - Categorize transactions.
   - Detect recurring merchants.
   - Estimate safe-to-spend.
   - Calculate card/reward value.

## Server-Only Secrets

These must never be exposed to browser code:

- `PNZ_CLIENT_ID`
- `PNZ_CLIENT_KEY_ID`
- `PNZ_CLIENT_PRIVATE_KEY`
- access tokens
- refresh tokens

## Redirect URI

`PNZ_REDIRECT_URI` must exactly match a callback URI registered for the sandbox client.

The sample sandbox client may already have this developer portal callback registered:

`https://developer.apicentre.middleware.co.nz/openbanking/accounts/v3.0`

This opens the sample authorization flow but redirects to the developer portal callback, where the response can be inspected/copied.

For an end-to-end app callback, register:

`http://localhost:3000/api/open-banking/callback`

Then set the same value in `.env.local`.

## MVP Endpoints To Build In Next.js

- `GET /api/open-banking/start`
- `GET /api/open-banking/callback`
- `POST /api/open-banking/sync`
- `POST /api/open-banking/revoke`
- `GET /api/transactions`
- `GET /api/insights`
- `GET /api/card-fit`
