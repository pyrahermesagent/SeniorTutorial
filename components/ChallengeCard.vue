<script setup lang="ts">
import AppCard from './AppCard.vue'
import AppIcon from './AppIcon.vue'
import { difficultyLabel, type ChallengeMeta } from '../utils/challenges'

defineProps<{
  challenge: ChallengeMeta
  done?: boolean
}>()
</script>

<template>
  <NuxtLink :to="`/challenges/${challenge.id}`" class="challenge-card-link">
    <AppCard class="challenge-card">
      <AppIcon :name="challenge.icon" :size="32" class="challenge-card__icon" />
      <span class="challenge-card__body">
        <span class="challenge-card__title">{{ challenge.title }}</span>
        <span class="challenge-card__blurb">{{ challenge.blurb }}</span>
        <span class="challenge-card__difficulty">
          {{ difficultyLabel(challenge.difficulty) }}
        </span>
      </span>
      <span v-if="done" class="challenge-card__done">
        <AppIcon name="circle-check" :size="24" />
        Done
      </span>
    </AppCard>
  </NuxtLink>
</template>

<style scoped>
.challenge-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.challenge-card-link:hover {
  color: inherit;
}

.challenge-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  height: 100%;
  transition: border-color 120ms ease;
}

.challenge-card-link:hover .challenge-card {
  border-color: var(--color-ink);
}

.challenge-card__icon {
  flex-shrink: 0;
  margin-top: var(--space-1);
  color: var(--color-secondary);
}

.challenge-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.challenge-card__title {
  font-size: var(--text-lg);
  font-weight: 700;
  line-height: 1.25;
}

.challenge-card__blurb {
  font-size: var(--text-base);
  line-height: 1.5;
}

.challenge-card__difficulty {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 2px var(--space-1);
  background-color: var(--color-info-bg);
  border: 2px solid var(--color-secondary);
  border-radius: 999px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-secondary);
}

.challenge-card__done {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
  margin-left: auto;
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-success-bg);
  border: 2px solid var(--color-success);
  border-radius: 999px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-success);
}

@media (max-width: 767.98px) {
  .challenge-card {
    flex-wrap: wrap;
  }

  .challenge-card__done {
    margin-left: 0;
  }
}
</style>
