<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'
import AppNotice from './AppNotice.vue'
import GlossaryTerm from './GlossaryTerm.vue'
import { useLessonProgress } from '../composables/useLessonProgress'
import { LESSONS } from '../content/lessons'
import type { GlossaryLink, LessonSlide, SlideLine } from '../content/lessons'

const props = withDefaults(
  defineProps<{
    title: string
    intro: string
    lessonSlug: string
    slides: LessonSlide[]
    simTitle?: string
  }>(),
  { simTitle: 'Try it yourself' },
)

const slots = useSlots()
const { isLessonDone, markLessonDone } = useLessonProgress()

/*
 * Prerendered HTML always shows the not-done state. Persisted progress is
 * only reflected after mount, so hydration matches the static markup (same
 * pattern as NetworkToggle and the Learn overview).
 */
const settled = ref(false)

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

const lessonIcon = computed(
  () => LESSONS.find((lesson) => lesson.slug === props.lessonSlug)?.icon ?? 'book-open',
)

/* Slide deck: title slide, content slides, optional interactive slide, finish slide. */
const hasSim = computed(() => Boolean(slots.sim))
const total = computed(() => props.slides.length + (hasSim.value ? 1 : 0) + 2)

const current = ref(0)
const direction = ref<'forward' | 'back'>('forward')

const kind = computed<'intro' | 'content' | 'sim' | 'done'>(() => {
  if (current.value === 0) return 'intro'
  if (current.value === total.value - 1) return 'done'
  return current.value - 1 < props.slides.length ? 'content' : 'sim'
})

const activeSlide = computed(() =>
  kind.value === 'content' ? props.slides[current.value - 1] : undefined,
)

const slideLabel = computed(() => {
  if (kind.value === 'intro') return props.title
  if (kind.value === 'sim') return props.simTitle
  if (kind.value === 'done') return 'Lesson complete'
  return activeSlide.value?.title ?? ''
})

const slideEl = ref<HTMLElement | null>(null)

async function goTo(index: number) {
  const clamped = Math.min(Math.max(index, 0), total.value - 1)
  if (clamped === current.value) return
  direction.value = clamped > current.value ? 'forward' : 'back'
  current.value = clamped
  await nextTick()
  slideEl.value?.focus({ preventScroll: true })
}

function next() {
  void goTo(current.value + 1)
}

function prev() {
  void goTo(current.value - 1)
}

function onComplete() {
  markLessonDone(props.lessonSlug)
}

/* Swipe left/right across the deck; vertical scrolling stays untouched. */
let touchStart: { x: number; y: number } | null = null

function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch || !touchStart) return
  const dx = touch.clientX - touchStart.x
  const dy = touch.clientY - touchStart.y
  touchStart = null
  if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    if (dx < 0) next()
    else prev()
  }
}

/* Arrow keys turn pages — except while a form control is focused. */
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (event.key === 'ArrowRight') next()
  else if (event.key === 'ArrowLeft') prev()
}

onMounted(() => {
  settled.value = true
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

function segments(line: SlideLine): Array<string | GlossaryLink> {
  return typeof line === 'string' ? [line] : line
}

function isLink(segment: string | GlossaryLink): segment is GlossaryLink {
  return typeof segment === 'object'
}

function dotLabel(index: number): string {
  if (index === 0) return `Go to title: ${props.title}`
  if (index === total.value - 1) return 'Go to finish'
  if (hasSim.value && index === total.value - 2) return `Go to: ${props.simTitle}`
  return `Go to: ${props.slides[index - 1]?.title ?? `slide ${index + 1}`}`
}
</script>

<template>
  <article class="show">
    <header class="show__header">
      <NuxtLink to="/learn" class="show__back">
        <AppIcon name="arrow-left" :size="20" />
        Lessons
      </NuxtLink>
      <p class="show__crumb">{{ title }}</p>
    </header>

    <div
      class="show__deck"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <Transition :name="direction === 'forward' ? 'show-fwd' : 'show-back'">
        <section
          :key="current"
          ref="slideEl"
          class="show__slide"
          role="group"
          tabindex="-1"
          :aria-label="`Slide ${current + 1} of ${total}: ${slideLabel}`"
        >
          <div v-if="kind === 'intro'" class="show__center">
            <span class="show__heroicon">
              <AppIcon :name="lessonIcon" :size="52" />
            </span>
            <h1 class="show__slide-title">{{ title }}</h1>
            <p class="show__intro">{{ intro }}</p>
            <p class="show__hint">Swipe or tap Next</p>
          </div>

          <div v-else-if="kind === 'content' && activeSlide" class="show__center">
            <span v-if="activeSlide.icon" class="show__heroicon">
              <AppIcon :name="activeSlide.icon" :size="44" />
            </span>
            <h2 class="show__slide-title">{{ activeSlide.title }}</h2>
            <div class="show__lines">
              <p v-for="(line, lineIndex) in activeSlide.lines" :key="lineIndex">
                <template v-for="(segment, segmentIndex) in segments(line)" :key="segmentIndex">
                  <GlossaryTerm v-if="isLink(segment)" :term="segment.term">
                    {{ segment.label ?? segment.term }}
                  </GlossaryTerm>
                  <template v-else>{{ segment }}</template>
                </template>
              </p>
            </div>
          </div>

          <div v-else-if="kind === 'sim'" class="show__sim">
            <h2 class="show__slide-title">{{ simTitle }}</h2>
            <div class="show__sim-body">
              <slot name="sim" />
            </div>
          </div>

          <div v-else class="show__center">
            <span class="show__heroicon show__heroicon--done">
              <AppIcon name="circle-check" :size="52" />
            </span>
            <h2 class="show__slide-title">Lesson complete</h2>
            <AppNotice v-if="showDone" kind="success">
              Nicely done — you can read it again any time.
            </AppNotice>
            <AppButton :to="nextPath" size="lg" class="show__finish-cta" @click="onComplete">
              {{ showDone ? continueLabel : 'Mark lesson complete' }}
            </AppButton>
            <p v-if="nextLesson" class="show__upnext">Next up: {{ nextLesson.title }}</p>
          </div>
        </section>
      </Transition>
    </div>

    <nav class="show__controls" aria-label="Slide controls">
      <AppButton v-if="current > 0" variant="ghost" size="lg" aria-label="Previous slide" @click="prev">
        <AppIcon name="arrow-left" :size="24" />
        Back
      </AppButton>
      <span v-else class="show__spacer" aria-hidden="true" />

      <ol class="show__dots">
        <li v-for="index in total" :key="index">
          <button
            type="button"
            class="show__dot"
            :class="{ 'show__dot--active': current === index - 1 }"
            :aria-label="dotLabel(index - 1)"
            :aria-current="current === index - 1 ? 'true' : undefined"
            @click="goTo(index - 1)"
          />
        </li>
      </ol>

      <AppButton v-if="kind !== 'done'" size="lg" aria-label="Next slide" @click="next">
        Next
        <AppIcon name="arrow-right" :size="24" />
      </AppButton>
      <span v-else class="show__spacer" aria-hidden="true" />
    </nav>

    <p class="show__live" aria-live="polite">
      Slide {{ current + 1 }} of {{ total }}: {{ slideLabel }}
    </p>
  </article>
</template>

<style scoped>
.show {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.show__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.show__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.4rem; /* 48px touch target */
  padding: var(--space-1) var(--space-2);
  margin-left: calc(-1 * var(--space-2));
  font-size: var(--text-base);
  font-weight: 700;
}

.show__crumb {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-secondary);
  text-align: right;
}

/* Deck — the stage where exactly one slide is visible. */
.show__deck {
  position: relative;
  min-height: 17rem;
  overflow-x: clip;
  touch-action: pan-y;
}

.show__slide {
  display: flex;
  flex-direction: column;
  min-height: inherit;
}

.show__slide:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--space-1);
  border-radius: 12px;
}

.show__center {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-2);
  text-align: center;
}

.show__center p {
  max-width: 46ch;
}

.show__slide-title {
  margin: 0;
  font-size: var(--text-2xl);
}

.show__intro {
  margin: 0;
  font-size: var(--text-lg);
}

.show__hint {
  margin: 0;
  font-weight: 700;
  color: var(--color-secondary);
}

.show__lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}

.show__lines p {
  margin: 0;
  font-size: var(--text-lg);
}

/* Hero icon badge — pops in, then bobs gently. */
.show__heroicon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 5.6rem;
  height: 5.6rem;
  border-radius: 50%;
  border: 3px solid var(--color-ink);
  background-color: var(--color-accent);
  color: var(--color-ink);
  animation:
    show-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both,
    show-bob 3.2s ease-in-out 620ms infinite;
}

.show__heroicon--done {
  background-color: var(--color-success-bg);
}

.show__sim {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-info-bg);
  border: 2px solid var(--color-secondary);
  border-radius: 12px;
}

.show__sim .show__slide-title {
  margin: 0 auto;
  text-align: center;
}

.show__sim-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Controls */
.show__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-top: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  padding-top: var(--space-3);
}

.show__controls :deep(.app-button) {
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    transform 120ms ease;
}

.show__controls :deep(.app-button:active) {
  transform: scale(0.96);
}

.show__spacer {
  width: 6.5rem;
}

.show__dots {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  padding: var(--space-1);
  list-style: none;
}

.show__dot {
  width: 0.85rem;
  height: 0.85rem;
  padding: 0;
  min-height: 0;
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  background-color: transparent;
  cursor: pointer;
  transition: width 220ms ease, background-color 220ms ease;
}

.show__dot--active {
  width: 2.2rem;
  background-color: var(--color-accent);
}

/* Screen-reader progress announcement on every slide change. */
.show__live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Slide transitions: the deck glides sideways, one idea at a time. */
.show-fwd-enter-active {
  animation: show-enter-right 300ms ease-out both;
}

.show-fwd-leave-active {
  position: absolute;
  inset: 0;
  animation: show-leave-left 240ms ease-in both;
}

.show-back-enter-active {
  animation: show-enter-left 300ms ease-out both;
}

.show-back-leave-active {
  position: absolute;
  inset: 0;
  animation: show-leave-right 240ms ease-in both;
}

/* Children of the entering slide rise in, one after another. */
.show-fwd-enter-active .show__center > *,
.show-back-enter-active .show__center > *,
.show-fwd-enter-active .show__sim > *,
.show-back-enter-active .show__sim > * {
  animation: show-rise 380ms ease-out both;
}

.show-fwd-enter-active .show__center > :nth-child(2),
.show-back-enter-active .show__center > :nth-child(2),
.show-fwd-enter-active .show__sim > :nth-child(2),
.show-back-enter-active .show__sim > :nth-child(2) {
  animation-delay: 80ms;
}

.show-fwd-enter-active .show__center > :nth-child(3),
.show-back-enter-active .show__center > :nth-child(3),
.show-fwd-enter-active .show__sim > :nth-child(3),
.show-back-enter-active .show__sim > :nth-child(3) {
  animation-delay: 160ms;
}

.show-fwd-enter-active .show__center > :nth-child(4),
.show-back-enter-active .show__center > :nth-child(4),
.show-back-enter-active .show__sim > :nth-child(4),
.show-back-enter-active .show__sim > :nth-child(4) {
  animation-delay: 240ms;
}

/* The stagger would fight the icon's own pop. */
.show-fwd-enter-active .show__heroicon,
.show-back-enter-active .show__heroicon {
  animation:
    show-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both,
    show-bob 3.2s ease-in-out 620ms infinite;
}

@keyframes show-enter-right {
  from {
    opacity: 0;
    transform: translateX(10%);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes show-enter-left {
  from {
    opacity: 0;
    transform: translateX(-10%);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes show-leave-left {
  from {
    opacity: 1;
    transform: none;
  }
  to {
    opacity: 0;
    transform: translateX(-10%);
  }
}

@keyframes show-leave-right {
  from {
    opacity: 1;
    transform: none;
  }
  to {
    opacity: 0;
    transform: translateX(10%);
  }
}

@keyframes show-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes show-pop {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  70% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes show-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
