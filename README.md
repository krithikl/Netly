# Netly

A personal finance app for tracking spending, budgets, and card comparisons using NZ bank data via Akahu's open banking API. Built with a modern UI inspired by Cashew for mobile/desktop, and support for being installed as a PWA.

## Privacy

All transaction and account data is stored locally on your device. Nothing is sent to or stored on a server, except for two cases: the optional encrypted Google Drive backup, and the Akahu/Google OAuth steps required to connect your bank or backup account, which pass through the app's hosting only as part of the authentication flow.

Bank connections go through Akahu's open banking integration. You never enter your bank username or password into Netly, Akahu handles the connection directly with your bank through their secure consent flow.

## Features

- **Local-first** - all transaction and account data stays on your device, nothing is sent to a server except optional Google Drive backups
- **Open banking via Akahu** - connect your bank securely through Akahu, no need to share your online banking login
- **Spending dashboard** - balances, income tracking, spend rhythm, and review signals at a glance
- **Transaction feed** - search and filter transactions, with merchant and category enrichment from Akahu
- **Budget tracking** - weekly, fortnightly, monthly, and yearly budgets with category breakdowns, prior-period history, and recurring payment detection
- **Card Fit** - compares your real spending against different cards to see which one would give you the best rewards or fees outcome
- **Custom categories** - override categories and set your own colours, with the change remembered so future transactions from the same merchant are categorised automatically
- **Demo mode** - explore the full app with sample data, no bank connection required
- **Backups** - encrypted backups to Google Drive
- **PWA support** - install on desktop or mobile like a native app

## Screenshots

### Home

<table width="100%">
<tr>
<td valign="top"><img width="700" alt="Home dashboard desktop" src="https://github.com/user-attachments/assets/8e485b90-92cd-440b-b5f3-68e90d98262e" /></td>
<td valign="top"><img width="240" alt="Home dashboard mobile" src="https://github.com/user-attachments/assets/1b564dc0-f222-4d4e-9f70-d189048e7d42" /></td>
</tr>
</table>

### Transactions & Budgets

<table width="100%">
<tr>
<td valign="top"><img width="700" alt="Transactions desktop" src="https://github.com/user-attachments/assets/c2adaa16-8e95-4541-9da1-5bc0c5c8b93e" /></td>
<td valign="top"><img width="240" alt="Transactions mobile" src="https://github.com/user-attachments/assets/3243280b-f603-4162-a01a-bb23702af919" /></td>
</tr>
<tr>
<td valign="top"><img width="700" alt="Transaction detail desktop" src="https://github.com/user-attachments/assets/bba8a953-53d7-426e-a73e-ed9e7a0e16fa" /></td>
<td valign="top"><img width="240" alt="Transaction detail mobile" src="https://github.com/user-attachments/assets/4bc6d6dd-2db6-43e7-9dee-e3c100102194" /></td>
</tr>
<tr>
<td valign="top"><img width="700" alt="Budgets desktop" src="https://github.com/user-attachments/assets/29e308fc-d0b7-45ab-a87d-9870a1194032" /></td>
<td valign="top"><img width="240" alt="Budgets mobile" src="https://github.com/user-attachments/assets/f363535d-5a51-4266-8e73-1f0753fc504c" /></td>
</tr>
</table>

### Card Fit

<table width="100%">
<tr>
<td valign="top"><img width="700" alt="Card Fit overview desktop" src="https://github.com/user-attachments/assets/95ba9acd-06d2-4b2a-a87c-49d18d886453" /></td>
<td valign="top"><img width="240" alt="Card Fit overview mobile" src="https://github.com/user-attachments/assets/61a96e46-23c2-468e-87b9-ad18540d8355" /></td>
</tr>
<tr>
<td valign="top"><img width="700" alt="Card Fit comparison desktop" src="https://github.com/user-attachments/assets/0f2cd7d2-2e06-4f80-aa2d-242a884b1c05" /></td>
<td valign="top"><img width="240" alt="Card Fit mobile" src="https://github.com/user-attachments/assets/5be25c07-4d0f-463c-bb28-9b0c42d51d0e" /></td>
</tr>
<tr>
<td valign="top"><img width="700" alt="Card Fit detail desktop" src="https://github.com/user-attachments/assets/1f9b4769-7aba-4f88-89cd-a3c5d3a4afa6" /></td>
<td valign="top"><img width="240" alt="Settings mobile" src="https://github.com/user-attachments/assets/c069415e-0166-4bbe-b7f6-4dd882558e17" /></td>
</tr>
</table>

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

Note: by default, Akahu only returns transactions from the past 12 months onwards. Anything older than that won't appear in the transaction feed or budget history.

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
