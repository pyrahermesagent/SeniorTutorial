<script setup lang="ts">
import { ref } from 'vue'
import LessonShell from '../LessonShell.vue'
import AppNotice from '../AppNotice.vue'
import QuizBlock from '../QuizBlock.vue'
import { useLessonProgress } from '../../composables/useLessonProgress'
import { useProgress } from '../../composables/useProgress'
import { SAFETY_QUESTIONS, slides } from '../../content/lessons/staying-safe'

const { markLessonDone } = useLessonProgress()
const { saveQuizScore } = useProgress()

/*
 * Passing the quiz is the substantive completion gate for this lesson: it
 * marks the lesson done and records the score. LessonShell's finish-slide
 * button still marks done too — it stays as the navigation path onward.
 */
const quizPassed = ref(false)

function onQuizPassed(score: number, total: number) {
  markLessonDone('staying-safe')
  saveQuizScore('staying-safe', score, total)
  quizPassed.value = true
}
</script>

<template>
  <LessonShell
    lesson-slug="staying-safe"
    title="Staying safe"
    intro="A few simple habits — then a short quiz to prove you've got them."
    :slides="slides"
    sim-title="Check your instincts"
  >
    <template #sim>
      <QuizBlock :questions="SAFETY_QUESTIONS" @passed="onQuizPassed" />
      <AppNotice v-if="quizPassed" kind="success" class="staying-safe__passed">
        Well done — you passed, and this lesson is marked complete.
      </AppNotice>
    </template>
  </LessonShell>
</template>
