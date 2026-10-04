<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  kind: 'info' | 'warning' | 'success'
}>()

const kinds = {
  info: { icon: 'info', role: 'status' },
  warning: { icon: 'triangle-alert', role: 'alert' },
  success: { icon: 'circle-check', role: 'status' },
} as const

const config = computed(() => kinds[props.kind])
</script>

<template>
  <div class="app-notice" :class="`app-notice--${kind}`" :role="config.role">
    <AppIcon :name="config.icon" :size="28" class="app-notice__icon" />
    <div class="app-notice__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 2px solid;
  border-left-width: 6px;
  border-radius: 12px;
}

.app-notice__icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.app-notice--info {
  background-color: var(--color-info-bg);
  border-color: var(--color-secondary);
}

.app-notice--info .app-notice__icon {
  color: var(--color-secondary);
}

.app-notice--warning {
  background-color: var(--color-warning-bg);
  border-color: var(--color-accent);
}

/* Amber on cream fails AA (2.02:1), so the warning icon uses ink. */
.app-notice--warning .app-notice__icon {
  color: var(--color-ink);
}

.app-notice--success {
  background-color: var(--color-success-bg);
  border-color: var(--color-success);
}

.app-notice--success .app-notice__icon {
  color: var(--color-success);
}
</style>
