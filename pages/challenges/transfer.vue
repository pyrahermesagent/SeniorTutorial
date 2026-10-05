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
import { formatSol, isValidSolanaAddress } from '../../utils/cluster'
import { buildTransferIxs, validateTransfer } from '../../utils/transfer'

const { account, sendInstructions } = useWallet()
const { getBalance } = useSolana()
const { markChallengeDone } = useProgress()

type Step = 'form' | 'review' | 'sending'

const step = ref<Step>('form')
const recipient = ref('')
const amount = ref('')
const balance = ref<bigint | null>(null)
const balanceLoading = ref(false)
const balanceError = ref(false)
const txState = ref<TxState>('idle')
const signature = ref<string>()
const failureCopy = ref<string>()

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

watch(
  () => account.value?.address,
  (address, previous) => {
    if (address && address !== previous) {
      void refreshBalance()
    } else if (!address) {
      balance.value = null
      step.value = 'form'
      txState.value = 'idle'
    }
  },
  { immediate: true },
)

const trimmedRecipient = computed(() => recipient.value.trim())

const validation = computed(() =>
  validateTransfer({
    to: trimmedRecipient.value,
    amountSol: amount.value,
    balanceLamports: balance.value ?? 0n,
    from: account.value?.address,
  }),
)

const addressProblem = computed(() => {
  if (trimmedRecipient.value === '' || isValidSolanaAddress(trimmedRecipient.value)) return null
  // With an invalid recipient the address check is the first to fail, so the
  // validation reason is the plain-language address hint.
  return validation.value.ok ? null : validation.value.reason
})

const amountProblem = computed(() => {
  if (amount.value.trim() === '' || validation.value.ok) return null
  if (!isValidSolanaAddress(trimmedRecipient.value)) return null
  if (balance.value === null) return null
  return validation.value.reason
})

const selfTransferWarning = computed(() =>
  validation.value.ok ? (validation.value.warning ?? null) : null,
)

const canReview = computed(() => balance.value !== null && validation.value.ok)

function shortAddress(value: string): string {
  return value.length <= 10 ? value : `${value.slice(0, 4)}…${value.slice(-4)}`
}

const summaryCopy = computed(() => {
  if (!validation.value.ok) return ''
  return `You are sending ${formatSol(validation.value.lamports)} SOL to the wallet starting with ${shortAddress(trimmedRecipient.value)}. Transfers cannot be undone — check the address twice.`
})

function startReview() {
  if (!canReview.value) return
  staleReason.value = null
  step.value = 'review'
}

function backToReview() {
  step.value = 'review'
  txState.value = 'idle'
}

function sendAnother() {
  step.value = 'form'
  txState.value = 'idle'
  signature.value = undefined
}

function toPlainSendError(error: unknown): string {
  if (error instanceof Error && /insufficient/i.test(error.message)) {
    return 'Your wallet did not have quite enough SOL for this transfer, so nothing was sent.'
  }
  return 'The transfer did not go through — nothing was sent.'
}

// If the details go stale while the review card is open (say the balance
// changed), confirming must never be a dead click: explain and go back.
const staleReason = ref<string | null>(null)
watch([recipient, amount], () => {
  staleReason.value = null
})

async function confirmAndSend() {
  if (!validation.value.ok) {
    staleReason.value = validation.value.reason
    txState.value = 'idle'
    step.value = 'form'
    return
  }
  if (!account.value) return
  const lamports = validation.value.lamports
  step.value = 'sending'
  signature.value = undefined
  failureCopy.value = undefined
  txState.value = 'building'
  try {
    const ixs = buildTransferIxs({
      from: toAddress(account.value.address),
      to: toAddress(trimmedRecipient.value),
      lamports,
    })
    txState.value = 'awaiting-signature'
    signature.value = await sendInstructions(ixs)
    txState.value = 'success'
    markChallengeDone('transfer')
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
  <div class="transfer">
    <header class="transfer__header">
      <h1 class="transfer__title">Send SOL to someone</h1>
    </header>

    <ChallengeShell
      challenge="transfer"
      goal="Send a little SOL to another wallet — for example, your grandchild's"
      est-cost="The amount you send, plus a network fee of less than a penny"
    >
      <template v-if="txState === 'success'" #recap>
        <div class="transfer__recap">
          <p class="transfer__recap-line">
            You just moved money on Solana — no bank involved, settled in under a second.
          </p>
          <p class="transfer__recap-line">{{ summaryCopy }}</p>
        </div>
      </template>

      <div class="transfer__balance">
        <BalanceChip :lamports="balance" :loading="balanceLoading" @refresh="refreshBalance" />
      </div>

      <AppNotice v-if="balanceError" kind="warning">
        <p>
          We could not read your balance just now. Check your internet connection, then press the
          little refresh arrow next to the balance.
        </p>
      </AppNotice>

      <div v-if="step === 'form'" class="transfer__form">
        <AppNotice v-if="staleReason" kind="warning">
          <p>{{ staleReason }}</p>
        </AppNotice>

        <div class="transfer__field">
          <label class="transfer__label" for="transfer-recipient">Their wallet address</label>
          <input
            id="transfer-recipient"
            v-model="recipient"
            class="transfer__input transfer__input--address"
            type="text"
            placeholder="For example, your grandchild's wallet address"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
          />
          <p v-if="addressProblem" class="transfer__hint" role="alert">{{ addressProblem }}</p>
          <p v-else class="transfer__hint">
            Tip: the easiest way is to copy the address and paste it in here.
          </p>
        </div>

        <div class="transfer__field">
          <label class="transfer__label" for="transfer-amount">Amount to send, in SOL</label>
          <input
            id="transfer-amount"
            v-model="amount"
            class="transfer__input"
            type="text"
            inputmode="decimal"
            placeholder="0.01"
            autocomplete="off"
          />
          <p v-if="amountProblem" class="transfer__hint" role="alert">{{ amountProblem }}</p>
          <p v-else class="transfer__hint">A small amount is perfect for practice — 0.01 SOL.</p>
        </div>

        <AppNotice v-if="selfTransferWarning" kind="warning">
          <p>{{ selfTransferWarning }}</p>
        </AppNotice>

        <AppButton size="lg" :disabled="!canReview" @click="startReview">
          Review this transfer
        </AppButton>
      </div>

      <AppCard v-else-if="step === 'review'" class="transfer__review">
        <h2 class="transfer__subtitle">Check it once, then check it twice</h2>
        <p class="transfer__summary">{{ summaryCopy }}</p>
        <dl class="transfer__details">
          <div class="transfer__detail">
            <dt class="transfer__term">Their wallet address</dt>
            <dd class="transfer__value transfer__value--address">{{ trimmedRecipient }}</dd>
          </div>
          <div class="transfer__detail">
            <dt class="transfer__term">Amount</dt>
            <dd class="transfer__value">
              {{ validation.ok ? formatSol(validation.lamports) : '' }} SOL
            </dd>
          </div>
          <div class="transfer__detail">
            <dt class="transfer__term">Network fee</dt>
            <dd class="transfer__value">Less than a penny</dd>
          </div>
        </dl>

        <AppNotice v-if="selfTransferWarning" kind="warning">
          <p>{{ selfTransferWarning }}</p>
        </AppNotice>

        <div class="transfer__actions">
          <AppButton size="lg" @click="confirmAndSend">Yes — send it now</AppButton>
          <AppButton variant="ghost" @click="step = 'form'">Go back and change it</AppButton>
        </div>
      </AppCard>

      <div v-else class="transfer__sending">
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
        <AppButton v-if="txState === 'success'" variant="secondary" @click="sendAnother">
          Send another transfer
        </AppButton>
      </div>
    </ChallengeShell>
  </div>
</template>

<style scoped>
.transfer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
}

.transfer__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.transfer__title {
  margin: 0;
}

.transfer__balance {
  display: flex;
}

.transfer__form,
.transfer__review,
.transfer__sending {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.transfer__field {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--space-1);
}

.transfer__label {
  font-size: var(--text-base);
  font-weight: 700;
}

.transfer__input {
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
}

.transfer__input--address {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

.transfer__hint {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-ink);
}

.transfer__subtitle {
  margin: 0;
}

.transfer__summary {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.transfer__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-self: stretch;
  margin: 0;
}

.transfer__detail {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.transfer__term {
  font-size: var(--text-base);
  font-weight: 700;
}

.transfer__value {
  margin: 0;
  font-size: var(--text-base);
}

.transfer__value--address {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  overflow-wrap: anywhere;
}

.transfer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.transfer__recap {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.transfer__recap-line {
  margin: 0;
  font-size: var(--text-base);
}

.transfer__recap-line:first-child {
  font-size: var(--text-lg);
  font-weight: 700;
}
</style>
