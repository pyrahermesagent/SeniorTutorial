import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransferRaceSim from '../../components/learn/TransferRaceSim.vue'
import { BANK_DONE_TICK, BANK_RECEIPT, SOLANA_RECEIPT } from '../../utils/transferRace'

describe('TransferRaceSim', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the play button before the race starts', () => {
    const wrapper = mount(TransferRaceSim)
    const play = wrapper.find('button.race__play')
    expect(play.exists()).toBe(true)
    expect(play.text()).toContain('Send $50')
    expect(wrapper.text()).not.toContain(SOLANA_RECEIPT)
    wrapper.unmount()
  })

  it('plays the race: Solana finishes immediately while the bank still travels', async () => {
    const wrapper = mount(TransferRaceSim)
    await wrapper.find('button.race__play').trigger('click')
    await vi.advanceTimersByTimeAsync(200)

    expect(wrapper.text()).toContain(SOLANA_RECEIPT)
    expect(wrapper.text()).toContain('Day 1')
    expect(wrapper.text()).not.toContain(BANK_RECEIPT)
    wrapper.unmount()
  })

  it('finishes with both receipts and the verdict', async () => {
    const wrapper = mount(TransferRaceSim)
    await wrapper.find('button.race__play').trigger('click')
    await vi.advanceTimersByTimeAsync(200 * BANK_DONE_TICK)

    expect(wrapper.text()).toContain(SOLANA_RECEIPT)
    expect(wrapper.text()).toContain(BANK_RECEIPT)
    expect(wrapper.text()).toContain('Same $50')
    expect(wrapper.find('button.race__play').exists()).toBe(false)
    wrapper.unmount()
  })
})
