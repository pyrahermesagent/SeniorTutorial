<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import NetworkToggle from './NetworkToggle.vue'
import WalletButton from './WalletButton.vue'

const appConfig = useAppConfig()
</script>

<template>
  <header class="top-bar">
    <NuxtLink to="/" class="top-bar__brand">
      <AppIcon name="graduation-cap" :size="36" class="top-bar__logo" />
      <span class="top-bar__name">{{ appConfig.brand }}</span>
    </NuxtLink>
    <div class="top-bar__controls">
      <NetworkToggle />
      <WalletButton />
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-bg);
  border-bottom: 2px solid var(--color-ink);
}

.top-bar__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.8rem; /* 56px touch target */
  color: var(--color-ink);
  text-decoration: none;
}

.top-bar__logo {
  flex-shrink: 0;
  color: var(--color-secondary);
}

.top-bar__name {
  font-size: var(--text-lg);
  font-weight: 700;
}

.top-bar__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-2);
}

.top-bar__brand:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
</style>
