<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppButton from './AppButton.vue'
import AppNotice from './AppNotice.vue'

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  explain: string
}

const props = defineProps<{
  questions: QuizQuestion[]
}>()

const emit = defineEmits<{ passed: [score: number, total: number] }>()

const currentIndex = ref(0)
const phase = ref<'answering' | 'feedback'>('answering')
const lastCorrect = ref(false)
const correctIndices = ref<Set<number>>(new Set())
const finished = ref(false)

const total = computed(() => props.questions.length)
const current = computed(() => props.questions[currentIndex.value])

const questionEl = ref<HTMLElement | null>(null)
const feedbackEl = ref<HTMLElement | null>(null)

/*
 * Phase changes swap which controls exist, so the focused element is
 * unmounted on every transition. Move focus explicitly after each render:
 * into the feedback region after an answer, back to the question heading
 * after advancing or retrying.
 */
async function focusFeedback() {
  await nextTick()
  feedbackEl.value?.focus()
}

async function focusQuestion() {
  await nextTick()
  questionEl.value?.focus()
}

function pick(index: number) {
  if (phase.value !== 'answering') {
    return
  }
  lastCorrect.value = index === current.value.answer
  phase.value = 'feedback'
  if (lastCorrect.value) {
    correctIndices.value.add(currentIndex.value)
    if (correctIndices.value.size === total.value && !finished.value) {
      finished.value = true
      emit('passed', correctIndices.value.size, total.value)
    }
  }
  void focusFeedback()
}

function retry() {
  phase.value = 'answering'
  void focusQuestion()
}

function next() {
  if (currentIndex.value < total.value - 1) {
    currentIndex.value += 1
    phase.value = 'answering'
    void focusQuestion()
  }
}
</script>

<template>
  <section v-if="total > 0" class="quiz-block" aria-label="Quiz">
    <p class="quiz-block__progress" aria-live="polite">
      Question {{ currentIndex + 1 }} of {{ total }}
    </p>
    <h3 ref="questionEl" class="quiz-block__question" tabindex="-1">{{ current.q }}</h3>

    <ul v-if="phase === 'answering'" class="quiz-block__options" role="list">
      <li v-for="(option, index) in current.options" :key="index">
        <button type="button" class="quiz-block__option" @click="pick(index)">
          {{ option }}
        </button>
      </li>
    </ul>

    <div v-else ref="feedbackEl" class="quiz-block__feedback" tabindex="-1">
      <AppNotice :kind="lastCorrect ? 'success' : 'info'" class="quiz-block__notice">
        <p class="quiz-block__verdict">
          {{ lastCorrect ? "That's right." : 'Not quite — have another look.' }}
        </p>
        <p class="quiz-block__explain">{{ current.explain }}</p>
      </AppNotice>
      <p v-if="finished" class="quiz-block__complete">
        Well done — you answered all {{ total }} questions correctly.
      </p>
      <div v-else class="quiz-block__actions">
        <AppButton v-if="!lastCorrect" @click="retry">Try again</AppButton>
        <AppButton v-else @click="next">Next question</AppButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quiz-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.quiz-block__progress {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-secondary);
}

.quiz-block__question {
  margin: 0;
  font-size: var(--text-lg);
}

.quiz-block__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.quiz-block__option {
  width: 100%;
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.4;
  text-align: left;
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color 120ms ease;
}

.quiz-block__option:hover {
  background-color: color-mix(in srgb, var(--color-accent) 20%, var(--color-surface));
}

.quiz-block__feedback {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.quiz-block__feedback :deep(p) {
  margin: 0;
}

.quiz-block__verdict {
  font-weight: 700;
}

.quiz-block__complete {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-success);
}

.quiz-block__actions {
  display: flex;
}
</style>
