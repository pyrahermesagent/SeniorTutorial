# SeniorTutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Nuxt 4 app that teaches seniors (60–80) crypto/Web3/Solana through interactive lessons, then guides them through wallet setup, a ~$10 SOL onramp, and four real on-chain challenges (transfer, swap, stake, memecoin) on Mainnet and Devnet.

**Architecture:** Fully static SSG Nuxt 4 app deployed to GitHub Pages. All Solana work happens client-side through Wallet Standard (browser extensions) and Mobile Wallet Adapter (mobile browsers), using `@solana/kit` for RPC and transaction building. State (progress, completions, prefs) lives in localStorage. No backend.

**Tech Stack:** Nuxt 4.5, Vue 3, TypeScript, @solana/kit 8.x, @wallet-standard/app 1.1, @solana-mobile/wallet-standard-mobile, @solana-program/system, @solana-program/token, lucide-vue-next, vitest + @vue/test-utils + happy-dom.

**Spec:** docs/superpowers/specs/2026-10-04-solana-seniors-tutorial-design.md

## Global Constraints

- Base URL `/SeniorTutorial/` — set via `NUXT_APP_BASE_URL` env, default `/` for dev; every internal link uses NuxtLink/appConfig, never hardcoded absolute paths.
- Body text ≥ 20px; touch targets ≥ 48px; all color pairs pass WCAG AA (palette: bg `#FBF7EF`, ink `#123B3C`, accent `#E8A33D`, secondary `#6B4E71`).
- Icons from `lucide-vue-next` only; **no emojis** in any UI copy.
- Every wallet/RPC call is client-only (no `window`/wallet access during prerender).
- No private keys in app code or storage; lesson keypair demo is local and discarded.
- Failures surface as calm plain-English messages, never raw errors.
- `prefers-reduced-motion` respected by every animation.
- Node 22, npm (no pnpm), TypeScript strict.
- Mainnet cluster id: `'mainnet-beta'`; Devnet: `'devnet'`.

## Review Focus

1. **No wallets installed** (fresh desktop browser): connect flow must show install guidance, not an empty dialog — tested in Task 6.
2. **User rejects the signature** in the wallet: challenge shows a "you cancelled, nothing happened" state, not an error — tested in Tasks 17/18.
3. **Devnet airdrop rate-limited (HTTP 429 / RPC -32002)**: friendly retry + link to official faucet — tested in Task 5.
4. **Bad recipient address or amount < 0.001 SOL**: validation blocks before any wallet prompt — tested in Task 18.
5. **Jupiter API unreachable/500 on mainnet swap**: clear "swap unavailable right now, try later" state — tested in Task 19.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json` (extends `./.nuxt/tsconfig.json`), `app.vue`, `app.config.ts`, `.gitignore`, `vitest.config.ts`, `pages/index.vue` (placeholder), `error.vue`

**Interfaces:**
- Produces: runnable Nuxt 4 SSG app; scripts `dev`, `build` (`nuxi generate`), `preview`, `test` (`vitest run`), `postinstall` (`nuxi prepare`). `appConfig.brand = 'Senior Solana School'`.

- [ ] **Step 1: Write `package.json`** with deps: `nuxt ^4.5.2`, `vue`, `vue-router`; devDeps: `typescript`, `vitest`, `@vue/test-utils`, `happy-dom`, `@types/node`. Solana deps arrive in the tasks that need them (5, 6, 18–21); `lucide-vue-next ^1.0.0` and `@fontsource/atkinson-hyperlegible` now.
- [ ] **Step 2: Write `nuxt.config.ts`**: `ssr: true`; `app.baseURL` from `process.env.NUXT_APP_BASE_URL || '/'`; `nitro.prerender.crawlLinks: true, failOnError: false`; `css: ['~/assets/css/main.css']` (file created in Task 2, add a one-line placeholder now); `modules: []`; `compatibilityDate` current.
- [ ] **Step 3: `app.vue`** renders `<NuxtLayout><NuxtPage/></NuxtLayout>`; placeholder `pages/index.vue` shows brand name; `error.vue` is a friendly 404 (GitHub Pages serves it) with a "Back to the start" NuxtLink.
- [ ] **Step 4: Run `npm install && npm run build`**
Expected: generates `.output/public` without errors.
- [ ] **Step 5: Commit** `chore: scaffold Nuxt 4 SSG app`.

### Task 2: Design system tokens & global CSS

**Files:**
- Create: `assets/css/main.css`, `assets/css/tokens.css`

**Interfaces:**
- Produces: CSS custom properties `--color-bg`, `--color-ink`, `--color-accent`, `--color-secondary`, `--font-body` (Atkinson Hyperlegible, imported via `@fontsource/atkinson-hyperlegible` in `main.css`), spacing scale, focus-ring style, `.btn-reset` utility; global `font-size: 20px` on `html`, reduced-motion media query reset.

- [ ] **Step 1: Write `tokens.css`** with the Global Constraints palette and a type scale (20/24/28/36/44).
- [ ] **Step 2: Write `main.css`**: font-face import, base element styles (legible line-height 1.6, large inputs/buttons), `:focus-visible` outline, `@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }`.
- [ ] **Step 3: Visual check `npm run dev`** — placeholder page shows the font and cream background (verify via built CSS, no browser needed).
- [ ] **Step 4: Commit** `feat: senior-first design tokens and global styles`.

### Task 3: Core UI components

**Files:**
- Create: `components/AppButton.vue`, `components/AppCard.vue`, `components/AppIcon.vue`, `components/AppNotice.vue`

**Interfaces:**
- Produces:
  - `AppButton`: props `{ to?: string; variant?: 'primary'|'secondary'|'ghost'; size?: 'md'|'lg'; loading?: boolean; disabled?: boolean }`; emits `click`; renders NuxtLink when `to`, else `<button>`; min-height 56px.
  - `AppCard`: props `{ padded?: boolean }`; slot default.
  - `AppIcon`: props `{ name: string; size?: number }` — resolves against a curated map of lucide-vue-next imports (add icons per-task by extending the map in `utils/icons.ts`).
  - `AppNotice`: props `{ kind: 'info'|'warning'|'success' }`, slots default — the plain-English message box used everywhere.

- [ ] **Step 1: Write component test** `test/components/AppButton.test.ts`: renders slot text; renders `<a>` when `to` set (stub NuxtLink); applies `disabled` attribute; sets `aria-busy` when loading.
- [ ] **Step 2: Run test, verify FAIL** (`vitest run`).
- [ ] **Step 3: Implement the four components** + `utils/icons.ts` map (initial icons: `wallet`, `graduation-cap`, `arrow-right`, `check`, `info`, `triangle-alert`, `circle-check`, `loader-circle`, `menu`, `x`).
- [ ] **Step 4: Run tests, verify PASS.**
- [ ] **Step 5: Commit** `feat: core UI components`.

### Task 4: Progress state (localStorage)

**Files:**
- Create: `composables/useProgress.ts`, `utils/progress.ts`
- Test: `test/unit/progress.test.ts`

**Interfaces:**
- Produces: `utils/progress.ts` pure functions `loadProgress(storage): ProgressState`, `markLessonDone(s, slug)`, `markChallengeDone(s, id)`, `saveQuizScore(s, slug, score, total)`, `initialProgress()` — `ProgressState = { lessonsDone: string[]; challengesDone: ChallengeId[]; quiz: Record<string,{score:number;total:number}>; cluster?: Cluster; lastWallet?: string }`; `ChallengeId = 'transfer'|'swap'|'stake'|'memecoin'`. All keys under `st:` prefix. `useProgress()` wraps with reactive `useState`.

- [ ] **Step 1: Write failing tests**: initial state empty; markLessonDone idempotent; challenge ids restricted to the union; corrupted localStorage JSON returns initial state; save/load round-trip.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** pure functions + composable (guards `import.meta.client`).
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: progress persistence`.

### Task 5: Cluster config & Solana RPC composable

**Files:**
- Create: `utils/cluster.ts`, `composables/useSolana.ts`; add dep `@solana/kit ^8.4.0`
- Test: `test/unit/cluster.test.ts`

**Interfaces:**
- Produces: `utils/cluster.ts`: `type Cluster = 'mainnet-beta'|'devnet'`; `CLUSTERS: Record<Cluster,{label:string;rpcUrl:string;faucetUrl?:string}>` (mainnet `https://api.mainnet-beta.solana.com`, devnet `https://api.devnet.solana.com`, faucet `https://faucet.solana.com`); `explorerTxUrl(sig, cluster)`, `explorerAddressUrl(addr, cluster)` (append `?cluster=devnet` when devnet); `formatSol(lamports: bigint, maxDecimals=4): string`; `parseSolToLamports(input: string): bigint|null` (null on invalid/negative/NaN/>9 decimals); `isValidSolanaAddress(s: string): boolean` (base58, 32–44 chars, decodes to 32 bytes — use kit `address()` in try/catch).
- `useSolana()`: `{ cluster, setCluster(c), getBalance(addr): Promise<bigint>, requestDevnetAirdrop(addr, sol): Promise<{sig:string}|{error:'rate-limited'|'unavailable'}>, sendAndConfirm(ixs, signer): Promise<string> }`. Cluster persisted via useProgress.

- [ ] **Step 1: Write failing tests** for `explorerTxUrl` (devnet gets `?cluster=devnet`), `formatSol` (1_500_000_000n → "1.5", trims zeros), `parseSolToLamports` ("0.001"→1_000_000n; "abc", "-1", "0.0000000001" → null), `isValidSolanaAddress` (known-good devnet addr passes; "hello" fails), airdrop error mapping (429 → `'rate-limited'`).
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** using `createSolanaRpc` lazily per cluster; airdrop via rpc; map RPC errors to the union.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: cluster config and Solana RPC composable`.

### Task 6: Wallet layer (Wallet Standard + MWA)

**Files:**
- Create: `utils/wallets.ts`, `composables/useWallet.ts`, `components/WalletConnectModal.vue`, `components/WalletButton.vue`; add deps `@wallet-standard/app ^1.1.1`, `@wallet-standard/base`, `@solana-mobile/wallet-standard-mobile ^0.6.0`
- Test: `test/unit/wallets.test.ts`

**Interfaces:**
- Produces: `utils/wallets.ts` pure helpers over wallet-standard types: `isSolanaStandardWallet(w): boolean` (has `standard:connect` and any `solana:` feature), `walletDisplayName(w): string`, `classifySendError(e): 'rejected'|'failed'` (user rejection by code/name match). `useWallet()`: `{ wallets: Ref<StandardWalletInfo[]>; account: Ref<{address:string;label?:string}|null>; connecting: Ref<boolean>; connect(name?): Promise<void>; disconnect(): Promise<void>; sendInstructions(ixs: unknown[]): Promise<string> }` — registers MWA via `@solana-mobile/wallet-standard-mobile` only when `import.meta.client && /Android|iPhone|iPad/i.test(navigator.userAgent)`; persists `lastWallet` via useProgress; `sendInstructions` builds a kit transaction, prefers wallet `solana:signAndSendTransaction`, falls back to sign + own send via useSolana; maps rejections to `'rejected'`.
- `WalletButton`: connected → chip with shortened address + disconnect; else opens `WalletConnectModal`. Modal lists detected wallets (icon+name); when list empty (Review Focus 1) shows "No wallet found on this device" + Solflare/Phantom install links; closes on backdrop/Esc.

- [ ] **Step 1: Write failing tests**: `isSolanaStandardWallet` true/false fixtures; `classifySendError` (`{code:4001}` and name `WalletSignTransactionError` variants → 'rejected'; generic Error → 'failed'); empty-wallet modal renders install links (component test, stub composable).
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** utils, composable, modal, button. All wallet enumeration inside `onMounted`.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: wallet connection via Wallet Standard and MWA`.

### Task 7: App chrome & landing page

**Files:**
- Create: `layouts/default.vue`, `components/AppTopBar.vue`, `components/AppBottomNav.vue`, `components/NetworkToggle.vue`; Modify: `pages/index.vue`

**Interfaces:**
- Consumes: AppButton/AppIcon (Task 3), useWallet (6), useSolana cluster (5).
- Produces: `NetworkToggle` — two big radio-style buttons "Mainnet"/"Devnet (practice)" with a warning note that mainnet uses real money. Layout: top bar (wordmark, NetworkToggle, WalletButton) + `<slot/>` + bottom nav on `<768px` (Learn/Start/Challenges/Glossary with lucide icons). Landing: hero (plain one-liner promise), two AppButtons → `/learn` and `/start`, small "What is this?" AppNotice.

- [ ] **Step 1: Write test** `test/components/NetworkToggle.test.ts`: emits/switches cluster via useSolana stub; shows real-money note only when Mainnet selected.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** layout + components + landing copy (warm, one clear promise: "Learn how the new internet of money works — at your own pace, one small step at a time.").
- [ ] **Step 4: Run tests + `npm run build`, verify PASS/generates.**
- [ ] **Step 5: Commit** `feat: app chrome and landing page`.

### Task 8: Lesson content model & Learn overview

**Files:**
- Create: `content/lessons.ts`, `pages/learn/index.vue`, `components/LessonCard.vue`
- Test: `test/unit/lessons.test.ts`

**Interfaces:**
- Produces: `LESSONS: LessonMeta[]` — `LessonMeta = { slug: string; title: string; tagline: string; minutes: number; icon: string }`, six entries in spec §5 order. `useLessonProgress()` helpers from useProgress. `/learn` lists LessonCards (number, icon, title, tagline, est. minutes, done-tick) linking to `/learn/[slug]`.

- [ ] **Step 1: Write failing test**: six lessons, unique slugs matching `['what-is-money','shared-notebook','whos-in-charge','why-solana','wallets-and-keys','staying-safe']`.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** content model + overview page with overall progress header ("3 of 6 lessons completed").
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson model and learn overview`.

### Task 9: LessonShell, QuizBlock, GlossaryTerm

**Files:**
- Create: `components/LessonShell.vue`, `components/QuizBlock.vue`, `components/GlossaryTerm.vue`, `components/InteractiveFigure.vue`
- Test: `test/components/QuizBlock.test.ts`

**Interfaces:**
- Produces: `LessonShell` props `{ title: string; intro: string; lessonSlug: string }`, slots `default` (sections), `sim`; footer "Mark lesson complete → next lesson" button (calls markLessonDone, navigates). `QuizBlock` props `{ questions: { q: string; options: string[]; answer: number; explain: string }[] }`, emits `passed(score,total)`; one question at a time, gentle feedback, retry allowed. `InteractiveFigure`: framed card with caption slot + replay button emitting `replay`. `GlossaryTerm` props `{ term: string }` — dotted-underline NuxtLink to `/glossary#<term>`.

- [ ] **Step 1: Write failing tests**: QuizBlock renders options, reveals explanation on answer, blocks "passed" until all answered, emits `passed(4,4)` on all-correct; wrong answer shows explain text, allows retry.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement components.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson shell and quiz components`.

### Task 10: Lesson 1 — What is money? (TransferRaceSim)

**Files:**
- Create: `pages/learn/[slug].vue`, `components/learn/TransferRaceSim.vue`, `content/lessons/what-is-money.ts`
- Test: `test/components/TransferRaceSim.test.ts`

**Interfaces:**
- Consumes: LessonShell, InteractiveFigure (9). `pages/learn/[slug].vue` maps slug → lesson component map (`LEARN_PAGES: Record<string, Component>`); unknown slug → friendly 404 via `createError`.
- Produces: `TransferRaceSim`: two animated lanes ("Your bank" vs "Solana"); Play button; bank lane crawls through "Day 1… Day 3, fee $25" while Solana lane finishes instantly with "< 1 second, fee < $0.01"; end state shows both receipts; replayable via InteractiveFigure.

- [ ] **Step 1: Write failing test**: play advances Solana lane to done while bank lane remains incomplete at same tick; end state shows both fee captions (drive sim with a step callback, not wall-clock timers).
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** `[slug].vue` router + sim (SVG lanes + CSS transitions, stepped state machine) + lesson copy (plain, warm; glossary links for "transfer", "fee").
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson 1 with transfer race simulation`.

### Task 11: Lesson 2 — Shared notebook (LedgerSim)

**Files:**
- Create: `components/learn/LedgerSim.vue`, `content/lessons/shared-notebook.ts`
- Test: `test/components/LedgerSim.test.ts`

**Interfaces:**
- Produces: `LedgerSim` — 4 notebook cards (validator copies); user types an entry ("Anna pays Marco 2 SOL") and taps "Add to all notebooks" → entry animates into every copy; then "Try to cheat" mode: edit one copy → others reject it and it snaps back (with plain-English caption about agreement/consensus).

- [ ] **Step 1: Write failing test**: adding an entry appends to all 4 copies; cheating one copy flags it rejected and restores original value.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement sim + lesson copy** (glossary: "blockchain", "validator").
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson 2 with shared ledger simulation`.

### Task 12: Lesson 3 — Who's in charge? (NodeNetworkSim)

**Files:**
- Create: `components/learn/NodeNetworkSim.vue`, `content/lessons/whos-in-charge.ts`
- Test: `test/components/NodeNetworkSim.test.ts`

**Interfaces:**
- Produces: `NodeNetworkSim` — two panels: one central server with 4 clients, one mesh of 8 nodes; user taps servers/nodes to "unplug" them; central panel reports "System down" when the single server dies; mesh keeps running until all nodes unplugged, showing "Solana has over 1,000 independent computers like these".

- [ ] **Step 1: Write failing test**: unplugging central server → left panel down; unplugging 7 of 8 mesh nodes → right panel still up; 8th → down.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement sim + lesson copy** (glossary: "decentralized", "validator"; stat line about Solana validator count as "over 1,000").
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson 3 with decentralization simulation`.

### Task 13: Lesson 4 — Why Solana? (LiveNetworkStats + FeeComparisonSlider)

**Files:**
- Create: `components/learn/LiveNetworkStats.vue`, `components/learn/FeeComparisonSlider.vue`, `content/lessons/why-solana.ts`
- Test: `test/components/FeeComparisonSlider.test.ts`

**Interfaces:**
- Consumes: useSolana (5).
- Produces: `LiveNetworkStats`: on mount (client-only) fetches recent performance samples + current slot via RPC → big friendly numbers ("About N transactions every second", "A new page in the notebook every ~0.4 seconds"); graceful "couldn't load live numbers" AppNotice on failure. `FeeComparisonSlider`: input `$` amount 1–10,000 → shows Solana fee (< $0.01, flat) vs typical wire fee (`max(15, amount*0.01)` heuristic, labeled as typical bank estimate).

- [ ] **Step 1: Write failing tests**: slider at $50 → bank "$25.00" capped/flat per heuristic and Solana "< $0.01"; at $5,000 → bank "$50.00". (Pin the heuristic in the test.)
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement both components + lesson copy** (uptime/reliability paragraph; glossary: "fee", "transaction").
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson 4 with live stats and fee slider`.

### Task 14: Lesson 5 — Wallets and keys (KeypairDemo)

**Files:**
- Create: `components/learn/KeypairDemo.vue`, `content/lessons/wallets-and-keys.ts`
- Test: `test/components/KeypairDemo.test.ts`

**Interfaces:**
- Consumes: `isValidSolanaAddress` (5); kit `generateKeyPairSigner` for a throwaway keypair.
- Produces: `KeypairDemo` — "Make me a practice address" button → generates keypair locally, displays public address (labelled "safe to share, like your mailbox address") and notes the secret part "never leaves the wallet app — and here, it's thrown away the moment you leave this page"; copy-to-clipboard practice with the generated address and a big confirmation.

- [ ] **Step 1: Write failing test**: generated address passes `isValidSolanaAddress`; address is not persisted (localStorage untouched); copy button writes to stubbed clipboard.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement sim + lesson copy** (mailbox analogy; glossary: "wallet", "public key", "recovery phrase").
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson 5 with practice keypair demo`.

### Task 15: Lesson 6 — Staying safe (safety quiz)

**Files:**
- Create: `content/lessons/staying-safe.ts`
- Test: `test/unit/safetyQuiz.test.ts`

**Interfaces:**
- Consumes: QuizBlock (9); lesson completion requires quiz `passed` event → markLessonDone.
- Produces: `SAFETY_QUESTIONS` — 4 questions (recovery phrase sharing, "support agent" calls, checking addresses, starting small), each with 3 options and a one-line explanation.

- [ ] **Step 1: Write failing test**: exactly 4 questions, each `answer` index within options range, every question has non-empty `explain`; correct answer for the recovery-phrase question is the "nobody, ever" option.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement content + wire quiz in `[slug]` lesson page for this slug.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: lesson 6 safety quiz`.

### Task 16: Getting Started page (`/start`)

**Files:**
- Create: `pages/start.vue`, `components/start/StepList.vue`, `components/start/WalletInstallCard.vue`, `components/start/OnrampCard.vue`, `components/start/DevnetFaucetButton.vue`, `components/BalanceChip.vue`
- Test: `test/unit/onramps.test.ts`

**Interfaces:**
- Consumes: useWallet (6), useSolana (5), BalanceChip shows formatted balance + refresh.
- Produces: `utils/onramps.ts`: `WALLETS: { name:'Solflare'|'Phantom'; playStoreUrl: string; appStoreUrl: string; extensionUrl: string; blurb: string }[]` (Play links `https://play.google.com/store/apps/details?id=com.solflare.mobile`, `...id=app.phantom`); `ONRAMPS: { name:string; buildUrl(address:string): string; note:string }[]` (Coinbase Pay, MoonPay, Topper — address-prefilled URLs). `DevnetFaucetButton` calls requestDevnetAirdrop, maps `'rate-limited'` to a calm notice linking the official faucet (Review Focus 3). Page: numbered collapsible steps 1 (install wallets, both cards + "Connect my wallet"), 2 (mainnet → OnrampCards; devnet → faucet + balance), 3 (challenge preview linking `/challenges`).

- [ ] **Step 1: Write failing tests**: `buildUrl` includes the given address for each onramp; wallet entries include the exact Play Store URLs above; step 2 renders faucet on devnet and onramp cards on mainnet (component test with stubbed composables).
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement components + page.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: getting started steps with wallet install and onramp`.

### Task 17: Challenge scaffolding (shell, status, dashboard)

**Files:**
- Create: `components/ChallengeShell.vue`, `components/TxStatus.vue`, `pages/challenges/index.vue`, `components/ChallengeCard.vue`, `utils/challenges.ts`
- Test: `test/components/TxStatus.test.ts`, `test/unit/challenges.test.ts`

**Interfaces:**
- Consumes: useProgress (4), useWallet (6), AppNotice (3).
- Produces: `CHALLENGES: { id: ChallengeId; title: string; blurb: string; icon: string; difficulty: 1|2|3 }[]` (transfer, swap, stake, memecoin). `ChallengeShell` props `{ challenge: ChallengeId; goal: string; estCost: string }` + slots; handles wallet-not-connected and wrong-cluster notices; on `success` event marks challenge done. `TxStatus` props `{ state: TxState; signature?: string; error?: string }`, `TxState = 'idle'|'building'|'awaiting-signature'|'sending'|'confirming'|'success'|'cancelled'|'failed'`; cancelled → "You cancelled — nothing was sent." with Try again; failed → plain message + support hint; success → explorer link via `explorerTxUrl` (Review Focus 2). Dashboard lists ChallengeCards with done-ticks and the no-incentives line ("The reward is what you'll know — and that you did it yourself.").

- [ ] **Step 1: Write failing tests**: `CHALLENGES` has the 4 ids in spec order; TxStatus renders explorer link containing signature + `?cluster=devnet` when devnet; cancelled state copy present, no technical error text; ChallengeShell shows connect notice when wallet absent (stub).
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement components + dashboard.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: challenge scaffolding and dashboard`.

### Task 18: Challenge 1 — Transfer

**Files:**
- Create: `pages/challenges/transfer.vue`, `utils/transfer.ts`; add dep `@solana-program/system ^0.15.0`
- Test: `test/unit/transfer.test.ts`

**Interfaces:**
- Consumes: ChallengeShell/TxStatus (17), useWallet.sendInstructions (6), isValidSolanaAddress/parseSolToLamports (5).
- Produces: `validateTransfer({to, amountSol, balanceLamports}): { ok:true; lamports:bigint } | { ok:false; reason:string }` — requires valid address, amount ≥ 0.001 SOL (Review Focus 4), amount + 5000 lamports fee ≤ balance, recipient ≠ sender not required but warn if same. `buildTransferIxs(from: Address, to: Address, lamports: bigint)` via `getTransferSolInstruction`. Page: recipient input (placeholder "For example, your grandchild's wallet address"), amount input, plain-English review panel ("You are sending 0.01 SOL to 4f…9x. This cannot be undone, but that's okay — you checked the address twice."), send → TxStatus flow → success recap.

- [ ] **Step 1: Write failing tests**: 0.0005 → reason mentions minimum; invalid address reason; amount exceeding balance reason; 0.01 with ample balance → ok and lamports = 10_000_000n; builder emits one system transfer instruction with matching `amount`.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement utils + page.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: transfer challenge`.

### Task 19: Challenge 2 — Swap (SOL→USDC; devnet practice wrap)

**Files:**
- Create: `pages/challenges/swap.vue`, `utils/swap.ts`, `utils/jupiter.ts`; add dep `@solana-program/token ^0.17.0`
- Test: `test/unit/swap.test.ts`, `test/unit/jupiter.test.ts`

**Interfaces:**
- Consumes: ChallengeShell (17), useWallet (6), cluster (5).
- Produces: `jupiter.ts`: `fetchQuote({inputMint, outputMint, amountLamports, slippageBps}): Promise<Quote>` and `fetchSwapTransaction(quote, userAddress): Promise<string /* base64 tx */>` against `https://api.jup.ag/swap/v1` (`/quote`, `/swap`), mints `So111...112` / mainnet USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; throws typed `JupiterError('unavailable')` on non-OK/timeout (Review Focus 5). `swap.ts`: `buildWrapSolIxs(owner, lamports)` (create wSOL ATA idempotent + transfer + syncNative) for devnet practice; `describeSwapMode(cluster): 'jupiter'|'practice'`. Page: mainnet → amount → quote display (rate, min received) → wallet signs Jupiter versioned tx → TxStatus; devnet → clearly labeled Practice mode card using wrap flow so the mechanic is real on-chain.

- [ ] **Step 1: Write failing tests**: `describeSwapMode` mapping; quote URL includes mints + amount + slippage; non-OK response → `JupiterError('unavailable')`; quote parse maps `outAmount`/`otherAmountThreshold`; `buildWrapSolIxs` returns 2–3 instructions including a syncNative to the wSOL mint.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement utils + page** (fetch mocked in tests with `vi.stubGlobal('fetch', …)`).
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: swap challenge with Jupiter and devnet practice mode`.

### Task 20: Challenge 3 — Stake

**Files:**
- Create: `pages/challenges/stake.vue`, `utils/stake.ts`, `utils/validators.ts`
- Test: `test/unit/stake.test.ts`, `test/unit/validators.test.ts`

**Interfaces:**
- Consumes: ChallengeShell (17), useWallet (6).
- Produces: `validators.ts`: `SUGGESTED_VALIDATORS: Record<Cluster, { name:string; voteAddress:string; note:string }[]>` — 3 mainnet (well-known, e.g. Solana Foundation–delegated community validators; verify addresses at implementation) and ≥1 devnet validator (fetchable from RPC at runtime with static fallback). `stake.ts`: `buildStakeIxs({from, stakeSeedOrAddress, voteAddress, lamports})` → create funded stake account + `Initialize` + `DelegateStake` instructions; **check `@solana-program/stake` on npm first — if published use it, otherwise hand-roll the two instruction encodings** (Initialize discriminator 0, DelegateStake discriminator 2; layouts from the stake program docs, pinned by tests). Page: validator picker cards, amount input (min ~0.01 SOL + rent), plain-English explanation of rewards and the ~2–3 day unlock ("unstaking takes a couple of days — like giving notice at the bank").

- [ ] **Step 1: Write failing tests**: suggested validators list non-empty per cluster with valid addresses; `buildStakeIxs` returns instructions whose first creates an account of exactly 200 bytes (stake state size) funded with `lamports + rent`, and whose delegate instruction targets the given vote address; encoding snapshot for Initialize/DelegateStake discriminators.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement utils + page.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: stake challenge`.

### Task 21: Challenge 4 — Memecoin

**Files:**
- Create: `pages/challenges/memecoin.vue`, `utils/memecoin.ts`
- Test: `test/unit/memecoin.test.ts`

**Interfaces:**
- Consumes: ChallengeShell (17), useWallet (6), `@solana-program/token` (19).
- Produces: `buildMetadataJson({name, symbol, description, imageDataUri}): string` (Metaplex-standard JSON); `toDataUri(json): string`; `buildMemecoinIxs({payer, mint, name, symbol, decimals, supply, revokeMintAuthority})` → create mint (SPL Token), create ATA, mint supply, **hand-rolled `CreateMetadataAccountV3` instruction** to program `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` (borsh layout pinned by tests — avoids a heavy umi dependency), optional `SetAuthority` revoking mint. Icon: user picks one of ~8 lucide icons + a background color; rendered client-side to a small PNG data URI (canvas) for `imageDataUri`. Page: name/symbol/supply/decimals form with validation (name ≤ 32, symbol ≤ 10, supply > 0), cost note (rent ≈ 0.002 SOL + fees), review panel, success shows mint address + explorer link and "what just happened" recap.

- [ ] **Step 1: Write failing tests**: metadata JSON contains name/symbol/image; `toDataUri` prefix `data:application/json;base64,` and URI ≤ 200 chars for typical input (enforce by trimming description); validation rejects empty name / oversized symbol / zero supply; instruction list order: createMint → createATA → mintTo → createMetadata → optional revoke; metadata instruction program id equals the constant above.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement utils + page.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: memecoin challenge`.

### Task 22: Glossary page

**Files:**
- Create: `content/glossary.ts`, `pages/glossary.vue`
- Test: `test/unit/glossary.test.ts`

**Interfaces:**
- Produces: `GLOSSARY: { term: string; slug: string; definition: string }[]` (≥ 14 terms: wallet, recovery phrase, public key, blockchain, validator, decentralized, transaction, fee, SOL, lamport, stablecoin, USDC, staking, memecoin, explorer); page anchors `#<slug>` matching GlossaryTerm links, big type, alphabetical.

- [ ] **Step 1: Write failing test**: unique slugs; every term used by GlossaryTerm in lesson content files exists in GLOSSARY (scan `content/lessons/*.ts` for `term="…"` or a `terms:` list pinned per lesson — pin a `terms: string[]` in each lesson content file to make this testable).
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement content + page; backfill `terms:` in lesson content files.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** `feat: glossary`.

### Task 23: GitHub Pages deploy workflow & README

**Files:**
- Create: `.github/workflows/deploy.yml`; Modify: `README.md`

**Interfaces:**
- Produces: workflow on push to `main` (+ `workflow_dispatch`): `actions/configure-pages`, setup-node 22 with npm cache, `npm ci`, `NUXT_APP_BASE_URL=/SeniorTutorial/ npx nuxi generate`, `actions/upload-pages-artifact` on `.output/public`, `actions/deploy-pages`; permissions `pages: write, id-token: write`; concurrency group `pages`. README: what the app is, local dev commands, test command, deployment notes incl. enabling Pages → Source: GitHub Actions, tech stack table.

- [ ] **Step 1: Write workflow + README.**
- [ ] **Step 2: Validate workflow YAML** (`npx yaml-lint` or node parse) and simulate env: `NUXT_APP_BASE_URL=/SeniorTutorial/ npx nuxi generate` → grep `.output/public/index.html` for `"/SeniorTutorial/"-prefixed asset links.
- [ ] **Step 3: Commit** `ci: deploy to GitHub Pages`.

### Task 24: Final verification

**Files:**
- Modify: any fixes

- [ ] **Step 1: `npm test`** — all suites PASS.
- [ ] **Step 2: `npm run build`** — generate succeeds; confirm every prerendered route exists (`learn/*`, `challenges/*`, `start`, `glossary`, `404` via error.vue).
- [ ] **Step 3: Smoke-check built output** with `npx serve .output/public` + fetch key routes; verify no `window`/wallet code in prerendered HTML execution path (build would have failed otherwise), and that lucide icons render (no emoji chars in built HTML: grep for common emoji ranges).
- [ ] **Step 4: A11y sweep**: every interactive element keyboard-focusable with visible focus; every form input has a label; touch targets ≥ 48px (grep component styles); reduced-motion reset present in built CSS.
- [ ] **Step 5: Commit** `chore: final verification fixes` (if any).

## Self-Review Notes

- **Spec coverage:** §5 lessons → Tasks 8–15; §6 start → 16; §7 challenges → 17–21; §8 wallet/RPC → 5–6; §9 design system → 2–3 + component tasks; §10 state → 4; §11 CI/CD → 1, 23; §12 tests → per-task; glossary → 22. No gaps.
- **Type consistency:** `ChallengeId`, `Cluster`, `TxState`, `explorerTxUrl`, `sendInstructions`, `markLessonDone/markChallengeDone` used identically across tasks.
- **Proportion:** steps pin names/values/tests; bodies left to implementer except consensus-critical encodings (stake, metadata), which are pinned by tests instead of transcripts.
