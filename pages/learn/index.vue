<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LessonCard from '../../components/LessonCard.vue'
import { useLessonProgress } from '../../composables/useLessonProgress'
import { LESSONS } from '../../content/lessons'

const { doneCount, totalCount, isLessonDone } = useLessonProgress()

/*
 * Prerendered HTML always shows zero progress. The persisted localStorage
 * state is only reflected after mount, so hydration matches the static
 * markup (same pattern as NetworkToggle).
 */
const settled = ref(false)
onMounted(() => {
  settled.value = true
})

const shownDoneCount = computed(() => (settled.value ? doneCount.value : 0))

function showDone(slug: string): boolean {
  return settled.value && isLessonDone(slug)
}
</script>

<template>
  <div class="learn">
    <header class="learn__header">
      <h1 class="learn__title">Your lessons</h1>
      <p class="learn__lead">
        Six short lessons explain how the new internet of money works — no computer or banking
        experience needed. Go at your own pace; your progress is saved on this device.
      </p>
      <p class="learn__progress" aria-live="polite">
        {{ shownDoneCount }} of {{ totalCount }} lessons completed
      </p>
    </header>

    <ol class="learn__list" role="list">
      <li v-for="(lesson, index) in LESSONS" :key="lesson.slug" class="learn__item">
        <LessonCard :lesson="lesson" :number="index + 1" :done="showDone(lesson.slug)" />
      </li>
    </ol>
  </div>
</template>

<style scoped>
.learn {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.learn__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.learn__title {
  margin: 0;
}

.learn__lead {
  margin: 0;
  font-size: var(--text-lg);
}

.learn__progress {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
}

.learn__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
