# Netly

A personal finance app for tracking spending, budgets, and card comparisons using NZ bank data via Akahu's open banking API. Built with a modern UI and support for being installed as a PWA.

## Requirements

- Node.js 20 or later
- npm

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy the env file and fill in your values

```bash
cp .env.example .env.local
```

3. Run the dev server

```bash
npm run dev
```

4. Open the app

```
http://localhost:3000
```

You don't need any real bank credentials to get started. The app falls back to demo data when Akahu isn't configured, so you can explore the dashboard, transactions, budgets, and card comparison features straight away.

## Environment Variables

All variables go in `.env.local`. Never commit this file.

### Core

| Variable | Required | Notes |
|---|---|---|
| `APP_BASE_URL` | Yes | The URL the app runs on. Use `http://localhost:3000` for local dev. |

### Akahu (bank data)

| Variable | Required | Notes |
|---|---|---|
| `AKAHU_BASE_URL` | Yes | `https://api.akahu.io/v1` |
| `AKAHU_OAUTH_URL` | Yes | `https://oauth.akahu.nz` |
| `AKAHU_APP_TOKEN` | Only for real data | Your Akahu app token |
| `AKAHU_APP_SECRET` | Only for OAuth | Akahu app secret, keep private |
| `AKAHU_REDIRECT_URI` | Only for OAuth | Must match what's registered in Akahu, e.g. `http://localhost:3000/api/akahu/callback` |
| `AKAHU_COOKIE_SECRET` | Only for real data | Random string, at least 32 characters |
| `AKAHU_REQUEST_TIMEOUT_MS` | No | Defaults to `12000` |
| `AKAHU_MANUAL_REFRESH_COOLDOWN_MINUTES` | No | Defaults to 15 minutes |
| `AKAHU_OAUTH_SCOPE` | No | Use `ENDURING_CONSENT` for normal connections |
| `AKAHU_USER_TOKEN` | No | Personal app token, useful for local testing instead of pasting one in the UI |

### Google Drive (backups)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Only for backups | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Only for backups | Google OAuth client secret, keep private |
| `GOOGLE_REDIRECT_URI` | Only for backups | Must match what's registered in Google Cloud Console, e.g. `http://localhost:3000/api/google-drive/callback` |
| `GOOGLE_COOKIE_SECRET` | Only for backups | Random string, at least 32 characters |

## Generating secrets

For `AKAHU_COOKIE_SECRET` and `GOOGLE_COOKIE_SECRET`, generate a random 32+ character string:

```bash
openssl rand -hex 32
```

## Testing

```bash
npm test          # unit tests
npm run typecheck # type checking
npm run build     # production build check
npm run test:visual # playwright visual tests, requires nothing running on port 3000
```

## Common issues

**Styles look stale after pulling changes** - clear the Next cache and restart:

```bash
npm run dev:fresh
```

**Akahu connection not working** - check that `AKAHU_REDIRECT_URI` exactly matches what's registered in your Akahu app settings, including the protocol and port.

**Google Drive backup not working** - check that `GOOGLE_REDIRECT_URI` exactly matches an authorised redirect URI in your Google Cloud OAuth client.
