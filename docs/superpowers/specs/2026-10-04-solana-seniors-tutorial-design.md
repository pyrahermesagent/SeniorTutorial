# SeniorTutorial — Design Spec

**Date:** 2026-10-04
**Repo:** github.com/pyrahermesagent/SeniorTutorial
**Deployment:** GitHub Pages via GitHub Actions, base URL `/SeniorTutorial/`

## 1. Intent

A static Nuxt web app that teaches people aged 60–80 (not tech-savvy) what
crypto/Web3 is, why it beats legacy systems, and why Solana is decentralized,
reliable, and trustworthy — then walks them through their first real steps on
Solana: install a wallet, acquire ~$10 of SOL, and complete hands-on
challenges (transfer, swap, stake, launch a memecoin). There are no token
incentives; the reward is knowledge and a good experience.

Success criteria:

- A senior can finish the "Learn" track without outside help.
- Every screen is legible (large type, high contrast), has one clear primary
  action, and works well on a phone.
- Wallet connection works via Wallet Standard (browser extensions) and via
  Mobile Wallet Adapter (MWA) on mobile browsers.
- The app works against both Solana Mainnet Beta and Devnet, switchable in-app.
- `nuxi generate` output deploys to GitHub Pages on every push to `main`.

## 2. Assumptions (made because interactive Q&A is unavailable)

- Package manager: **npm** (no pnpm installed).
- Repo name is the Pages base path: `app.baseURL = '/SeniorTutorial/'`.
- Real fiat onramps (Coinbase Pay, MoonPay, Topper) are external services with
  KYC — the app deep-links to them with the user's address prefilled; it does
  not integrate an onramp SDK.
- Jupiter swap API is mainnet-only. On Devnet the Swap challenge becomes a
  labeled "practice swap" (wrap SOL → wSOL on-chain) so the mechanic is still
  exercised for real.
- Memecoin metadata JSON is embedded as an on-chain `data:` URI so the app has
  zero external storage dependency and works identically on both clusters.
- Content language: English.

## 3. Tech stack (latest stable, verified 2026-10-04)

| Purpose | Package | Version |
|---|---|---|
| Framework | nuxt | ^4.5.2 (SSG via `nuxi generate`) |
| UI runtime | vue (bundled with Nuxt 4) | 3.x |
| Solana RPC/tx | @solana/kit | ^8.4.0 |
| Wallet detection (extensions) | @wallet-standard/app | ^1.1.1 |
| Wallet types/features | @wallet-standard/base, @solana/wallet-standard-* | ^1.1.x |
| Mobile wallets (MWA) | @solana-mobile/wallet-standard-mobile | ^0.6.0 |
| SPL Token program client | @solana-program/token | ^0.17.0 |
| System program client | @solana-program/system | ^0.15.0 |
| Token metadata (memecoin) | @metaplex-foundation/umi + mpl-token-metadata | latest 1.x/3.x |
| Icons | lucide-vue-next | ^1.0.0 |
| Tests | vitest + @vue/test-utils + @nuxt/test-utils | latest |

Styling: bespoke design system in plain modern CSS (custom properties, native
nesting, container queries) — no Tailwind, no component library, so the senior
aesthetic stays fully consistent and controlled.

## 4. Information architecture

Routes (all SSG):

- `/` — Landing: warm welcome, two big choices: "Start Learning" / "I already
  have a wallet — Go to Challenges".
- `/learn` — Lesson track overview with progress.
- `/learn/[slug]` — Six lessons (below).
- `/start` — Getting started: Step 1 install wallet (Solflare, Phantom —
  Google Play links), Step 2 get SOL ($10 onramp options or devnet faucet),
  Step 3 challenge overview.
- `/challenges` — Challenge dashboard with completion states.
- `/challenges/transfer`, `/challenges/swap`, `/challenges/stake`,
  `/challenges/memecoin` — One screen per challenge.
- `/glossary` — Plain-language glossary (linked from jargon inline).

Persistent chrome:

- Top bar: wordmark, network toggle (Mainnet/Devnet, clearly labeled),
  wallet connect button (large, shows shortened address when connected).
- Mobile: bottom tab bar — Learn, Start, Challenges, Glossary.
- A "Need help?" affordance on every task screen linking back to the
  relevant lesson.

## 5. Lessons (Learn track)

Each lesson mixes short plain-English copy with an interactive piece. No
lesson is a wall of text. Progress is saved to localStorage.

1. **What is money, anyway?** — Why we trust banks; their limits (opening
   hours, transfer delays, fees, borders). Interactive: animated comparison —
   send $50 through a bank vs through Solana; timeline animates "3 business
   days + $25 fee" vs "~1 second + less than a penny".
2. **The shared notebook (blockchain)** — A ledger everyone can check.
   Interactive: an animated ledger where the user adds an entry and watches
   it propagate to many copies; try to cheat one copy and see the others
   reject it.
3. **Who's in charge? (decentralization)** — Interactive: two diagrams, one
   central server vs a network of independent nodes; user "unplugs" servers
   (taps them) and sees the centralized system fail while the decentralized
   network keeps running. Solana stats: ~1,000+ independent validators.
4. **Why Solana?** — Speed, cost, uptime. Interactive: live mainnet TPS and
   slot time fetched from RPC at view time; fee calculator slider (send $X,
   see fee in USD vs typical bank/wire fee).
5. **Your wallet and your keys** — Mailbox/lock analogy; public address vs
   secret recovery phrase. Interactive: generate a throwaway keypair locally
   (never stored, never sent) to see what an address looks like; tap-to-copy
   practice with a fake address.
6. **Staying safe** — The golden rules (never share the recovery phrase,
   check addresses, start small). Interactive: 4-question safety quiz with
   gentle feedback; must answer to complete the lesson.

Tone: respectful, warm, never condescending, clever but plain. Every
technical term links to `/glossary`.

## 6. Getting Started (`/start`)

- **Step 1 — Get a wallet.** Cards for Solflare and Phantom (equal
  prominence): short description, Google Play badge/link
  (`play.google.com/store/apps/details?id=com.solflare.mobile` and
  `...?id=app.phantom`), App Store link as secondary, and "I use a computer
  browser" path (extension install links). After install, a big
  "Connect my wallet" button using the wallet layer (§7).
- **Step 2 — Put ~$10 of SOL in it.** Mainnet: three onramp cards
  (Coinbase Pay, MoonPay, Topper by Uphold) deep-linking with the connected
  address prefilled where supported; honest note that these services ask for
  ID and charge a small fee. Devnet: "Get free practice SOL" button calling
  `requestAirdrop` (with fallback link to the official faucet on rate limit).
  Balance display with a refresh button.
- **Step 3 — Your challenges.** Preview of the four challenges, unlocked
  once a wallet with balance is connected; links into `/challenges`.

Steps are numbered, collapsible, and show a completion tick.

## 7. Challenges

Common pattern per challenge screen: goal explained in one sentence →
estimated cost → guided form → "review what will happen" summary in plain
English → wallet signature → live confirmation state → success state +
explorer link + "What just happened?" recap. Failures produce a calm,
plain-English recovery box (never a raw error).

1. **Transfer** — Send ≥ 0.001 SOL to someone (placeholder suggests "a
   grandchild"). Recipient address input with validation and checksum hint,
   amount input, optional address book stored locally. Works on both
   clusters.
2. **Swap** — Swap SOL for USDC. Mainnet: Jupiter quote → swap via the
   wallet (versioned transaction sign+send). Devnet: labeled practice mode —
   wrap SOL → wSOL on-chain. Explains what a swap is and why stablecoins
   exist.
3. **Stake** — Stake SOL with a validator. Native stake program: create +
   delegate stake account. Validator picker with 2–3 vetted suggestions
   (mainnet) / devnet validator(s); explains staking rewards and the
   ~2–3 day unlock period in plain terms. Works on both clusters.
4. **Memecoin** — Create and launch your own token: name, symbol, supply,
   emoji-free icon choice from lucide set rendered to PNG client-side;
   build mint via SPL Token, set Metaplex metadata (data-URI JSON), mint
   supply to own wallet, optionally revoke mint authority ("no more can ever
   be printed"). Works on both clusters.

Challenge completion is recorded in localStorage and shown on the dashboard
(no rewards — copy explicitly celebrates knowledge gained).

## 8. Wallet & network layer

- `composables/useWallet.ts`: Wallet Standard — enumerate wallets via
  `@wallet-standard/app` `getWallets()`, filter to Solana features
  (`standard:connect`, `solana:signAndSendTransaction` with graceful fallback
  to `solana:signTransaction` + own send), register MWA
  (`@solana-mobile/wallet-standard-mobile`) only when on a mobile browser,
  connect/disconnect, persist last wallet choice.
- `composables/useSolana.ts`: kit `createSolanaRpc` per cluster
  (`mainnet-beta`/`devnet` public endpoints), balance fetch, airdrop
  (devnet), confirmed-transaction helper, explorer link builder
  (`explorer.solana.com/tx/...?cluster=...`).
- Network toggle switches cluster globally; challenges disable with a
  friendly notice when the wallet isn't connected. Connected wallet accounts
  are adapted into kit transaction signers using the wallet-standard signer
  helpers from the kit ecosystem (`@solana/kit` signer types plus the
  wallet-standard feature APIs); if a required feature is missing we degrade
  with a message, never crash.
- No private keys ever touch the app. The throwaway keypair in lesson 5 is
  generated locally and discarded.

## 9. Design system (seniors first)

- Type scale: body 20px min, headings 28–44px, buttons 20–22px semibold;
  system font stack tuned for legibility (Atkinson Hyperlegible via
  @fontsource if license-clean, else system-ui stack) — decision: bundle
  **Atkinson Hyperlegible** (SIL OFL) for body, same family bold for
  headings.
- Color: warm cream background (`#FBF7EF`), deep teal ink (`#123B3C`),
  amber accent (`#E8A33D`), muted plum for secondary (`#6B4E71`); all pairs
  pass WCAG AA at large-text sizes. Consistent across every component.
- Touch targets ≥ 48px; generous spacing; one primary action per view.
- Animations: CSS/SVG transitions, `prefers-reduced-motion` respected;
  purposeful (show cause and effect), never decorative noise.
- Icons: lucide-vue-next only; no emojis anywhere in UI copy.
- Components: `AppButton`, `AppCard`, `AppIcon`, `StepList`, `LessonShell`,
  `InteractiveFigure` (animation frame + caption + replay button),
  `WalletButton`, `NetworkToggle`, `ChallengeShell`, `TxStatus`,
  `QuizBlock`, `FeeComparisonSlider`, `NodeNetworkSim`, `LedgerSim`,
  `TransferRaceSim`, `KeypairDemo`, `LiveNetworkStats`, `GlossaryTerm`.

## 10. State & persistence

- localStorage keys under `st:` prefix: lesson progress, quiz answers,
  challenge completions, last wallet, preferred cluster, address book.
- Nuxt `useState` composables; no backend, no cookies, no analytics.

## 11. Build, CI/CD

- `npm run dev` (Nuxt dev), `npm run build` = `nuxi generate` to
  `.output/public`.
- `.github/workflows/deploy.yml`: on push to `main` — setup-node 22,
  `npm ci`, `nuxi generate` with `NUXT_APP_BASE_URL=/SeniorTutorial/`,
  `actions/upload-pages-artifact`, `actions/deploy-pages`. Requires repo
  setting Pages → Source: GitHub Actions (documented in README).
- `nuxt.config.ts`: `ssr: true` + `nitro.prerender` all routes; wallet code
  runs client-only (`<ClientOnly>` / `.client.ts` guards) since SSG has no
  window.

## 12. Testing

- vitest unit tests for: cluster/endpoint config, explorer link builder,
  transfer transaction builder (amount/address validation), airdrop gating,
  progress store, fee formatter, challenge validation rules
  (e.g. ≥0.001 SOL), metadata JSON/data-URI builder.
- Component tests for `QuizBlock` and `ChallengeShell` happy paths.
- `npm test` runs headless in CI alongside the build.

## 13. Out of scope (YAGNI)

- Token incentives/airdrops for challenge completion.
- Backend, accounts, analytics, i18n.
- NFT galleries, token-2022 extensions, Ledger-specific flows.
- Onramp SDK integration (deep links only).
