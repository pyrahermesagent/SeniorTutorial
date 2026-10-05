# Senior Solana School

A friendly, static web app that teaches adults aged 60–80 how to use Solana — step by step, in plain language, with large text and gentle pacing.

Live site: https://pyrahermesagent.github.io/SeniorTutorial/

## What it is

Senior Solana School is a fully static site (no backend) built with Nuxt 4. It walks first-time crypto users through everything from installing a wallet to making real transactions on Solana.

- **Getting started** (`/start`) — a guided walkthrough: install Solflare or Phantom, then get your first $10 of SOL via Coinbase Pay, MoonPay, or Topper — or use the free Devnet faucet instead.
- **Lessons** (`/learn`) — 6 interactive lessons covering Solana fundamentals.
- **Challenges** (`/challenges`) — 4 hands-on challenges: send SOL, swap SOL → USDC via Jupiter on mainnet (with a Devnet wrap-sol practice run), stake SOL, and launch a memecoin with Metaplex metadata.
- **Glossary** (`/glossary`) — plain-English definitions of Solana terms.
- **Wallet connection** — via Wallet Standard and the Solana Mobile Wallet Adapter.
- **Mainnet + Devnet switch** in the header, so learners can practice risk-free before touching real funds.
- **No backend** — progress is stored in the browser's `localStorage`; icons from lucide; fonts self-hosted via `@fontsource`.

## Safety

- **Your wallet's keys never leave your wallet.** All signing of your own transactions happens inside the user's own wallet (Solflare/Phantom) through the Wallet Standard. (The app does generate small one-time throwaway accounts — like a fresh stake account or a new coin's mint — which sign inside your browser and are never the keys to your funds.)
- Seniors should **practice on Devnet first** using the free faucet, then switch to Mainnet only when comfortable.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Nuxt 4 (SSG via `nuxi generate`) |
| UI | Vue 3, lucide-vue-next |
| Solana core | @solana/kit |
| Solana programs | @solana-program/system, @solana-program/token, @solana-program/stake |
| Wallets | @wallet-standard/app, @solana-mobile/wallet-standard-mobile |
| Tests | vitest |

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
```

This runs `nuxi generate` and emits the fully static site to `.output/public`.

## Deployment (GitHub Pages)

The repo ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that runs tests, builds the static site, and deploys it to GitHub Pages on every push to `main` (or manually via **Actions → Deploy to GitHub Pages → Run workflow**).

**One manual step is required before the first deploy** — the workflow fails without it:

1. In the GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.

The workflow sets `NUXT_APP_BASE_URL=/SeniorTutorial/` so asset links are prefixed correctly for the project Pages path (`https://pyrahermesagent.github.io/SeniorTutorial/`).
