<script setup lang="ts">
import AppCard from './AppCard.vue'
import AppIcon from './AppIcon.vue'

const emit = defineEmits<{ replay: [] }>()
</script>

<template>
  <AppCard class="interactive-figure">
    <div class="interactive-figure__stage">
      <slot />
    </div>
    <div class="interactive-figure__bar">
      <p class="interactive-figure__caption"><slot name="caption" /></p>
      <button
        type="button"
        class="interactive-figure__replay"
        aria-label="Replay"
        @click="emit('replay')"
      >
        <AppIcon name="refresh-cw" :size="24" />
        Replay
      </button>
    </div>
  </AppCard>
</template>

<style scoped>
.interactive-figure {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.interactive-figure__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 8rem;
}

.interactive-figure__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
  border-top: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  padding-top: var(--space-2);
}

.interactive-figure__caption {
  margin: 0;
  font-size: var(--text-base);
}

.interactive-figure__replay {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-3);
  background-color: transparent;
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color 120ms ease;
}

.interactive-figure__replay:hover {
  background-color: color-mix(in srgb, var(--color-ink) 8%, transparent);
}
</style>
