import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Cluster } from '../../utils/cluster'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    account: ref<{ address: string; label?: string } | null>(null),
    wallets: ref([]),
    connecting: ref(false),
    connect: vi.fn<(name?: string) => Promise<void>>().mockResolvedValue(undefined),
    disconnect: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    sendInstructions: vi.fn(),
    cluster: ref<Cluster>('devnet'),
    setCluster: vi.fn<(next: Cluster) => void>(),
    getBalance: vi.fn<(addr: string) => Promise<bigint>>().mockResolvedValue(0n),
    requestDevnetAirdrop:
      vi.fn<
        (addr: string, sol: number) => Promise<{ sig: string } | { error: 'rate-limited' | 'unavailable' }>
      >(),
  }
})

vi.mock('../../composables/useWallet', () => ({
  useWallet: () => mocks,
}))

vi.mock('../../composables/useSolana', () => ({
  useSolana: () => mocks,
}))

import StepList from '../../components/start/StepList.vue'

const ADDRESS = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

function mountSteps() {
  return mount(StepList, { global: { stubs: { NuxtLink: nuxtLinkStub } } })
}

describe('StepList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.account.value = null
    mocks.cluster.value = 'devnet'
    mocks.getBalance.mockResolvedValue(0n)
  })

  it('renders three numbered steps as collapsible details', () => {
    const wrapper = mountSteps()
    const steps = wrapper.findAll('details.step')
    expect(steps).toHaveLength(3)
    const summaries = wrapper.findAll('summary').map((s) => s.text())
    expect(summaries[0]).toContain('Get a wallet')
    expect(summaries[1]).toContain('SOL')
    expect(summaries[2]).toContain('challenge')
  })

  it('step 1 shows both wallet install cards with their Play Store links', () => {
    const wrapper = mountSteps()
    const cards = wrapper.findAll('.wallet-install-card')
    expect(cards).toHaveLength(2)
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('https://play.google.com/store/apps/details?id=com.solflare.mobile')
    expect(hrefs).toContain('https://play.google.com/store/apps/details?id=app.phantom')
  })

  it('step 2 renders the devnet faucet (not onramp cards) on Devnet', async () => {
    mocks.account.value = { address: ADDRESS }
    const wrapper = mountSteps()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.devnet-faucet-button').exists()).toBe(true)
    expect(wrapper.find('.onramp-card').exists()).toBe(false)
  })

  it('step 2 renders onramp cards (not the faucet) on Mainnet once settled', async () => {
    mocks.cluster.value = 'mainnet-beta'
    mocks.account.value = { address: ADDRESS }
    const wrapper = mountSteps()
    // First paint matches the prerendered default (Devnet)…
    expect(wrapper.find('.onramp-card').exists()).toBe(false)
    await wrapper.vm.$nextTick()
    // …then the persisted Mainnet choice applies.
    expect(wrapper.find('.devnet-faucet-button').exists()).toBe(false)
    const cards = wrapper.findAll('.onramp-card')
    expect(cards).toHaveLength(3)
    const text = wrapper.text()
    expect(text).toContain('Coinbase Pay')
    expect(text).toContain('MoonPay')
    expect(text).toContain('Topper')
  })

  it('step 2 asks for a wallet connection before showing funding options', async () => {
    mocks.cluster.value = 'mainnet-beta'
    const wrapper = mountSteps()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.onramp-card').exists()).toBe(false)
    expect(wrapper.find('.devnet-faucet-button').exists()).toBe(false)
    expect(wrapper.text()).toMatch(/connect your wallet/i)
  })

  it('ticks step 1 once a wallet is connected', async () => {
    mocks.account.value = { address: ADDRESS }
    const wrapper = mountSteps()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    const first = wrapper.findAll('details.step')[0]!
    expect(first.find('.step__done').exists()).toBe(true)
  })

  it('ticks step 2 when the connected wallet holds some SOL', async () => {
    mocks.account.value = { address: ADDRESS }
    mocks.getBalance.mockResolvedValue(2_000_000_000n)
    const wrapper = mountSteps()
    await vi.waitFor(() => {
      const second = wrapper.findAll('details.step')[1]!
      expect(second.find('.step__done').exists()).toBe(true)
    })
    expect(mocks.getBalance).toHaveBeenCalledWith(ADDRESS)
  })

  it('step 3 links to the challenges page and promises no prizes', () => {
    const wrapper = mountSteps()
    const links = wrapper.findAll('a[href="/challenges"]')
    expect(links.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('There are no prizes')
  })
})
