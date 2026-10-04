import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Cluster } from '../../utils/cluster'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    cluster: ref<Cluster>('devnet'),
    setCluster: vi.fn<(next: Cluster) => void>(),
  }
})

vi.mock('../../composables/useSolana', () => ({
  useSolana: () => mocks,
}))

import NetworkToggle from '../../components/NetworkToggle.vue'

describe('NetworkToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cluster.value = 'devnet'
    // The stub behaves like the real composable: setting persists the choice.
    mocks.setCluster.mockImplementation((next: Cluster) => {
      mocks.cluster.value = next
    })
  })

  it('renders a radiogroup with Mainnet and Devnet (practice) options', () => {
    const wrapper = mount(NetworkToggle)
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(true)
    const options = wrapper.findAll('[role="radio"]')
    expect(options).toHaveLength(2)
    const labels = options.map((option) => option.text())
    expect(labels.some((label) => label.includes('Mainnet'))).toBe(true)
    expect(labels.some((label) => label.includes('Devnet (practice)'))).toBe(true)
  })

  it('checks Devnet by default and shows no real-money note', () => {
    const wrapper = mount(NetworkToggle)
    const devnet = wrapper.findAll('[role="radio"]').find((o) => o.text().includes('Devnet'))!
    const mainnet = wrapper.findAll('[role="radio"]').find((o) => o.text().includes('Mainnet'))!
    expect(devnet.attributes('aria-checked')).toBe('true')
    expect(mainnet.attributes('aria-checked')).toBe('false')
    expect(wrapper.find('.network-toggle__note').exists()).toBe(false)
  })

  it('shows the real-money note only while Mainnet is selected', async () => {
    mocks.cluster.value = 'mainnet-beta'
    const wrapper = mount(NetworkToggle)
    // First paint matches the prerendered default (Devnet), then the
    // persisted Mainnet choice applies after mount.
    expect(wrapper.find('.network-toggle__note').exists()).toBe(false)
    await wrapper.vm.$nextTick()
    const note = wrapper.find('.network-toggle__note')
    expect(note.exists()).toBe(true)
    expect(note.text().toLowerCase()).toContain('real money')

    mocks.cluster.value = 'devnet'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.network-toggle__note').exists()).toBe(false)
  })

  it('switches the cluster via setCluster when an option is clicked', async () => {
    const wrapper = mount(NetworkToggle)
    const mainnet = wrapper.findAll('[role="radio"]').find((o) => o.text().includes('Mainnet'))!
    await mainnet.trigger('click')
    expect(mocks.setCluster).toHaveBeenCalledWith('mainnet-beta')
    expect(mainnet.attributes('aria-checked')).toBe('true')
    expect(wrapper.find('.network-toggle__note').exists()).toBe(true)

    const devnet = wrapper.findAll('[role="radio"]').find((o) => o.text().includes('Devnet'))!
    await devnet.trigger('click')
    expect(mocks.setCluster).toHaveBeenCalledWith('devnet')
    expect(devnet.attributes('aria-checked')).toBe('true')
    expect(wrapper.find('.network-toggle__note').exists()).toBe(false)
  })
})
