import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import LedgerSim from '../../components/learn/LedgerSim.vue'

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

function mountSim() {
  return mount(LedgerSim, { global: { stubs: { NuxtLink: nuxtLinkStub } } })
}

async function clickButton(wrapper: VueWrapper, text: string) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().includes(text))
  expect(button, `button "${text}"`).toBeDefined()
  await button!.trigger('click')
}

describe('LedgerSim', () => {
  it('shows four notebook copies with the suggested first entry prefilled', () => {
    const wrapper = mountSim()
    expect(wrapper.findAll('.ledger__copy')).toHaveLength(4)
    const input = wrapper.find<HTMLInputElement>('#ledger-entry')
    expect(input.exists()).toBe(true)
    expect(input.element.value).toBe('Anna pays Marco 2 SOL')
  })

  it('adds the entry to every notebook', async () => {
    const wrapper = mountSim()
    await clickButton(wrapper, 'Add to all notebooks')
    const copies = wrapper.findAll('.ledger__copy')
    expect(copies).toHaveLength(4)
    for (const copy of copies) {
      expect(copy.text()).toContain('Anna pays Marco 2 SOL')
    }
  })

  it('adds a custom typed entry to every notebook', async () => {
    const wrapper = mountSim()
    await wrapper.find('#ledger-entry').setValue('Rosa pays Anna 5 SOL')
    await clickButton(wrapper, 'Add to all notebooks')
    for (const copy of wrapper.findAll('.ledger__copy')) {
      expect(copy.text()).toContain('Rosa pays Anna 5 SOL')
    }
  })

  it('keeps "Try to cheat" unavailable until a line exists', () => {
    const wrapper = mountSim()
    const cheat = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('Try to cheat'))
    expect(cheat).toBeDefined()
    expect(cheat!.attributes('disabled')).toBeDefined()
  })

  it('rejects a cheated copy on check and snaps it back to the shared value', async () => {
    const wrapper = mountSim()
    await clickButton(wrapper, 'Add to all notebooks')
    await clickButton(wrapper, 'Try to cheat')

    await wrapper.findAll('.ledger__copy')[2]!.find('.ledger__pick').trigger('click')
    const cheatInputs = wrapper.findAll('.ledger__cheat-input')
    expect(cheatInputs).toHaveLength(1)
    await cheatInputs[0]!.setValue('Anna pays Marco 200 SOL')
    await clickButton(wrapper, 'Check the notebooks')

    const copies = wrapper.findAll('.ledger__copy')
    expect(copies[2]!.classes()).toContain('ledger__copy--rejected')
    expect(copies[2]!.text()).toContain('Anna pays Marco 2 SOL')
    expect(copies[2]!.text()).not.toContain('200 SOL')
    for (const index of [0, 1, 3]) {
      expect(copies[index]!.classes()).not.toContain('ledger__copy--rejected')
      expect(copies[index]!.text()).toContain('Anna pays Marco 2 SOL')
    }
    expect(wrapper.text()).toContain('odd one out')
  })

  it('lets only the picked notebook be edited; the others stay read-only', async () => {
    const wrapper = mountSim()
    await clickButton(wrapper, 'Add to all notebooks')
    await clickButton(wrapper, 'Try to cheat')

    const copies = wrapper.findAll('.ledger__copy')
    expect(wrapper.findAll('.ledger__pick')).toHaveLength(4)
    expect(wrapper.findAll('.ledger__cheat-input')).toHaveLength(0)

    await copies[1]!.find('.ledger__pick').trigger('click')
    expect(wrapper.findAll('.ledger__cheat-input')).toHaveLength(1)
    expect(copies[1]!.find('.ledger__cheat-input').exists()).toBe(true)
    expect(copies[1]!.find('.ledger__pick').attributes('aria-pressed')).toBe('true')
    for (const index of [0, 2, 3]) {
      expect(copies[index]!.find('.ledger__cheat-input').exists()).toBe(false)
      expect(copies[index]!.text()).toContain('Anna pays Marco 2 SOL')
      expect(copies[index]!.find('.ledger__pick').attributes('aria-pressed')).toBe('false')
    }

    // picking a different notebook moves the single editable input
    await copies[3]!.find('.ledger__pick').trigger('click')
    expect(wrapper.findAll('.ledger__cheat-input')).toHaveLength(1)
    expect(copies[3]!.find('.ledger__cheat-input').exists()).toBe(true)
    expect(copies[1]!.find('.ledger__cheat-input').exists()).toBe(false)
  })

  it('always rejects exactly the tampered copy, whichever notebook is picked', async () => {
    const wrapper = mountSim()
    await clickButton(wrapper, 'Add to all notebooks')

    for (const target of [0, 3]) {
      await clickButton(wrapper, 'Try to cheat')
      await wrapper.findAll('.ledger__copy')[target]!.find('.ledger__pick').trigger('click')
      await wrapper.find('.ledger__cheat-input').setValue('Anna pays Marco 200 SOL')
      await clickButton(wrapper, 'Check the notebooks')

      const copies = wrapper.findAll('.ledger__copy')
      copies.forEach((copy, index) => {
        expect(copy.classes().includes('ledger__copy--rejected')).toBe(index === target)
        expect(copy.text()).toContain('Anna pays Marco 2 SOL')
        expect(copy.text()).not.toContain('200 SOL')
      })
    }
  })

  it('accepts the notebooks when nothing was changed', async () => {
    const wrapper = mountSim()
    await clickButton(wrapper, 'Add to all notebooks')
    await clickButton(wrapper, 'Try to cheat')
    await clickButton(wrapper, 'Check the notebooks')

    expect(wrapper.find('.ledger__copy--rejected').exists()).toBe(false)
    expect(wrapper.text()).toContain('All four notebooks agree')

    // picking a notebook but leaving its text untouched is also honest
    await clickButton(wrapper, 'Try to cheat')
    await wrapper.findAll('.ledger__copy')[1]!.find('.ledger__pick').trigger('click')
    await clickButton(wrapper, 'Check the notebooks')
    expect(wrapper.find('.ledger__copy--rejected').exists()).toBe(false)
    expect(wrapper.text()).toContain('All four notebooks agree')
  })
})
