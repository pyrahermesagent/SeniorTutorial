<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { address as toAddress } from '@solana/kit'
import AppButton from '../../components/AppButton.vue'
import AppCard from '../../components/AppCard.vue'
import AppNotice from '../../components/AppNotice.vue'
import BalanceChip from '../../components/BalanceChip.vue'
import ChallengeShell from '../../components/ChallengeShell.vue'
import TxStatus, { type TxState } from '../../components/TxStatus.vue'
import { useProgress } from '../../composables/useProgress'
import { useSolana } from '../../composables/useSolana'
import { useWallet } from '../../composables/useWallet'
import { formatSol, explorerTxUrl } from '../../utils/cluster'
import { UnconfirmedBroadcastError } from '../../utils/wallets'
import {
  DEFAULT_SLIPPAGE_BPS,
  JupiterError,
  SOL_MINT,
  USDC_MAINNET_MINT,
  fetchQuote,
  fetchSwapTransaction,
  formatUsdc,
  type JupiterQuote,
} from '../../utils/jupiter'
import { buildWrapSolIxs, describeSwapMode, validateSwapAmount } from '../../utils/swap'

const { account, sendInstructions, sendVersionedTransaction } = useWallet()
const { cluster, getBalance } = useSolana()
const { markChallengeDone } = useProgress()

const mode = computed(() => describeSwapMode(cluster.value))

type Step = 'form' | 'confirm' | 'sending'

const step = ref<Step>('form')
const amount = ref('')
const balance = ref<bigint | null>(null)
const balanceLoading = ref(false)
const balanceError = ref(false)
const quote = ref<JupiterQuote | null>(null)
const quoting = ref(false)
const quoteFailed = ref(false)
const txState = ref<TxState>('idle')
const signature = ref<string>()
const failureCopy = ref<string>()
const staleReason = ref<string | null>(null)
// Post-broadcast uncertainty: the swap reached the network but its outcome is
// failed-on-chain or unknown. Shown with the signature, never as "nothing
// was sent" — that lie would invite a double-swap with real money.
const unconfirmed = ref<{ signature: string; failedOnChain: boolean } | null>(null)

async function refreshBalance() {
  const address = account.value?.address
  if (!address) return
  balanceLoading.value = true
  balanceError.value = false
  try {
    balance.value = await getBalance(address)
  } catch {
    balance.value = null
    balanceError.value = true
  } finally {
    balanceLoading.value = false
  }
}

function resetFlow() {
  step.value = 'form'
  txState.value = 'idle'
  signature.value = undefined
  failureCopy.value = undefined
  staleReason.value = null
  quote.value = null
  quoteFailed.value = false
  unconfirmed.value = null
}

watch(
  () => account.value?.address,
  (address, previous) => {
    if (address && address !== previous) {
      void refreshBalance()
    } else if (!address) {
      balance.value = null
      resetFlow()
    }
  },
  { immediate: true },
)

// Switching networks switches the whole mechanic (real swap vs practice
// wrap), so any in-flight flow goes back to a clean form.
watch(cluster, () => {
  resetFlow()
})

// Editing the amount clears the stale-review reason and any old quote notice.
watch(amount, () => {
  staleReason.value = null
  quoteFailed.value = false
})

const validation = computed(() =>
  validateSwapAmount({
    amountSol: amount.value,
    balanceLamports: balance.value ?? 0n,
  }),
)

const lamports = computed(() => (validation.value.ok ? validation.value.lamports : 0n))

const amountProblem = computed(() => {
  if (amount.value.trim() === '' || validation.value.ok) return null
  if (balance.value === null) return null
  return validation.value.reason
})

const canSeeRate = computed(
  () => balance.value !== null && validation.value.ok && !quoting.value,
)

const amountSolText = computed(() => formatSol(lamports.value))

const quoteOutAmount = computed(() => (quote.value ? formatUsdc(quote.value.outAmount) : ''))
const quoteMinAmount = computed(() =>
  quote.value ? formatUsdc(quote.value.otherAmountThreshold) : '',
)

const quoteSummary = computed(() =>
  quote.value
    ? `Your ${amountSolText.value} SOL buys about ${quoteOutAmount.value} USDC. You will receive at least ${quoteMinAmount.value} USDC.`
    : '',
)

const practiceSummary = computed(
  () =>
    `You are wrapping ${amountSolText.value} SOL into wSOL — the same SOL, changed into the token form that swaps use.`,
)

async function seeTheRate() {
  if (!canSeeRate.value) return
  staleReason.value = null
  quoteFailed.value = false
  quoting.value = true
  try {
    quote.value = await fetchQuote({
      inputMint: SOL_MINT,
      outputMint: USDC_MAINNET_MINT,
      amountLamports: lamports.value,
      slippageBps: DEFAULT_SLIPPAGE_BPS,
    })
    step.value = 'confirm'
  } catch {
    // JupiterError('unavailable') and any unexpected failure land here: the
    // learner only ever sees the calm notice, never a raw network error.
    quote.value = null
    quoteFailed.value = true
  } finally {
    quoting.value = false
  }
}

function startPracticeReview() {
  if (balance.value === null || !validation.value.ok) return
  staleReason.value = null
  step.value = 'confirm'
}

const unconfirmedCopy = computed(() =>
  unconfirmed.value?.failedOnChain
    ? 'Your swap reached the network but could not be completed. Your SOL should still be in your wallet, minus a tiny network fee — check the explorer link to be sure.'
    : "We sent your swap, but we couldn't confirm it yet. Please check your wallet — or the explorer link — before trying again.",
)

const unconfirmedExplorerUrl = computed(() =>
  unconfirmed.value ? explorerTxUrl(unconfirmed.value.signature, cluster.value) : '',
)

const retryCopy = computed(() =>
  mode.value === 'practice' ? 'Go back and try again' : 'Go back and get a fresh rate',
)

function backToConfirm() {
  if (mode.value === 'jupiter') {
    // Jupiter quotes expire: retrying a swap re-POSTs quoteResponse, so the
    // only honest retry is a fresh rate. Practice wraps have no quote, so
    // their confirm card is safe to restore.
    resetFlow()
    return
  }
  step.value = 'confirm'
  txState.value = 'idle'
}

function backToForm() {
  step.value = 'form'
  txState.value = 'idle'
}

function sendAnother() {
  resetFlow()
}

function toPlainSendError(error: unknown): string {
  if (error instanceof JupiterError) {
    return 'We could not prepare this swap right now — nothing was sent. Please try again in a moment.'
  }
  if (error instanceof Error && /insufficient/i.test(error.message)) {
    return 'Your wallet did not have quite enough SOL for this, so nothing was sent.'
  }
  return mode.value === 'practice'
    ? 'The wrap did not go through — nothing was sent.'
    : 'The swap did not go through — nothing was sent.'
}

async function sendTransaction<T>(
  prepare: () => Promise<T>,
  send: (prepared: T) => Promise<string>,
) {
  step.value = 'sending'
  signature.value = undefined
  failureCopy.value = undefined
  unconfirmed.value = null
  txState.value = 'building'
  try {
    const prepared = await prepare()
    txState.value = 'awaiting-signature'
    signature.value = await send(prepared)
    txState.value = 'success'
    markChallengeDone('swap')
    void refreshBalance()
  } catch (error) {
    if (error === 'rejected') {
      txState.value = 'cancelled'
      return
    }
    if (error instanceof UnconfirmedBroadcastError) {
      // The swap was broadcast — outcome failed-on-chain or unknown. Show the
      // dedicated panel (with explorer link) instead of a failure that would
      // falsely claim nothing was sent. The challenge is NOT marked done.
      unconfirmed.value = {
        signature: error.signature,
        failedOnChain: error.failedOnChain,
      }
      txState.value = 'idle'
      return
    }
    failureCopy.value = toPlainSendError(error)
    txState.value = 'failed'
  }
}

async function confirmSwap() {
  if (!account.value || !quote.value) return
  if (!validation.value.ok) {
    // Details went stale while the quote card was open — explain, don't dead-click.
    staleReason.value = validation.value.reason
    txState.value = 'idle'
    step.value = 'form'
    return
  }
  const currentQuote = quote.value
  const address = account.value.address
  await sendTransaction(
    () => fetchSwapTransaction(currentQuote, address),
    (swapTransaction) => sendVersionedTransaction(swapTransaction),
  )
}

async function confirmPracticeWrap() {
  if (!account.value) return
  if (!validation.value.ok) {
    staleReason.value = validation.value.reason
    txState.value = 'idle'
    step.value = 'form'
    return
  }
  const owner = toAddress(account.value.address)
  const wrapLamports = lamports.value
  await sendTransaction(
    () => buildWrapSolIxs(owner, wrapLamports),
    (ixs) => sendInstructions(ixs),
  )
}

function confirm() {
  if (mode.value === 'practice') {
    void confirmPracticeWrap()
  } else {
    void confirmSwap()
  }
}
</script>

<template>
  <div class="swap">
    <header class="swap__header">
      <h1 class="swap__title">Swap SOL for USDC</h1>
    </header>

    <ChallengeShell
      challenge="swap"
      goal="Swap a little SOL for USDC — dollars that live on Solana"
      est-cost="The amount you swap, plus a tiny network fee"
    >
      <template v-if="txState === 'success'" #recap>
        <div class="swap__recap">
          <template v-if="mode === 'practice'">
            <p class="swap__recap-line">
              You just did exactly what a swap does with your SOL behind the scenes: your SOL became
              wSOL, the token form swaps use.
            </p>
            <p class="swap__recap-line">
              On the real network (Mainnet) that wrap happens automatically inside the swap, and
              your SOL comes back as the coin you picked — for example USDC.
            </p>
          </template>
          <template v-else>
            <p class="swap__recap-line">
              You just swapped money with no bank or shop involved — your {{ amountSolText }} SOL
              became about {{ quoteOutAmount }} USDC.
            </p>
            <p class="swap__recap-line">
              USDC is a stablecoin: each coin is designed to always be worth about one US dollar,
              so it is a calm way to keep value on Solana.
            </p>
          </template>
        </div>
      </template>

      <AppNotice v-if="mode === 'practice'" kind="info">
        <p>
          <strong>Practice mode.</strong> On the practice network there are no real markets, so
          instead you'll do the on-chain equivalent: wrap SOL into wSOL — the same move swaps make
          under the hood.
        </p>
      </AppNotice>

      <div class="swap__balance">
        <BalanceChip :lamports="balance" :loading="balanceLoading" @refresh="refreshBalance" />
      </div>

      <AppNotice v-if="balanceError" kind="warning">
        <p>
          We could not read your balance just now. Check your internet connection, then press the
          little refresh arrow next to the balance.
        </p>
      </AppNotice>

      <div v-if="step === 'form'" class="swap__form">
        <AppNotice v-if="staleReason" kind="warning">
          <p>{{ staleReason }}</p>
        </AppNotice>

        <AppNotice v-if="quoteFailed" kind="warning">
          <p>We couldn't fetch a swap quote right now — please try again in a moment.</p>
        </AppNotice>

        <div class="swap__field">
          <label class="swap__label" for="swap-amount">
            {{ mode === 'practice' ? 'Amount to wrap, in SOL' : 'Amount to swap, in SOL' }}
          </label>
          <input
            id="swap-amount"
            v-model="amount"
            class="swap__input"
            type="text"
            inputmode="decimal"
            placeholder="0.05"
            autocomplete="off"
          />
          <p v-if="amountProblem" class="swap__hint" role="alert">{{ amountProblem }}</p>
          <p v-else class="swap__hint">
            <template v-if="mode === 'practice'">A small amount is perfect — 0.01 SOL.</template>
            <template v-else>
              A small amount is perfect for a first swap — 0.05 SOL. USDC is a coin that is
              designed to always be worth about one US dollar.
            </template>
          </p>
        </div>

        <AppButton
          size="lg"
          :disabled="!canSeeRate"
          @click="mode === 'practice' ? startPracticeReview() : seeTheRate()"
        >
          <template v-if="mode === 'practice'">Review this wrap</template>
          <template v-else>{{ quoting ? 'Checking the rate…' : 'See the rate' }}</template>
        </AppButton>
      </div>

      <AppCard v-else-if="step === 'confirm'" class="swap__confirm">
        <h2 class="swap__subtitle">Check it, then confirm</h2>
        <p class="swap__summary">
          {{ mode === 'practice' ? practiceSummary : quoteSummary }}
        </p>
        <dl class="swap__details">
          <template v-if="mode === 'practice'">
            <div class="swap__detail">
              <dt class="swap__term">You wrap</dt>
              <dd class="swap__value">{{ amountSolText }} SOL</dd>
            </div>
            <div class="swap__detail">
              <dt class="swap__term">You receive</dt>
              <dd class="swap__value">{{ amountSolText }} wSOL (wrapped SOL)</dd>
            </div>
          </template>
          <template v-else>
            <div class="swap__detail">
              <dt class="swap__term">You swap</dt>
              <dd class="swap__value">{{ amountSolText }} SOL</dd>
            </div>
            <div class="swap__detail">
              <dt class="swap__term">You receive</dt>
              <dd class="swap__value">about {{ quoteOutAmount }} USDC</dd>
            </div>
            <div class="swap__detail">
              <dt class="swap__term">You receive at least</dt>
              <dd class="swap__value">{{ quoteMinAmount }} USDC</dd>
            </div>
          </template>
          <div class="swap__detail">
            <dt class="swap__term">Network fee</dt>
            <dd class="swap__value">Less than a penny</dd>
          </div>
        </dl>

        <div class="swap__actions">
          <AppButton size="lg" @click="confirm">
            {{ mode === 'practice' ? 'Yes — wrap it now' : 'Yes — swap now' }}
          </AppButton>
          <AppButton variant="ghost" @click="backToForm">Go back and change it</AppButton>
        </div>
      </AppCard>

      <div v-else class="swap__sending">
        <template v-if="unconfirmed">
          <AppNotice kind="warning">
            <p>
              {{ unconfirmedCopy }}
              <a
                :href="unconfirmedExplorerUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="swap__explorer-link"
              >
                See it on the Solana Explorer
              </a>
            </p>
          </AppNotice>
          <AppButton variant="ghost" @click="resetFlow">Go back to the start</AppButton>
        </template>
        <template v-else>
          <TxStatus :state="txState" :signature="signature" :error="failureCopy">
            <template #retry>
              <AppButton variant="ghost" @click="backToConfirm">
                {{ retryCopy }}
              </AppButton>
            </template>
          </TxStatus>
          <AppButton v-if="txState === 'failed'" variant="ghost" @click="backToConfirm">
            {{ retryCopy }}
          </AppButton>
          <AppButton v-if="txState === 'success'" variant="secondary" @click="sendAnother">
            {{ mode === 'practice' ? 'Wrap more SOL' : 'Swap again' }}
          </AppButton>
        </template>
      </div>
    </ChallengeShell>
  </div>
</template>

<style scoped>
.swap {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
}

.swap__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.swap__title {
  margin: 0;
}

.swap__balance {
  display: flex;
}

.swap__form,
.swap__confirm,
.swap__sending {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.swap__field {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--space-1);
}

.swap__label {
  font-size: var(--text-base);
  font-weight: 700;
}

.swap__input {
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
}

.swap__hint {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-ink);
}

.swap__subtitle {
  margin: 0;
}

.swap__summary {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.swap__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-self: stretch;
  margin: 0;
}

.swap__detail {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.swap__term {
  font-size: var(--text-base);
  font-weight: 700;
}

.swap__value {
  margin: 0;
  font-size: var(--text-base);
}

.swap__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.swap__explorer-link {
  display: inline-block;
  margin-top: var(--space-1);
  font-weight: 700;
}

.swap__recap {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.swap__recap-line {
  margin: 0;
  font-size: var(--text-base);
}

.swap__recap-line:first-child {
  font-size: var(--text-lg);
  font-weight: 700;
}
</style>
