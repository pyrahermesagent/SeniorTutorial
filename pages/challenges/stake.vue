<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  address as toAddress,
  isSolanaError,
} from '@solana/kit'
import AppButton from '../../components/AppButton.vue'
import AppCard from '../../components/AppCard.vue'
import AppNotice from '../../components/AppNotice.vue'
import BalanceChip from '../../components/BalanceChip.vue'
import ChallengeShell from '../../components/ChallengeShell.vue'
import TxStatus, { type TxState } from '../../components/TxStatus.vue'
import { useProgress } from '../../composables/useProgress'
import { useSolana } from '../../composables/useSolana'
import { useWallet } from '../../composables/useWallet'
import { formatSol } from '../../utils/cluster'
import {
  STAKE_ACCOUNT_RENT_LAMPORTS,
  buildStakeIxs,
  validateStakeAmount,
} from '../../utils/stake'
import { SUGGESTED_VALIDATORS } from '../../utils/validators'
import { shortenAddress } from '../../utils/wallets'

const { account, sendInstructions } = useWallet()
const { cluster, getBalance } = useSolana()
const { markChallengeDone } = useProgress()

type Step = 'form' | 'review' | 'sending'

const step = ref<Step>('form')
const selectedVote = ref('')
const amount = ref('')
const balance = ref<bigint | null>(null)
const balanceLoading = ref(false)
const balanceError = ref(false)
const txState = ref<TxState>('idle')
const signature = ref<string>()
const failureCopy = ref<string>()
const staleReason = ref<string | null>(null)

const validators = computed(() => SUGGESTED_VALIDATORS[cluster.value])
const selectedValidator = computed(
  () => validators.value.find((v) => v.voteAddress === selectedVote.value) ?? validators.value[0],
)

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

// Switching networks swaps the validator list, so reselect and start clean.
watch(
  cluster,
  () => {
    selectedVote.value = validators.value[0]?.voteAddress ?? ''
    resetFlow()
  },
  { immediate: true },
)

watch([selectedVote, amount], () => {
  staleReason.value = null
})

const validation = computed(() =>
  validateStakeAmount({
    amountSol: amount.value,
    balanceLamports: balance.value ?? 0n,
  }),
)

const amountProblem = computed(() => {
  if (amount.value.trim() === '' || validation.value.ok) return null
  if (balance.value === null) return null
  return validation.value.reason
})

const canReview = computed(
  () => balance.value !== null && validation.value.ok && selectedValidator.value !== undefined,
)

const rentText = computed(() => formatSol(STAKE_ACCOUNT_RENT_LAMPORTS))

const summaryCopy = computed(() => {
  if (!validation.value.ok || !selectedValidator.value) return ''
  return `You are staking ${formatSol(validation.value.lamports)} SOL with ${selectedValidator.value.name}. It stays yours — you can unstake whenever you like.`
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

function stakeAnother() {
  resetFlow()
}

function toPlainSendError(error: unknown): string {
  if (isSolanaError(error, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)) {
    // The signed transaction WAS broadcast; confirmation simply raced the
    // blockhash expiry. Never claim "nothing was sent" here — that lie
    // invites a double-stake with real money.
    return 'Your staking was sent to the network, but it is taking longer than expected to confirm. Please check your wallet\u2019s activity tab before trying again — if the transaction shows up there, it went through.'
  }
  if (error instanceof Error && /insufficient/i.test(error.message)) {
    return 'Your wallet did not have quite enough SOL for this, so nothing was staked.'
  }
  return 'The staking did not go through — nothing was staked.'
}

async function confirmAndStake() {
  if (!account.value || !selectedValidator.value) return
  if (!validation.value.ok) {
    // Details went stale while the review card was open — explain, don't dead-click.
    staleReason.value = validation.value.reason
    txState.value = 'idle'
    step.value = 'form'
    return
  }
  const from = toAddress(account.value.address)
  const voteAddress = toAddress(selectedValidator.value.voteAddress)
  const lamports = validation.value.lamports
  step.value = 'sending'
  signature.value = undefined
  failureCopy.value = undefined
  txState.value = 'building'
  try {
    const built = await buildStakeIxs({ from, voteAddress, lamports })
    txState.value = 'awaiting-signature'
    // The fresh stake account must co-sign — the wallet can't sign for it, so
    // sendInstructions takes the local-signer path.
    signature.value = await sendInstructions(built.instructions, [built.stakeSigner])
    txState.value = 'success'
    markChallengeDone('stake')
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
  <div class="stake">
    <header class="stake__header">
      <h1 class="stake__title">Stake your SOL</h1>
    </header>

    <ChallengeShell
      challenge="stake"
      goal="Put your SOL to work securing the network — and earn a little reward"
      est-cost="The amount you stake stays yours; the only cost is the tiny setup fee"
    >
      <template v-if="txState === 'success'" #recap>
        <div class="stake__recap">
          <p class="stake__recap-line">
            You are now helping secure Solana. Your stake starts earning after the current epoch —
            about 2 days.
          </p>
          <p class="stake__recap-line">
            Rewards add up on their own from then on. If you ever want your SOL back, unstaking
            takes about 2–3 days — like giving notice at the bank.
          </p>
        </div>
      </template>

      <AppNotice kind="info">
        <p>
          <strong>What is staking?</strong> Staking is like lending your vote to a validator — a
          computer that helps keep the network honest. Your SOL never leaves your control, and
          rewards accrue automatically. If you change your mind, unstaking takes about 2–3 days:
          like giving notice at the bank — your money comes back, just not instantly.
        </p>
      </AppNotice>

      <div class="stake__balance">
        <BalanceChip :lamports="balance" :loading="balanceLoading" @refresh="refreshBalance" />
      </div>

      <AppNotice v-if="balanceError" kind="warning">
        <p>
          We could not read your balance just now. Check your internet connection, then press the
          little refresh arrow next to the balance.
        </p>
      </AppNotice>

      <div v-if="step === 'form'" class="stake__form">
        <AppNotice v-if="staleReason" kind="warning">
          <p>{{ staleReason }}</p>
        </AppNotice>

        <fieldset class="stake__validators">
          <legend class="stake__label">Pick a validator</legend>
          <label
            v-for="validator in validators"
            :key="validator.voteAddress"
            class="stake__validator"
            :class="{ 'stake__validator--selected': selectedVote === validator.voteAddress }"
          >
            <input
              v-model="selectedVote"
              type="radio"
              name="stake-validator"
              :value="validator.voteAddress"
              class="stake__radio"
            />
            <span class="stake__validator-text">
              <span class="stake__validator-name">{{ validator.name }}</span>
              <span class="stake__validator-note">{{ validator.note }}</span>
              <span class="stake__validator-address">
                {{ shortenAddress(validator.voteAddress) }}
              </span>
            </span>
          </label>
          <p class="stake__hint">
            Any of these works well — they are all established, active validators.
          </p>
        </fieldset>

        <div class="stake__field">
          <label class="stake__label" for="stake-amount">Amount to stake, in SOL</label>
          <input
            id="stake-amount"
            v-model="amount"
            class="stake__input"
            type="text"
            inputmode="decimal"
            placeholder="1"
            autocomplete="off"
          />
          <p v-if="amountProblem" class="stake__hint" role="alert">{{ amountProblem }}</p>
          <p v-else class="stake__hint">
            Stakes start at 1 SOL — that minimum comes from the Solana network itself, not from
            us.
          </p>
          <p class="stake__hint">
            On Mainnet that 1 SOL is real money. Practicing first? On the Devnet practice network
            you can get free practice SOL from the
            <NuxtLink to="/start" class="stake__link">Get Started page</NuxtLink>.
          </p>
        </div>

        <AppButton size="lg" :disabled="!canReview" @click="startReview">
          Review this stake
        </AppButton>
      </div>

      <AppCard v-else-if="step === 'review'" class="stake__review">
        <h2 class="stake__subtitle">Check it, then confirm</h2>
        <p class="stake__summary">{{ summaryCopy }}</p>
        <dl class="stake__details">
          <div class="stake__detail">
            <dt class="stake__term">Validator</dt>
            <dd class="stake__value">{{ selectedValidator?.name }}</dd>
          </div>
          <div class="stake__detail">
            <dt class="stake__term">Amount to stake</dt>
            <dd class="stake__value">
              {{ validation.ok ? formatSol(validation.lamports) : '' }} SOL
            </dd>
          </div>
          <div class="stake__detail">
            <dt class="stake__term">Network fee</dt>
            <dd class="stake__value">Less than a penny</dd>
          </div>
          <div class="stake__detail">
            <dt class="stake__term">One-time setup reserve</dt>
            <dd class="stake__value">
              {{ rentText }} SOL — held inside your stake account, and returned if you ever close
              it
            </dd>
          </div>
        </dl>

        <div class="stake__actions">
          <AppButton size="lg" @click="confirmAndStake">Yes — stake it now</AppButton>
          <AppButton variant="ghost" @click="step = 'form'">Go back and change it</AppButton>
        </div>
      </AppCard>

      <div v-else class="stake__sending">
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
        <AppButton v-if="txState === 'success'" variant="secondary" @click="stakeAnother">
          Stake more SOL
        </AppButton>
      </div>
    </ChallengeShell>
  </div>
</template>

<style scoped>
.stake {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
}

.stake__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stake__title {
  margin: 0;
}

.stake__balance {
  display: flex;
}

.stake__form,
.stake__review,
.stake__sending {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.stake__validators {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.stake__label {
  font-size: var(--text-base);
  font-weight: 700;
  padding: 0;
}

.stake__validator {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  cursor: pointer;
}

.stake__validator--selected {
  border-color: var(--color-accent);
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.stake__radio {
  width: 1.4rem;
  height: 1.4rem;
  margin-top: 0.15rem;
  flex-shrink: 0;
}

.stake__validator-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.stake__validator-name {
  font-size: var(--text-base);
  font-weight: 700;
}

.stake__validator-note {
  font-size: var(--text-base);
}

.stake__validator-address {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: var(--text-base);
  color: var(--color-secondary);
}

.stake__field {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--space-1);
}

.stake__input {
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
}

.stake__hint {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-ink);
}

.stake__link {
  font-weight: 700;
}

.stake__subtitle {
  margin: 0;
}

.stake__summary {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.stake__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-self: stretch;
  margin: 0;
}

.stake__detail {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.stake__term {
  font-size: var(--text-base);
  font-weight: 700;
}

.stake__value {
  margin: 0;
  font-size: var(--text-base);
}

.stake__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.stake__recap {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stake__recap-line {
  margin: 0;
  font-size: var(--text-base);
}

.stake__recap-line:first-child {
  font-size: var(--text-lg);
  font-weight: 700;
}
</style>
