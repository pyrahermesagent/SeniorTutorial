import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import QuizBlock from '../../components/QuizBlock.vue'

const QUESTIONS = [
  {
    q: 'What is a blockchain?',
    options: ['A shared notebook everyone can check', 'A single company database'],
    answer: 0,
    explain: 'A blockchain is a record many computers keep together.',
  },
  {
    q: 'Who is in charge of Solana?',
    options: ['One big company', 'No single one — many independent computers'],
    answer: 1,
    explain: 'Thousands of independent computers run the network together.',
  },
  {
    q: 'What does a wallet hold?',
    options: ['Your keys', 'Paper money'],
    answer: 0,
    explain: 'A wallet holds the keys that prove money is yours.',
  },
  {
    q: 'Is Devnet free to practice on?',
    options: ['Yes, it uses practice money', 'No, it costs real money'],
    answer: 0,
    explain: 'Devnet coins are free practice money with no real value.',
  },
]

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

function mountQuiz() {
  return mount(QuizBlock, {
    props: { questions: QUESTIONS },
    global: { stubs: { NuxtLink: nuxtLinkStub } },
  })
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

async function answerCurrentCorrectly(wrapper: VueWrapper, index: number) {
  const question = QUESTIONS[index]
  await clickOption(wrapper, question.options[question.answer])
}

describe('QuizBlock', () => {
  it('renders the first question with its options and progress', () => {
    const wrapper = mountQuiz()
    expect(wrapper.text()).toContain('Question 1 of 4')
    expect(wrapper.text()).toContain(QUESTIONS[0].q)
    const options = wrapper.findAll('.quiz-block__option')
    expect(options).toHaveLength(QUESTIONS[0].options.length)
    expect(options.map((option) => option.text())).toEqual(QUESTIONS[0].options)
  })

  it('reveals the explanation after a correct answer', async () => {
    const wrapper = mountQuiz()
    await answerCurrentCorrectly(wrapper, 0)
    expect(wrapper.text()).toContain(QUESTIONS[0].explain)
    expect(wrapper.text()).toContain("That's right")
  })

  it('does not emit passed before every question is answered correctly', async () => {
    const wrapper = mountQuiz()
    for (let index = 0; index < 3; index += 1) {
      await answerCurrentCorrectly(wrapper, index)
      await clickAction(wrapper, 'Next question')
    }
    expect(wrapper.text()).toContain('Question 4 of 4')
    expect(wrapper.emitted('passed')).toBeUndefined()
  })

  it('emits passed(4, 4) once all four questions are answered correctly', async () => {
    const wrapper = mountQuiz()
    for (let index = 0; index < 3; index += 1) {
      await answerCurrentCorrectly(wrapper, index)
      await clickAction(wrapper, 'Next question')
    }
    await answerCurrentCorrectly(wrapper, 3)
    expect(wrapper.emitted('passed')).toEqual([[4, 4]])
  })

  it('shows the explanation on a wrong answer and allows retrying that question', async () => {
    const wrapper = mountQuiz()
    const wrong = QUESTIONS[0].options[1 - QUESTIONS[0].answer]
    await clickOption(wrapper, wrong)
    expect(wrapper.text()).toContain(QUESTIONS[0].explain)
    expect(wrapper.text().toLowerCase()).toContain('not quite')
    expect(wrapper.text()).toContain('Question 1 of 4')
    expect(wrapper.emitted('passed')).toBeUndefined()

    await clickAction(wrapper, 'Try again')
    await answerCurrentCorrectly(wrapper, 0)
    expect(wrapper.text()).toContain("That's right")

    await clickAction(wrapper, 'Next question')
    expect(wrapper.text()).toContain('Question 2 of 4')
  })

  it('still emits passed(4, 4) when a question needed a retry', async () => {
    const wrapper = mountQuiz()
    const wrong = QUESTIONS[0].options[1 - QUESTIONS[0].answer]
    await clickOption(wrapper, wrong)
    await clickAction(wrapper, 'Try again')
    for (let index = 0; index < 3; index += 1) {
      await answerCurrentCorrectly(wrapper, index)
      await clickAction(wrapper, 'Next question')
    }
    await answerCurrentCorrectly(wrapper, 3)
    expect(wrapper.emitted('passed')).toEqual([[4, 4]])
  })
})
