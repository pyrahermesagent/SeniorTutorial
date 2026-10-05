<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import AppNotice from '../AppNotice.vue'
import BalanceChip from '../BalanceChip.vue'
import WalletButton from '../WalletButton.vue'
import DevnetFaucetButton from './DevnetFaucetButton.vue'
import OnrampCard from './OnrampCard.vue'
import WalletInstallCard from './WalletInstallCard.vue'
import { useSolana } from '../../composables/useSolana'
import { useWallet } from '../../composables/useWallet'
import { ONRAMPS, WALLETS } from '../../utils/onramps'

const { account } = useWallet()
const { cluster, getBalance } = useSolana()

/*
 * Prerendered HTML always shows the defaults (Devnet, no wallet, no ticks).
 * Persisted state and live balances only apply after mount, so hydration
 * matches the static markup (same pattern as NetworkToggle).
 */
const settled = ref(false)

const balance = ref<bigint | null>(null)
const balanceLoading = ref(false)

async function refreshBalance() {
  const current = account.value
  if (!current) {
    balance.value = null
    return
  }
  balanceLoading.value = true
  try {
    balance.value = await getBalance(current.address)
  } catch {
    // A failed refresh keeps the last known balance; the chip can retry.
  } finally {
    balanceLoading.value = false
  }
}

onMounted(() => {
  settled.value = true
  if (account.value) void refreshBalance()
})

watch(account, (next) => {
  if (settled.value) {
    if (next) void refreshBalance()
    else balance.value = null
  }
})

watch(cluster, () => {
  if (settled.value && account.value) void refreshBalance()
})

const connected = computed(() => settled.value && account.value !== null)
const shownCluster = computed(() => (settled.value ? cluster.value : 'devnet'))
const step1Done = computed(() => connected.value)
const step2Done = computed(
  () => settled.value && balance.value !== null && balance.value > 0n,
)

const CHALLENGE_PREVIEWS = [
  {
    title: 'Send a little SOL',
    line: 'Make a real (tiny) payment to someone you know.',
    icon: 'zap',
  },
  {
    title: 'Swap one coin for another',
    line: 'Trade a little SOL for a different token, the way shops trade currencies.',
    icon: 'refresh-cw',
  },
  {
    title: 'Earn by staking',
    line: 'Lend your SOL to the network and earn a little back.',
    icon: 'landmark',
  },
  {
    title: 'Meet a memecoin',
    line: 'See what a joke coin looks like up close — safely, with play-sized amounts.',
    icon: 'coins',
  },
]
</script>

<template>
  <ol class="step-list">
    <li>
      <details class="step" open>
        <summary class="step__summary">
          <span class="step__number" aria-hidden="true">1</span>
          <span class="step__title">Get a wallet</span>
          <span v-if="step1Done" class="step__done">
            <AppIcon name="circle-check" :size="24" />
            Done
          </span>
          <AppIcon name="chevron-down" :size="28" class="step__chevron" />
        </summary>
        <div class="step__body">
          <p>
            A wallet is a free app that holds your Solana money and proves it is yours. Either of
            these two is a good choice — install whichever you like, on your phone or your
            computer.
          </p>
          <div class="step__wallet-grid">
            <WalletInstallCard v-for="wallet in WALLETS" :key="wallet.name" :wallet="wallet" />
          </div>
          <div class="step__connect">
            <AppNotice v-if="connected" kind="success" class="step__connected-note">
              <p>Your wallet is connected. Well done — that was the hardest part.</p>
            </AppNotice>
            <template v-else>
              <p>
                Once your wallet is installed, come back here and connect it. Connecting is safe —
                it only lets this site see your balance, never move your money.
              </p>
              <WalletButton />
            </template>
          </div>
        </div>
      </details>
    </li>

    <li>
      <details class="step">
        <summary class="step__summary">
          <span class="step__number" aria-hidden="true">2</span>
          <span class="step__title">Add about $10 of SOL</span>
          <span v-if="step2Done" class="step__done">
            <AppIcon name="circle-check" :size="24" />
            Done
          </span>
          <AppIcon name="chevron-down" :size="28" class="step__chevron" />
        </summary>
        <div class="step__body">
          <p>
            SOL is Solana's money. The challenges ahead each spend a few cents of it, so about
            $10 worth is plenty to learn with.
          </p>

          <p v-if="!connected" class="step__hint">
            Connect your wallet in step 1 first — then this step will show your balance and where
            to get SOL.
          </p>

          <template v-else>
            <BalanceChip
              :lamports="balance"
              :loading="balanceLoading"
              @refresh="refreshBalance"
            />

            <div v-if="shownCluster === 'devnet'" class="step__funding">
              <p>
                You are on Devnet — the free practice network — so SOL here costs nothing. One
                tap adds 1 practice SOL to your wallet.
              </p>
              <DevnetFaucetButton @funded="refreshBalance" />
            </div>

            <div v-else class="step__funding">
              <p>
                You are on Mainnet — the real network. These trusted shops sell SOL and send it
                straight to your wallet:
              </p>
              <div class="step__onramp-grid">
                <OnrampCard
                  v-for="onramp in ONRAMPS"
                  :key="onramp.name"
                  :onramp="onramp"
                  :address="account!.address"
                />
              </div>
              <AppNotice kind="info" class="step__onramp-note">
                <p>
                  Honest expectations: each shop will check your identity (a photo of your ID is
                  normal) and keeps a small fee. That is how every legitimate seller works — be
                  suspicious of anyone who promises to skip it.
                </p>
              </AppNotice>
            </div>
          </template>
        </div>
      </details>
    </li>

    <li>
      <details class="step">
        <summary class="step__summary">
          <span class="step__number" aria-hidden="true">3</span>
          <span class="step__title">Your first challenges</span>
          <AppIcon name="chevron-down" :size="28" class="step__chevron" />
        </summary>
        <div class="step__body">
          <p>
            Once your wallet holds a little SOL, try these small challenges. Each one takes only
            a few minutes, and each needs a connected wallet with some SOL in it.
          </p>
          <div class="step__challenge-grid">
            <NuxtLink
              v-for="preview in CHALLENGE_PREVIEWS"
              :key="preview.title"
              to="/challenges"
              class="challenge-preview"
            >
              <AppIcon :name="preview.icon" :size="28" class="challenge-preview__icon" />
              <span class="challenge-preview__body">
                <span class="challenge-preview__title">{{ preview.title }}</span>
                <span class="challenge-preview__line">{{ preview.line }}</span>
              </span>
              <AppIcon name="arrow-right" :size="24" class="challenge-preview__arrow" />
            </NuxtLink>
          </div>
          <p class="step__honesty">
            There are no prizes — the reward is knowing how this works, and having done it
            yourself.
          </p>
        </div>
      </details>
    </li>
  </ol>
</template>

<style scoped>
.step-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  background-color: var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  border-radius: 12px;
}

.step[open] {
  border-color: var(--color-ink);
}

.step__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-lg);
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-ink);
  cursor: pointer;
  list-style: none; /* hide the native triangle; the chevron marks state */
}

.step__summary::-webkit-details-marker {
  display: none;
}

.step__summary:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
  border-radius: 12px;
}

.step__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.4rem; /* 48px badge */
  height: 2.4rem;
  /* Amber only ever carries ink text — light text on it fails AA (2.02:1). */
  background-color: var(--color-accent);
  border: 2px solid var(--color-ink);
  border-radius: 50%;
  font-size: var(--text-lg);
  color: var(--color-ink);
}

.step__title {
  flex: 1;
}

.step__done {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-success-bg);
  border: 2px solid var(--color-success);
  border-radius: 999px;
  font-size: var(--text-base);
  color: var(--color-success);
}

.step__chevron {
  flex-shrink: 0;
  transition: transform 160ms ease;
}

.step[open] .step__chevron {
  transform: rotate(180deg);
}

.step__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0 var(--space-3) var(--space-3);
}

.step__body > p {
  margin: 0;
}

.step__wallet-grid,
.step__onramp-grid,
.step__challenge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--space-2);
}

.step__connect {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.step__connect p {
  margin: 0;
}

.step__connected-note {
  max-width: 40rem;
}

.step__connected-note p {
  margin: 0;
}

.step__hint {
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-info-bg);
  border: 2px solid var(--color-secondary);
  border-radius: 12px;
}

.step__funding {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.step__funding > p {
  margin: 0;
}

.step__onramp-note {
  max-width: 40rem;
}

.step__onramp-note p {
  margin: 0;
}

.challenge-preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 3.2rem;
  padding: var(--space-2);
  background-color: var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  border-radius: 12px;
  color: var(--color-ink);
  text-decoration: none;
}

.challenge-preview:hover {
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.challenge-preview__icon {
  flex-shrink: 0;
  color: var(--color-secondary);
}

.challenge-preview__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.challenge-preview__title {
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.3;
}

.challenge-preview__line {
  font-size: var(--text-base);
  line-height: 1.4;
}

.challenge-preview__arrow {
  flex-shrink: 0;
  margin-left: auto;
}

.step__honesty {
  font-weight: 700;
}
</style>
