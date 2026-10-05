<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  address as toAddress,
  isSolanaError,
} from '@solana/kit'
import AppButton from '../../components/AppButton.vue'
import AppCard from '../../components/AppCard.vue'
import AppIcon from '../../components/AppIcon.vue'
import AppNotice from '../../components/AppNotice.vue'
import BalanceChip from '../../components/BalanceChip.vue'
import ChallengeShell from '../../components/ChallengeShell.vue'
import TxStatus, { type TxState } from '../../components/TxStatus.vue'
import { useProgress } from '../../composables/useProgress'
import { useSolana } from '../../composables/useSolana'
import { useWallet } from '../../composables/useWallet'
import { explorerAddressUrl, formatSol } from '../../utils/cluster'
import {
  MEMECOIN_COLORS,
  MEMECOIN_ICONS,
  MEMECOIN_SETUP_LAMPORTS,
  buildMemecoinIxs,
  buildMetadataJson,
  renderCoinImagePng,
  toDataUri,
  validateMemecoinForm,
} from '../../utils/memecoin'
import { shortenAddress } from '../../utils/wallets'

const { account, sendInstructions } = useWallet()
const { cluster, getBalance } = useSolana()
const { markChallengeDone } = useProgress()

type Step = 'form' | 'review' | 'sending'

const step = ref<Step>('form')
const name = ref('')
const symbol = ref('')
const supply = ref('1000000')
// Decimals stay fixed at 9 — the Solana standard — so seniors never face an
// advanced knob. The validator still accepts 0–9 for future flexibility.
const FIXED_DECIMALS = '9'
const iconKey = ref<string>(MEMECOIN_ICONS[0].key)
const colorHex = ref<string>(MEMECOIN_COLORS[0].hex)
const lockTheMint = ref(true)
const balance = ref<bigint | null>(null)
const balanceLoading = ref(false)
const balanceError = ref(false)
const txState = ref<TxState>('idle')
const signature = ref<string>()
const failureCopy = ref<string>()
const staleReason = ref<string | null>(null)
const createdMintAddress = ref<string | null>(null)
const createdLocked = ref(true)

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
  createdMintAddress.value = null
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

// Switching networks mid-flow would surprise — start clean.
watch(cluster, () => {
  resetFlow()
})

watch([name, symbol, supply, iconKey, colorHex, lockTheMint], () => {
  staleReason.value = null
})

const validation = computed(() =>
  validateMemecoinForm({
    name: name.value,
    symbol: symbol.value,
    supply: supply.value,
    decimals: FIXED_DECIMALS,
  }),
)

// Only nudge once the learner has actually started typing something.
const startedTyping = computed(() => name.value.trim() !== '' || symbol.value.trim() !== '')

const formProblem = computed(() => {
  if (validation.value.ok || !startedTyping.value) return null
  return validation.value.reason
})

const hasEnoughSol = computed(
  () => balance.value !== null && balance.value >= MEMECOIN_SETUP_LAMPORTS,
)

const solProblem = computed(() => {
  if (!validation.value.ok || balance.value === null || hasEnoughSol.value) return null
  return `Your wallet does not have quite enough SOL for the one-time setup — it needs about ${formatSol(MEMECOIN_SETUP_LAMPORTS)} SOL.`
})

const canReview = computed(
  () => balance.value !== null && validation.value.ok && hasEnoughSol.value,
)

const trimmedName = computed(() => name.value.trim())
const trimmedSymbol = computed(() => symbol.value.trim())

const prettySupply = computed(() =>
  validation.value.ok ? validation.value.supply.toLocaleString('en-US') : supply.value,
)

const setupCostText = computed(() => formatSol(MEMECOIN_SETUP_LAMPORTS))

const summaryCopy = computed(() => {
  if (!validation.value.ok) return ''
  return `We will create ${prettySupply.value} ${trimmedSymbol.value}, put them in your wallet, and register the name ${trimmedName.value}.`
})

const previewName = computed(() => trimmedName.value || 'Your coin')
const previewSymbol = computed(() => trimmedSymbol.value || 'SYMBOL')

const mintExplorerUrl = computed(() =>
  createdMintAddress.value ? explorerAddressUrl(createdMintAddress.value, cluster.value) : '',
)

function startReview() {
  if (!canReview.value) return
  staleReason.value = null
  step.value = 'review'
}

function backToReview() {
  step.value = 'review'
  txState.value = 'idle'
}

function createAnother() {
  resetFlow()
}

function toPlainSendError(error: unknown): string {
  if (isSolanaError(error, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)) {
    // The signed transaction WAS broadcast; confirmation simply raced the
    // blockhash expiry. Never claim "nothing was created" here — that lie
    // invites a second creation with real money.
    return 'Your coin creation was sent to the network, but it is taking longer than expected to confirm. Please check your wallet\u2019s activity tab before trying again — if the transaction shows up there, your coin was created.'
  }
  if (error instanceof Error && /insufficient/i.test(error.message)) {
    return 'Your wallet did not have quite enough SOL for this, so no coin was created.'
  }
  return 'The coin was not created — nothing was sent.'
}

async function confirmAndCreate() {
  if (!account.value) return
  if (!validation.value.ok) {
    // Details went stale while the review card was open — explain, don't dead-click.
    staleReason.value = validation.value.reason
    txState.value = 'idle'
    step.value = 'form'
    return
  }
  const payer = toAddress(account.value.address)
  const supplyAmount = validation.value.supply
  const decimals = validation.value.decimals
  step.value = 'sending'
  signature.value = undefined
  failureCopy.value = undefined
  txState.value = 'building'
  try {
    // Canvas work and keypair generation happen here, inside the click
    // handler, so the prerendered page never touches browser-only APIs.
    const imageDataUri = await renderCoinImagePng({
      iconKey: iconKey.value,
      colorHex: colorHex.value,
    })
    const metadataJson = buildMetadataJson({
      name: trimmedName.value,
      symbol: trimmedSymbol.value,
      description: 'A homemade memecoin, created on Solana.',
      imageDataUri,
    })
    const uri = toDataUri(metadataJson)
    const built = await buildMemecoinIxs({
      payer,
      name: trimmedName.value,
      symbol: trimmedSymbol.value,
      uri,
      decimals,
      supply: supplyAmount,
      revokeMintAuthority: lockTheMint.value,
    })
    txState.value = 'awaiting-signature'
    // The fresh mint keypair must co-sign — the wallet can't sign for it, so
    // sendInstructions takes the local-signer path (like the stake challenge).
    signature.value = await sendInstructions(built.instructions, [built.mintSigner])
    txState.value = 'success'
    createdMintAddress.value = built.mintAddress
    createdLocked.value = lockTheMint.value
    markChallengeDone('memecoin')
    void refreshBalance()
  } catch (error) {
    if (error === 'rejected') {
      txState.value = 'cancelled'
      return
    }
    failureCopy.value = toPlainSendError(error)
    txState.value = 'failed'
  }
}
</script>

<template>
  <div class="memecoin">
    <header class="memecoin__header">
      <h1 class="memecoin__title">Create your own memecoin</h1>
    </header>

    <ChallengeShell
      challenge="memecoin"
      goal="Create your very own token on Solana — a real memecoin, made by you"
      est-cost="About 0.007 SOL for the one-time setup and fees"
    >
      <template v-if="txState === 'success' && createdMintAddress" #recap>
        <div class="memecoin__recap">
          <p class="memecoin__recap-line">
            Your coin <strong>{{ trimmedName }}</strong>
            ({{ trimmedSymbol }}) now lives on Solana — and the {{ prettySupply }} coins are in
            your wallet.
          </p>
          <p class="memecoin__recap-line">
            Every coin has an address, like a serial number. Yours is
            <span class="memecoin__mint">{{ shortenAddress(createdMintAddress, 6) }}</span> —
            anyone can look it up:
            <a
              :href="mintExplorerUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="memecoin__explorer-link"
            >
              See your coin on the Solana Explorer
              <AppIcon name="external-link" :size="20" />
            </a>
          </p>
          <p class="memecoin__recap-line">
            <template v-if="createdLocked">
              You locked the coin — no more can ever be printed, not even by you. That makes your
              coin finished and honest.
            </template>
            <template v-else>
              You left the coin unlocked — you can print more whenever you like.
            </template>
          </p>
          <p class="memecoin__recap-line">
            Remember: a memecoin has no promised value — anyone can make one. Yours is special
            because you made it.
          </p>
        </div>
      </template>

      <AppNotice kind="info">
        <p>
          <strong>What is a memecoin?</strong> A memecoin is a token anyone can create — it has
          no promised value. Yours is special because YOU made it.
        </p>
      </AppNotice>

      <div class="memecoin__balance">
        <BalanceChip :lamports="balance" :loading="balanceLoading" @refresh="refreshBalance" />
      </div>

      <AppNotice v-if="balanceError" kind="warning">
        <p>
          We could not read your balance just now. Check your internet connection, then press the
          little refresh arrow next to the balance.
        </p>
      </AppNotice>

      <div v-if="step === 'form'" class="memecoin__form">
        <AppNotice v-if="staleReason" kind="warning">
          <p>{{ staleReason }}</p>
        </AppNotice>

        <div class="memecoin__field">
          <label class="memecoin__label" for="coin-name">The coin's name</label>
          <input
            id="coin-name"
            v-model="name"
            class="memecoin__input"
            type="text"
            placeholder="Grandma Coin"
            autocomplete="off"
            maxlength="48"
          />
          <p class="memecoin__hint">Up to 32 letters — for example “Grandma Coin”.</p>
        </div>

        <div class="memecoin__field">
          <label class="memecoin__label" for="coin-symbol">The coin's symbol</label>
          <input
            id="coin-symbol"
            v-model="symbol"
            class="memecoin__input"
            type="text"
            placeholder="GRAN"
            autocomplete="off"
            maxlength="16"
          />
          <p class="memecoin__hint">
            The short ticker, up to 10 letters — for example “GRAN”.
          </p>
        </div>

        <div class="memecoin__field">
          <label class="memecoin__label" for="coin-supply">How many coins will exist</label>
          <input
            id="coin-supply"
            v-model="supply"
            class="memecoin__input"
            type="text"
            inputmode="numeric"
            placeholder="1000000"
            autocomplete="off"
          />
          <p class="memecoin__hint">
            A whole number — for example 1000000 (one million coins).
          </p>
          <p class="memecoin__hint">
            Behind the scenes your coin counts with 9 decimal places, the Solana standard — the
            app sets this for you, so there is nothing to decide here.
          </p>
        </div>

        <fieldset class="memecoin__picker">
          <legend class="memecoin__label">Pick a picture for your coin</legend>
          <div class="memecoin__swatches">
            <label
              v-for="icon in MEMECOIN_ICONS"
              :key="icon.key"
              class="memecoin__swatch"
              :class="{ 'memecoin__swatch--selected': iconKey === icon.key }"
            >
              <input
                v-model="iconKey"
                type="radio"
                name="coin-icon"
                :value="icon.key"
                class="memecoin__radio"
              />
              <span class="memecoin__swatch-face" :style="{ backgroundColor: colorHex }">
                <AppIcon :name="icon.key" :size="30" />
              </span>
              <span class="memecoin__swatch-label">{{ icon.label }}</span>
            </label>
          </div>
        </fieldset>

        <fieldset class="memecoin__picker">
          <legend class="memecoin__label">Pick a background colour</legend>
          <div class="memecoin__swatches">
            <label
              v-for="color in MEMECOIN_COLORS"
              :key="color.hex"
              class="memecoin__swatch"
              :class="{ 'memecoin__swatch--selected': colorHex === color.hex }"
            >
              <input
                v-model="colorHex"
                type="radio"
                name="coin-color"
                :value="color.hex"
                class="memecoin__radio"
              />
              <span
                class="memecoin__swatch-face"
                :style="{ backgroundColor: color.hex }"
              ></span>
              <span class="memecoin__swatch-label">{{ color.label }}</span>
            </label>
          </div>
        </fieldset>

        <div class="memecoin__preview" aria-live="polite">
          <span class="memecoin__preview-coin" :style="{ backgroundColor: colorHex }">
            <AppIcon :name="iconKey" :size="56" />
          </span>
          <span class="memecoin__preview-text">
            <span class="memecoin__preview-name">{{ previewName }}</span>
            <span class="memecoin__preview-symbol">{{ previewSymbol }}</span>
          </span>
        </div>

        <p v-if="formProblem" class="memecoin__problem" role="alert">{{ formProblem }}</p>
        <p v-else-if="solProblem" class="memecoin__problem" role="alert">{{ solProblem }}</p>

        <AppButton size="lg" :disabled="!canReview" @click="startReview">
          Review my coin
        </AppButton>
      </div>

      <AppCard v-else-if="step === 'review'" class="memecoin__review">
        <h2 class="memecoin__subtitle">Check it, then confirm</h2>
        <p class="memecoin__summary">{{ summaryCopy }}</p>

        <div class="memecoin__preview">
          <span class="memecoin__preview-coin" :style="{ backgroundColor: colorHex }">
            <AppIcon :name="iconKey" :size="56" />
          </span>
          <span class="memecoin__preview-text">
            <span class="memecoin__preview-name">{{ previewName }}</span>
            <span class="memecoin__preview-symbol">{{ previewSymbol }}</span>
          </span>
        </div>

        <dl class="memecoin__details">
          <div class="memecoin__detail">
            <dt class="memecoin__term">Name</dt>
            <dd class="memecoin__value">{{ trimmedName }}</dd>
          </div>
          <div class="memecoin__detail">
            <dt class="memecoin__term">Symbol</dt>
            <dd class="memecoin__value">{{ trimmedSymbol }}</dd>
          </div>
          <div class="memecoin__detail">
            <dt class="memecoin__term">How many</dt>
            <dd class="memecoin__value">{{ prettySupply }} coins</dd>
          </div>
          <div class="memecoin__detail">
            <dt class="memecoin__term">Decimals</dt>
            <dd class="memecoin__value">9 — the usual Solana standard</dd>
          </div>
          <div class="memecoin__detail">
            <dt class="memecoin__term">One-time setup cost</dt>
            <dd class="memecoin__value">
              About {{ setupCostText }} SOL — account setup plus the tiny network fee
            </dd>
          </div>
        </dl>

        <label
          class="memecoin__lock"
          :class="{ 'memecoin__lock--selected': lockTheMint }"
        >
          <input v-model="lockTheMint" type="checkbox" class="memecoin__checkbox" />
          <span class="memecoin__lock-text">
            <span class="memecoin__lock-title">Lock the coin when it is created</span>
            <span class="memecoin__lock-note">
              No more can ever be printed — not even by you. This makes your coin finished and
              honest. We recommend keeping this on.
            </span>
          </span>
        </label>

        <div class="memecoin__actions">
          <AppButton size="lg" @click="confirmAndCreate">
            Yes — create my coin
          </AppButton>
          <AppButton variant="ghost" @click="step = 'form'">Go back and change it</AppButton>
        </div>
      </AppCard>

      <div v-else class="memecoin__sending">
        <TxStatus :state="txState" :signature="signature" :error="failureCopy">
          <template #retry>
            <AppButton variant="ghost" @click="backToReview">
              Go back and check the details
            </AppButton>
          </template>
        </TxStatus>
        <AppButton v-if="txState === 'failed'" variant="ghost" @click="backToReview">
          Go back and check the details
        </AppButton>
        <AppButton v-if="txState === 'success'" variant="secondary" @click="createAnother">
          Make another coin
        </AppButton>
      </div>
    </ChallengeShell>
  </div>
</template>

<style scoped>
.memecoin {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
}

.memecoin__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.memecoin__title {
  margin: 0;
}

.memecoin__balance {
  display: flex;
}

.memecoin__form,
.memecoin__review,
.memecoin__sending {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.memecoin__field {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--space-1);
}

.memecoin__label {
  font-size: var(--text-base);
  font-weight: 700;
  padding: 0;
}

.memecoin__input {
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
}

.memecoin__hint {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-ink);
}

.memecoin__picker {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.memecoin__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.memecoin__swatch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  cursor: pointer;
}

.memecoin__swatch--selected {
  border-color: var(--color-accent);
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.memecoin__radio {
  width: 1.4rem;
  height: 1.4rem;
  margin: 0;
  flex-shrink: 0;
}

.memecoin__swatch-face {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  color: #ffffff;
  flex-shrink: 0;
}

.memecoin__swatch-label {
  font-size: var(--text-base);
}

.memecoin__preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  align-self: stretch;
}

.memecoin__preview-coin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 16px;
  color: #ffffff;
  flex-shrink: 0;
}

.memecoin__preview-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.memecoin__preview-name {
  font-size: var(--text-lg);
  font-weight: 700;
}

.memecoin__preview-symbol {
  font-size: var(--text-base);
  color: var(--color-secondary);
}

.memecoin__problem {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-ink);
}

.memecoin__subtitle {
  margin: 0;
}

.memecoin__summary {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.memecoin__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-self: stretch;
  margin: 0;
}

.memecoin__detail {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.memecoin__term {
  font-size: var(--text-base);
  font-weight: 700;
}

.memecoin__value {
  margin: 0;
  font-size: var(--text-base);
}

.memecoin__lock {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  cursor: pointer;
  align-self: stretch;
}

.memecoin__lock--selected {
  border-color: var(--color-accent);
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.memecoin__checkbox {
  width: 1.4rem;
  height: 1.4rem;
  margin-top: 0.15rem;
  flex-shrink: 0;
}

.memecoin__lock-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.memecoin__lock-title {
  font-size: var(--text-base);
  font-weight: 700;
}

.memecoin__lock-note {
  font-size: var(--text-base);
}

.memecoin__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.memecoin__recap {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.memecoin__recap-line {
  margin: 0;
  font-size: var(--text-base);
}

.memecoin__recap-line:first-child {
  font-size: var(--text-lg);
  font-weight: 700;
}

.memecoin__mint {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

.memecoin__explorer-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: 700;
}
</style>
