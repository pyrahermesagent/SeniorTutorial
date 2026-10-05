import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { lessonsDone: ref<string[]>([]) }
})

// The stub behaves like the real composable: isLessonDone reads the state.
vi.mock('../../composables/useLessonProgress', () => ({
  useLessonProgress: () => ({
    doneCount: { value: mocks.lessonsDone.value.length },
    totalCount: 6,
    isLessonDone: (slug: string) => mocks.lessonsDone.value.includes(slug),
    markLessonDone: (slug: string) => {
      if (!mocks.lessonsDone.value.includes(slug)) mocks.lessonsDone.value.push(slug)
    },
  }),
}))

import LessonShell from '../../components/LessonShell.vue'
import type { LessonSlide } from '../../content/lessons'

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const slides: LessonSlide[] = [
  { icon: 'coins', title: 'Money runs on trust', lines: ['Banks keep the record.'] },
  {
    icon: 'clock',
    title: 'The old way is slow',
    lines: [['A ', { term: 'transfer', label: 'transfer' }, ' takes days.']],
  },
]

/* The slide section that is not mid-leave-animation (the active one). */
function activeSlide(wrapper: ReturnType<typeof mount>) {
  const sections = wrapper.findAll('.show__slide')
  const leaving = sections.filter((node) => /leave/.test(node.classes().join(' ')))
  const remaining = sections.filter((node) => !/leave/.test(node.classes().join(' ')))
  expect(leaving.length + remaining.length).toBeGreaterThanOrEqual(1)
  return remaining[remaining.length - 1] ?? leaving[0]
}

async function press(wrapper: ReturnType<typeof mount>, label: string) {
  await wrapper.get(`[aria-label="${label}"]`).trigger('click')
  await flushPromises()
}

function mountShell(slots: Record<string, string> = {}) {
  return mount(LessonShell, {
    props: {
      title: 'What is money, anyway?',
      intro: 'A closer look.',
      lessonSlug: 'what-is-money',
      slides,
    },
    global: { stubs: { NuxtLink: nuxtLinkStub } },
    slots,
  })
}

beforeEach(() => {
  mocks.lessonsDone.value = []
})

describe('LessonShell slideshow', () => {
  it('starts on the title slide with no Back button and one dot per slide', async () => {
    const wrapper = mountShell()
    await flushPromises()
    const slide = activeSlide(wrapper)
    expect(slide.text()).toContain('What is money, anyway?')
    expect(slide.text()).toContain('A closer look.')
    expect(slide.text()).not.toContain('Money runs on trust')
    // intro + 2 content + finish = 4 dots, and Back is absent on slide one.
    expect(wrapper.findAll('.show__dot')).toHaveLength(4)
    expect(wrapper.find('[aria-label="Previous slide"]').exists()).toBe(false)
  })

  it('shows exactly one slide at a time as Next and Back move through the deck', async () => {
    const wrapper = mountShell()
    await flushPromises()

    await press(wrapper, 'Next slide')
    expect(activeSlide(wrapper).text()).toContain('Money runs on trust')
    expect(activeSlide(wrapper).text()).not.toContain('The old way is slow')

    await press(wrapper, 'Next slide')
    // The glossary segment renders as a link to its glossary anchor.
    expect(activeSlide(wrapper).text()).toContain('The old way is slow')
    expect(wrapper.find('a[href="/glossary#transfer"]').exists()).toBe(true)

    await press(wrapper, 'Previous slide')
    expect(activeSlide(wrapper).text()).toContain('Money runs on trust')
  })

  it('jumps to any slide through the dots', async () => {
    const wrapper = mountShell()
    await flushPromises()
    await press(wrapper, 'Go to: The old way is slow')
    expect(activeSlide(wrapper).text()).toContain('The old way is slow')
  })

  it('the finish slide marks the lesson complete and offers the next lesson', async () => {
    const wrapper = mountShell()
    await flushPromises()

    await press(wrapper, 'Go to finish')
    expect(activeSlide(wrapper).text()).toContain('Lesson complete')
    expect(wrapper.find('[aria-label="Next slide"]').exists()).toBe(false)

    await wrapper.get('.show__finish-cta').trigger('click')
    await flushPromises()
    expect(mocks.lessonsDone.value).toContain('what-is-money')
    // Once done, the same button becomes the onward navigation.
    expect(activeSlide(wrapper).text()).toContain('Continue to the next lesson')
    expect(wrapper.find('a[href="/learn/shared-notebook"]').exists()).toBe(true)
  })

  it('inserts the sim slot as its own slide before the finish slide', async () => {
    const wrapper = mountShell({ sim: '<p class="sim-stub">race the payment</p>' })
    await flushPromises()
    // intro + 2 content + sim + finish = 5 dots
    expect(wrapper.findAll('.show__dot')).toHaveLength(5)

    await press(wrapper, 'Go to: Try it yourself')
    expect(activeSlide(wrapper).text()).toContain('Try it yourself')
    expect(wrapper.find('.sim-stub').exists()).toBe(true)
  })
})
