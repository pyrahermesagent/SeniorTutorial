<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    to?: string
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md' },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

function onClick(event: MouseEvent) {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="app-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      { 'app-button--loading': loading, 'app-button--disabled': disabled },
    ]"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : undefined"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <AppIcon v-if="loading" name="loader-circle" :size="24" class="app-button__spinner" />
    <span class="app-button__label"><slot /></span>
  </NuxtLink>
  <button
    v-else
    type="button"
    class="app-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      { 'app-button--loading': loading, 'app-button--disabled': disabled },
    ]"
    :disabled="disabled"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <AppIcon v-if="loading" name="loader-circle" :size="24" class="app-button__spinner" />
    <span class="app-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-4);
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.3;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.app-button--lg {
  min-height: 3.2rem; /* 64px */
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-lg);
}

/* Amber only ever carries ink text — light text on it fails AA (2.02:1). */
.app-button--primary {
  background-color: var(--color-accent);
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.app-button--secondary {
  background-color: var(--color-secondary);
  border-color: var(--color-secondary);
  color: var(--color-bg);
}

.app-button--ghost {
  background-color: transparent;
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.app-button--primary:not(:disabled):not(.app-button--disabled):hover {
  background-color: color-mix(in srgb, var(--color-accent) 85%, var(--color-ink));
}

.app-button--secondary:not(:disabled):not(.app-button--disabled):hover {
  background-color: color-mix(in srgb, var(--color-secondary) 85%, var(--color-ink));
}

.app-button--ghost:not(:disabled):not(.app-button--disabled):hover {
  background-color: color-mix(in srgb, var(--color-ink) 8%, transparent);
}

.app-button:disabled,
.app-button--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-button--disabled {
  pointer-events: none; /* anchors have no native disabled state */
}

.app-button__spinner {
  flex-shrink: 0;
  animation: app-button-spin 1s linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
