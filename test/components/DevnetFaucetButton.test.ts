import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    account: ref<{ address: string; label?: string } | null>(null),
    wallets: ref([]),
    connecting: ref(false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendInstructions: vi.fn(),
    cluster: ref<'mainnet-beta' | 'devnet'>('devnet'),
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

import DevnetFaucetButton from '../../components/start/DevnetFaucetButton.vue'

const ADDRESS = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

function mountFaucet() {
  return mount(DevnetFaucetButton, { global: { stubs: { NuxtLink: nuxtLinkStub } } })
}

describe('DevnetFaucetButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.account.value = { address: ADDRESS }
  })

  it('asks the faucet for 1 SOL for the connected account', async () => {
    mocks.requestDevnetAirdrop.mockResolvedValue({ sig: 'sig123' })
    const wrapper = mountFaucet()
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('.app-notice--success').exists()).toBe(true)
    })
    expect(mocks.requestDevnetAirdrop).toHaveBeenCalledWith(ADDRESS, 1)
    expect(wrapper.emitted('funded')).toHaveLength(1)
  })

  it('shows a calm warning with the official faucet link when rate-limited', async () => {
    mocks.requestDevnetAirdrop.mockResolvedValue({ error: 'rate-limited' })
    const wrapper = mountFaucet()
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('.app-notice--warning').exists()).toBe(true)
    })
    const notice = wrapper.find('.app-notice--warning')
    expect(notice.text()).toContain('The free practice faucet is busy right now.')
    const link = notice.find('a[href="https://faucet.solana.com"]')
    expect(link.exists()).toBe(true)
    // No success notice, no funded event, no raw error text.
    expect(wrapper.find('.app-notice--success').exists()).toBe(false)
    expect(wrapper.emitted('funded')).toBeUndefined()
  })

  it('shows a calm warning with the official faucet link when unavailable', async () => {
    mocks.requestDevnetAirdrop.mockResolvedValue({ error: 'unavailable' })
    const wrapper = mountFaucet()
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('.app-notice--warning').exists()).toBe(true)
    })
    const notice = wrapper.find('.app-notice--warning')
    expect(notice.find('a[href="https://faucet.solana.com"]').exists()).toBe(true)
    expect(wrapper.emitted('funded')).toBeUndefined()
  })
})
