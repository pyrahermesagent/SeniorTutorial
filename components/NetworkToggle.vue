<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSolana } from '../composables/useSolana'
import type { Cluster } from '../utils/cluster'

const { cluster, setCluster } = useSolana()

/*
 * Prerendered HTML always shows the default (Devnet). A persisted Mainnet
 * choice is only applied after mount, so hydration matches the static markup.
 */
const settled = ref(false)
onMounted(() => {
  settled.value = true
})

const selected = computed<Cluster>(() => (settled.value ? cluster.value : 'devnet'))

const options: { value: Cluster; label: string }[] = [
  { value: 'mainnet-beta', label: 'Mainnet' },
  { value: 'devnet', label: 'Devnet (practice)' },
]
</script>

<template>
  <div class="network-toggle">
    <div class="network-toggle__group" role="radiogroup" aria-label="Choose the network">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="selected === option.value"
        class="network-toggle__option"
        :class="{ 'network-toggle__option--active': selected === option.value }"
        @click="setCluster(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    <p v-if="selected === 'mainnet-beta'" class="network-toggle__note" role="alert">
      Careful: Mainnet uses real money. Devnet is free practice — nothing you do there costs
      anything.
    </p>
  </div>
</template>

<style scoped>
.network-toggle__group {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  background-color: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: 14px;
}

.network-toggle__option {
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-3);
  background-color: transparent;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-ink);
  cursor: pointer;
}

/* Amber only ever carries ink text — light text on it fails AA (2.02:1). */
.network-toggle__option--active {
  background-color: var(--color-accent);
  border-color: var(--color-ink);
}

.network-toggle__note {
  margin: var(--space-1) 0 0;
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-warning-bg);
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  font-size: var(--text-base);
  color: var(--color-ink);
}

.network-toggle__option:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
</style>
