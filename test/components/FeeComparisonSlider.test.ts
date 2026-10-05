import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import FeeComparisonSlider from '../../components/learn/FeeComparisonSlider.vue'

async function setAmount(wrapper: VueWrapper, value: string) {
  await wrapper.find('input[type="range"]').setValue(value)
}

describe('FeeComparisonSlider', () => {
  it('opens at $500 with the flat bank estimate and the flat Solana fee', () => {
    const wrapper = mount(FeeComparisonSlider)
    expect(wrapper.text()).toContain('If you send $500.00')
    expect(wrapper.find('.fee-comparison__fee--bank').text()).toContain('$25.00')
    expect(wrapper.find('.fee-comparison__fee--solana').text()).toContain('less than $0.01')
  })

  it('pins the bank heuristic: $50 → flat "$25.00"', async () => {
    const wrapper = mount(FeeComparisonSlider)
    await setAmount(wrapper, '50')
    expect(wrapper.text()).toContain('If you send $50.00')
    expect(wrapper.find('.fee-comparison__fee--bank').text()).toContain('$25.00')
  })

  it('pins the bank heuristic: $5,000 → "$50.00" (1%)', async () => {
    const wrapper = mount(FeeComparisonSlider)
    await setAmount(wrapper, '5000')
    expect(wrapper.text()).toContain('If you send $5,000.00')
    expect(wrapper.find('.fee-comparison__fee--bank').text()).toContain('$50.00')
  })

  it('keeps the Solana line at "less than $0.01" for every amount', async () => {
    const wrapper = mount(FeeComparisonSlider)
    for (const value of ['1', '50', '5000', '10000']) {
      await setAmount(wrapper, value)
      expect(wrapper.find('.fee-comparison__fee--solana').text()).toContain('less than $0.01')
    }
  })

  it('labels the bank figure as a typical estimate', () => {
    const wrapper = mount(FeeComparisonSlider)
    expect(wrapper.text()).toMatch(/typical.*(bank|wire)/i)
  })

  it('announces both fees in an aria-live readout', async () => {
    const wrapper = mount(FeeComparisonSlider)
    const live = wrapper.find('[aria-live="polite"]')
    expect(live.exists()).toBe(true)
    expect(live.text()).toContain('less than $0.01')
    await setAmount(wrapper, '5000')
    expect(live.text()).toContain('$50.00')
    expect(live.text()).toContain('less than $0.01')
  })
})
