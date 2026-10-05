<script setup lang="ts">
import AppCard from '../AppCard.vue'
import AppIcon from '../AppIcon.vue'
import type { WalletInstallEntry } from '../../utils/onramps'

defineProps<{ wallet: WalletInstallEntry }>()
</script>

<template>
  <AppCard class="wallet-install-card">
    <div class="wallet-install-card__head">
      <AppIcon name="smartphone" :size="32" class="wallet-install-card__icon" />
      <h3 class="wallet-install-card__name">{{ wallet.name }}</h3>
    </div>
    <p class="wallet-install-card__blurb">{{ wallet.blurb }}</p>
    <a
      :href="wallet.playStoreUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="wallet-install-card__primary"
    >
      Get {{ wallet.name }} on Google Play
      <AppIcon name="external-link" :size="22" />
    </a>
    <div class="wallet-install-card__secondary">
      <a :href="wallet.appStoreUrl" target="_blank" rel="noopener noreferrer">
        App Store (iPhone)
        <AppIcon name="external-link" :size="20" />
      </a>
      <a :href="wallet.extensionUrl" target="_blank" rel="noopener noreferrer">
        Browser extension (computer)
        <AppIcon name="external-link" :size="20" />
      </a>
    </div>
  </AppCard>
</template>

<style scoped>
.wallet-install-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100%;
}

.wallet-install-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.wallet-install-card__icon {
  flex-shrink: 0;
  color: var(--color-secondary);
}

.wallet-install-card__name {
  margin: 0;
}

.wallet-install-card__blurb {
  margin: 0;
}

/* Amber only ever carries ink text — light text on it fails AA (2.02:1). */
.wallet-install-card__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-accent);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-ink);
  text-align: center;
  text-decoration: none;
}

.wallet-install-card__primary:hover {
  background-color: color-mix(in srgb, var(--color-accent) 85%, var(--color-ink));
}

.wallet-install-card__secondary {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.wallet-install-card__secondary a {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.4rem; /* 48px minimum target */
  padding: var(--space-1) 0;
  font-size: var(--text-base);
  font-weight: 700;
}
</style>
