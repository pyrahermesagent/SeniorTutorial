<script lang="ts">
/*
 * Shared transaction lifecycle, driven by the challenge pages (Tasks 18–21):
 * idle → building → awaiting-signature → sending → confirming → success,
 * with cancelled (the learner said no in their wallet) and failed as endings.
 */
export type TxState =
  | 'idle'
  | 'building'
  | 'awaiting-signature'
  | 'sending'
  | 'confirming'
  | 'success'
  | 'cancelled'
  | 'failed'
</script>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { useSolana } from '../composables/useSolana'
import { explorerTxUrl } from '../utils/cluster'

const props = defineProps<{
  state: TxState
  signature?: string
  error?: string
}>()

defineSlots<{ retry?: () => unknown }>()

const { cluster } = useSolana()

const PROGRESS_COPY: Partial<Record<TxState, string>> = {
  building: 'Preparing…',
  'awaiting-signature': 'Please check your wallet — it is asking you to approve this.',
  sending: 'Sending…',
  confirming: 'Almost done — confirming…',
}

const progressCopy = computed(() =>
  props.state in PROGRESS_COPY ? PROGRESS_COPY[props.state as keyof typeof PROGRESS_COPY] : null,
)

const explorerUrl = computed(() =>
  props.signature ? explorerTxUrl(props.signature, cluster.value) : undefined,
)

// Pages pass a plain-language message; hold a calm fallback in case one is missing.
const failureCopy = computed(
  () => props.error?.trim() || 'Something went wrong — nothing was sent.',
)
</script>

<template>
  <div v-if="progressCopy" class="tx-status tx-status--progress" aria-live="polite">
    <AppIcon name="loader-circle" :size="28" class="tx-status__spinner" />
    <p class="tx-status__text">{{ progressCopy }}</p>
  </div>

  <div v-else-if="state === 'success'" class="tx-status tx-status--success" role="status">
    <AppIcon name="circle-check" :size="28" class="tx-status__icon" />
    <p class="tx-status__text">
      Well done — it went through!
      <template v-if="explorerUrl">
        You can see it on the Solana Explorer:
        <a :href="explorerUrl" target="_blank" rel="noopener noreferrer" class="tx-status__link">
          See it on the Solana Explorer
          <AppIcon name="external-link" :size="20" />
        </a>
      </template>
    </p>
  </div>

  <div v-else-if="state === 'cancelled'" class="tx-status tx-status--cancelled" role="alert">
    <AppIcon name="info" :size="28" class="tx-status__icon" />
    <div class="tx-status__body">
      <p class="tx-status__text">You cancelled — nothing was sent.</p>
      <slot name="retry" />
    </div>
  </div>

  <div v-else-if="state === 'failed'" class="tx-status tx-status--failed" role="alert">
    <AppIcon name="triangle-alert" :size="28" class="tx-status__icon" />
    <p class="tx-status__text">
      {{ failureCopy }}
      If this keeps happening, try again later or switch to Devnet to practice.
    </p>
  </div>
</template>

<style scoped>
.tx-status {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 2px solid;
  border-left-width: 6px;
  border-radius: 12px;
}

.tx-status--progress {
  background-color: var(--color-info-bg);
  border-color: var(--color-secondary);
  align-items: center;
}

.tx-status--success {
  background-color: var(--color-success-bg);
  border-color: var(--color-success);
}

.tx-status--success .tx-status__icon {
  color: var(--color-success);
}

.tx-status--cancelled {
  background-color: var(--color-warning-bg);
  border-color: var(--color-accent);
}

.tx-status--failed {
  background-color: var(--color-warning-bg);
  border-color: var(--color-accent);
}

.tx-status__spinner {
  flex-shrink: 0;
  color: var(--color-secondary);
  animation: tx-status-spin 1s linear infinite;
}

@keyframes tx-status-spin {
  to {
    transform: rotate(360deg);
  }
}

.tx-status__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-ink);
}

.tx-status__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.tx-status__text {
  margin: 0;
  font-size: var(--text-base);
}

.tx-status__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: 700;
}
</style>
