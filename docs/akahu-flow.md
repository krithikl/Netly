# Akahu Open Banking Flow

For getting your App ID Token and User Access Token, see the Environment Variables section in the README.

## Personal App flow

Personal Apps cannot use Akahu OAuth, Akahu authorizes them when they are created and exposes the User Access Token directly in the developer dashboard. Once `AKAHU_APP_TOKEN` and `AKAHU_USER_TOKEN` (or a pasted token on the Connect page) are set, Netly stores the token in an encrypted httpOnly cookie and fetches accounts and transactions directly.

Note: Akahu Demo Bank enduring connections support account data, but they do not currently return transaction data. Use Netly demo mode for local transaction UI testing, or connect a transaction-capable real institution when testing Akahu transactions.

## OAuth flow (full apps)

OAuth requires a full Akahu app, `AKAHU_APP_SECRET`, and a redirect URI registered with Akahu that exactly matches `AKAHU_REDIRECT_URI`.

1. User clicks Connect.
2. Netly redirects to `https://oauth.akahu.nz`.
3. Akahu returns to `/api/akahu/callback` with an authorization code.
4. Netly exchanges the code at Akahu's `/token` endpoint.
5. The returned User Access Token is stored in an encrypted httpOnly cookie.

## API calls

Netly currently uses:

- `GET https://api.akahu.io/v1/accounts`
- `GET https://api.akahu.io/v1/accounts/{id}/transactions`
- `GET https://api.akahu.io/v1/accounts/{id}/transactions/pending`

Requests use:

- `Authorization: Bearer <Akahu User Access Token>`
- `X-Akahu-Id: <Akahu App ID Token>`