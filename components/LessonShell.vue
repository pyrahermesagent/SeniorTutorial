<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'
import AppNotice from './AppNotice.vue'
import { useLessonProgress } from '../composables/useLessonProgress'
import { LESSONS } from '../content/lessons'

const props = defineProps<{
  title: string
  intro: string
  lessonSlug: string
}>()

const { isLessonDone, markLessonDone } = useLessonProgress()

/*
 * Prerendered HTML always shows the not-done state. Persisted progress is
 * only reflected after mount, so hydration matches the static markup (same
 * pattern as NetworkToggle and the Learn overview).
 */
const settled = ref(false)
onMounted(() => {
  settled.value = true
})

const showDone = computed(() => settled.value && isLessonDone(props.lessonSlug))

const nextLesson = computed(() => {
  const index = LESSONS.findIndex((lesson) => lesson.slug === props.lessonSlug)
  return index >= 0 ? LESSONS[index + 1] : undefined
})

const nextPath = computed(() =>
  nextLesson.value ? `/learn/${nextLesson.value.slug}` : '/learn',
)

const continueLabel = computed(() =>
  nextLesson.value ? 'Continue to the next lesson' : 'Back to your lessons',
)

function onComplete() {
  markLessonDone(props.lessonSlug)
}
</script>

<template>
  <article class="lesson-shell">
    <header class="lesson-shell__header">
      <NuxtLink to="/learn" class="lesson-shell__back">
        <AppIcon name="arrow-left" :size="20" />
        All lessons
      </NuxtLink>
      <h1 class="lesson-shell__title">{{ title }}</h1>
      <p class="lesson-shell__intro">{{ intro }}</p>
    </header>

    <div class="lesson-shell__sections">
      <slot />
    </div>

    <section
      v-if="$slots.sim"
      class="lesson-shell__sim"
      aria-labelledby="lesson-shell-sim-title"
    >
      <h2 id="lesson-shell-sim-title" class="lesson-shell__sim-title">Try it yourself</h2>
      <slot name="sim" />
    </section>

    <footer class="lesson-shell__footer">
      <AppNotice v-if="showDone" kind="success" class="lesson-shell__done">
        You have completed this lesson. You can read it again any time.
      </AppNotice>
      <AppButton :to="nextPath" size="lg" class="lesson-shell__complete" @click="onComplete">
        {{ showDone ? continueLabel : 'Mark lesson complete' }}
      </AppButton>
      <p v-if="nextLesson" class="lesson-shell__up-next">Next lesson: {{ nextLesson.title }}</p>
      <p v-else class="lesson-shell__up-next">
        This is the final lesson — the button takes you back to your lesson list.
      </p>
    </footer>
  </article>
</template>

<style scoped>
.lesson-shell {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.lesson-shell__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-3);
}

.lesson-shell__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  align-self: flex-start;
  font-size: var(--text-base);
  font-weight: 700;
}

.lesson-shell__title {
  margin: 0;
}

.lesson-shell__intro {
  margin: 0;
  font-size: var(--text-lg);
}

.lesson-shell__sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lesson-shell__sim {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-info-bg);
  border: 2px solid var(--color-secondary);
  border-radius: 12px;
}

.lesson-shell__sim-title {
  margin: 0;
}

.lesson-shell__footer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.lesson-shell__up-next {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-secondary);
}
</style>
