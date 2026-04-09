# K1 Protocol Frontend

A Next.js 15 frontend for the K1 protocol experience. This app provides:

- A public landing page with protocol overview, FAQs, and headline stats.
- A mint/redeem interface connected to Solana wallets.
- A dashboard for vault interaction and user-level vault activity.

## Tech Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- Solana Wallet Adapter
- Ranger/Voltr API integrations

## Prerequisites

- Node.js 20+ recommended
- npm (or yarn)

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

The app runs on `http://localhost:3005` by default.

## Environment Variables

Create a `.env.local` file in the repo root and set the following values:

```bash
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_RANGER_API_BASE=https://api.voltr.xyz
NEXT_PUBLIC_VAULT_PUBKEYS=<comma-separated-vault-pubkeys>
NEXT_PUBLIC_K1_TOKEN_MINT=<k1-token-mint>
```

### Notes

- `NEXT_PUBLIC_VAULT_PUBKEYS` should include at least one vault pubkey.
- If `NEXT_PUBLIC_K1_TOKEN_MINT` is not set, the app falls back to a default mint.

## Available Scripts

- `npm run dev` — start development server (port 3005)
- `npm run build` — build production bundle
- `npm run start` — run production server
- `npm run lint` — run Next.js lint checks

## Key Routes

- `/` — Landing page
- `/mint` — Mint/redeem/claim interface
- `/dashboard` — Vault dashboard

## API Usage

The frontend integrates with Ranger/Voltr endpoints for:

- Building deposit/redeem transactions
- Fetching vault metrics (TVL, share price, fee earned)
- Fetching user vault data (balance, pending withdrawals, actions)

## Wallet Support

Configured wallet adapters:

- Phantom
- Solflare

## Assets

Project static assets (logos, icons, audit PDFs) are under `public/`.
