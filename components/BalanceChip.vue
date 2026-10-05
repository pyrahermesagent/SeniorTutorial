<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { formatSol } from '../utils/cluster'

/*
 * Presentational balance chip — the parent owns fetching (and decides when
 * to render this at all: only once a wallet is connected), so the chip is
 * SSR-safe by construction.
 */
defineProps<{
  lamports: bigint | null
  loading?: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()
</script>

<template>
  <div class="balance-chip">
    <AppIcon name="coins" :size="24" class="balance-chip__icon" />
    <span class="balance-chip__text" aria-live="polite">
      <template v-if="lamports === null">Checking your balance…</template>
      <template v-else>
        Balance: <strong class="balance-chip__amount">{{ formatSol(lamports) }} SOL</strong>
      </template>
    </span>
    <button
      type="button"
      class="balance-chip__refresh"
      :disabled="loading"
      aria-label="Refresh balance"
      @click="emit('refresh')"
    >
      <AppIcon
        name="refresh-cw"
        :size="22"
        :class="{ 'balance-chip__spinning': loading }"
      />
    </button>
  </div>
</template>

<style scoped>
.balance-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-1) var(--space-1) var(--space-2);
  background-color: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  font-size: var(--text-base);
  color: var(--color-ink);
}

.balance-chip__icon {
  flex-shrink: 0;
  color: var(--color-secondary);
}

.balance-chip__amount {
  font-variant-numeric: tabular-nums;
}

.balance-chip__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 2.4rem; /* 48px square target */
  min-height: 2.4rem;
  padding: 0;
  background-color: transparent;
  border: 2px solid transparent;
  border-radius: 50%;
  color: var(--color-ink);
  cursor: pointer;
}

.balance-chip__refresh:hover {
  background-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-surface));
}

.balance-chip__refresh:disabled {
  opacity: 0.55;
  cursor: wait;
}

.balance-chip__spinning {
  animation: balance-chip-spin 1s linear infinite;
}

@keyframes balance-chip-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
