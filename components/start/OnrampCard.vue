<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '../AppCard.vue'
import AppIcon from '../AppIcon.vue'
import type { OnrampEntry } from '../../utils/onramps'

const props = defineProps<{
  onramp: OnrampEntry
  address: string
}>()

const url = computed(() => props.onramp.buildUrl(props.address))
</script>

<template>
  <AppCard class="onramp-card">
    <div class="onramp-card__head">
      <AppIcon name="coins" :size="32" class="onramp-card__icon" />
      <h3 class="onramp-card__name">{{ onramp.name }}</h3>
    </div>
    <p class="onramp-card__note">{{ onramp.note }}</p>
    <a :href="url" target="_blank" rel="noopener noreferrer" class="onramp-card__link">
      Buy SOL with {{ onramp.name }}
      <AppIcon name="external-link" :size="22" />
    </a>
  </AppCard>
</template>

<style scoped>
.onramp-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100%;
}

.onramp-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.onramp-card__icon {
  flex-shrink: 0;
  color: var(--color-secondary);
}

.onramp-card__name {
  margin: 0;
}

.onramp-card__note {
  margin: 0;
}

.onramp-card__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-4);
  background-color: transparent;
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-ink);
  text-align: center;
  text-decoration: none;
}

.onramp-card__link:hover {
  background-color: color-mix(in srgb, var(--color-ink) 8%, transparent);
}
</style>
