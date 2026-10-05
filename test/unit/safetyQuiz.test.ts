import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { ProgressState } from '../../utils/progress'
import { SAFETY_QUESTIONS } from '../../content/lessons/staying-safe'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    state: ref<ProgressState>({ lessonsDone: [], challengesDone: [], quiz: {} }),
    isLessonDone: vi.fn<(slug: string) => boolean>(() => false),
    markLessonDone: vi.fn<(slug: string) => void>(),
    saveQuizScore: vi.fn<(slug: string, score: number, total: number) => void>(),
  }
})

vi.mock('../../composables/useLessonProgress', () => ({
  useLessonProgress: () => ({
    doneCount: ref(0),
    totalCount: 6,
    isLessonDone: mocks.isLessonDone,
    markLessonDone: mocks.markLessonDone,
  }),
}))

vi.mock('../../composables/useProgress', () => ({
  useProgress: () => ({
    state: mocks.state,
    markLessonDone: mocks.markLessonDone,
    markChallengeDone: vi.fn(),
    saveQuizScore: mocks.saveQuizScore,
    setCluster: vi.fn(),
    setLastWallet: vi.fn(),
  }),
}))

import { ref } from 'vue'
import StayingSafe from '../../components/learn/StayingSafe.vue'

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

/*
 * The slideshow shows one slide at a time; the quiz lives on the lesson's
 * interactive slide. Mount, then jump straight to it via its dot control.
 */
async function mountLesson() {
  const wrapper = mount(StayingSafe, {
    global: { stubs: { NuxtLink: nuxtLinkStub } },
  })
  await flushPromises()
  await wrapper.get('[aria-label="Go to: Check your instincts"]').trigger('click')
  await flushPromises()
  return wrapper
}

async function clickOption(wrapper: VueWrapper, text: string) {
  const option = wrapper
    .findAll('.quiz-block__option')
    .find((candidate) => candidate.text() === text)
  expect(option, `option "${text}"`).toBeDefined()
  await option!.trigger('click')
}

async function clickAction(wrapper: VueWrapper, text: string) {
  const action = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().includes(text))
  expect(action, `button "${text}"`).toBeDefined()
  await action!.trigger('click')
}

describe('SAFETY_QUESTIONS content', () => {
  it('contains exactly four questions', () => {
    expect(SAFETY_QUESTIONS).toHaveLength(4)
  })

  it('gives every question three options, an in-range answer, and a non-empty explanation', () => {
    for (const question of SAFETY_QUESTIONS) {
      expect(question.q.trim().length).toBeGreaterThan(0)
      expect(question.options, `options for "${question.q}"`).toHaveLength(3)
      expect(Number.isInteger(question.answer)).toBe(true)
      expect(question.answer).toBeGreaterThanOrEqual(0)
      expect(question.answer).toBeLessThan(question.options.length)
      expect(question.explain.trim().length).toBeGreaterThan(0)
    }
  })

  it('asks who you may share your recovery phrase with, and the correct answer is "nobody, ever"', () => {
    const recovery = SAFETY_QUESTIONS.find((question) => /recovery phrase/i.test(question.q))
    expect(recovery, 'a question about the recovery phrase').toBeDefined()
    const answeredOption = recovery!.options[recovery!.answer]
    expect(answeredOption).toMatch(/no.?one|nobody/i)
  })
})

describe('StayingSafe lesson quiz wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the quiz with the safety questions', async () => {
    const wrapper = await mountLesson()
    expect(wrapper.text()).toContain(SAFETY_QUESTIONS[0].q)
    expect(wrapper.text()).toContain(`Question 1 of ${SAFETY_QUESTIONS.length}`)
  })

  it('marks the lesson done, saves the score, and shows a success notice when the quiz is passed', async () => {
    const wrapper = await mountLesson()
    for (let index = 0; index < SAFETY_QUESTIONS.length; index += 1) {
      const question = SAFETY_QUESTIONS[index]
      await clickOption(wrapper, question.options[question.answer])
      if (index < SAFETY_QUESTIONS.length - 1) {
        await clickAction(wrapper, 'Next question')
      }
    }
    expect(mocks.markLessonDone).toHaveBeenCalledWith('staying-safe')
    expect(mocks.saveQuizScore).toHaveBeenCalledWith(
      'staying-safe',
      SAFETY_QUESTIONS.length,
      SAFETY_QUESTIONS.length,
    )
    expect(wrapper.find('.staying-safe__passed').exists()).toBe(true)
  })

  it('does not mark the lesson done before the quiz is passed', async () => {
    const wrapper = await mountLesson()
    await clickOption(wrapper, SAFETY_QUESTIONS[0].options[SAFETY_QUESTIONS[0].answer])
    expect(mocks.markLessonDone).not.toHaveBeenCalled()
    expect(mocks.saveQuizScore).not.toHaveBeenCalled()
    expect(wrapper.find('.staying-safe__passed').exists()).toBe(false)
  })
})
