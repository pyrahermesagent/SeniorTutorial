<script setup lang="ts">
import type { LessonMeta } from '../content/lessons'
import AppCard from './AppCard.vue'
import AppIcon from './AppIcon.vue'

defineProps<{
  lesson: LessonMeta
  number: number
  done?: boolean
}>()
</script>

<template>
  <NuxtLink :to="`/learn/${lesson.slug}`" class="lesson-card-link">
    <AppCard class="lesson-card">
      <span class="lesson-card__number" aria-hidden="true">{{ number }}</span>
      <AppIcon :name="lesson.icon" :size="32" class="lesson-card__icon" />
      <span class="lesson-card__body">
        <span class="lesson-card__title">{{ lesson.title }}</span>
        <span class="lesson-card__tagline">{{ lesson.tagline }}</span>
        <span class="lesson-card__minutes">
          <AppIcon name="clock" :size="20" />
          About {{ lesson.minutes }} minutes
        </span>
      </span>
      <span v-if="done" class="lesson-card__done">
        <AppIcon name="circle-check" :size="24" />
        Done
      </span>
    </AppCard>
  </NuxtLink>
</template>

<style scoped>
.lesson-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.lesson-card-link:hover {
  color: inherit;
}

.lesson-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  height: 100%;
  transition: border-color 120ms ease;
}

.lesson-card-link:hover .lesson-card {
  border-color: var(--color-ink);
}

.lesson-card__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.4rem; /* 48px touch-friendly badge */
  height: 2.4rem;
  /* Amber only ever carries ink text — light text on it fails AA (2.02:1). */
  background-color: var(--color-accent);
  border: 2px solid var(--color-ink);
  border-radius: 50%;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-ink);
}

.lesson-card__icon {
  flex-shrink: 0;
  margin-top: var(--space-1);
  color: var(--color-secondary);
}

.lesson-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.lesson-card__title {
  font-size: var(--text-lg);
  font-weight: 700;
  line-height: 1.25;
}

.lesson-card__tagline {
  font-size: var(--text-base);
  line-height: 1.5;
}

.lesson-card__minutes {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-base);
  color: var(--color-secondary);
}

.lesson-card__done {
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
  .lesson-card {
    flex-wrap: wrap;
  }

  .lesson-card__done {
    margin-left: 0;
  }
}
</style>
