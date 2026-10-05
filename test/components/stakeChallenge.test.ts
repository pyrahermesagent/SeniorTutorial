import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Cluster } from '../../utils/cluster'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    account: ref<{ address: string } | null>(null),
    cluster: ref<Cluster>('devnet'),
    getBalance: vi.fn(async () => 2_000_000_000n), // 2 SOL
    sendInstructions: vi.fn(async () => '5STKFakesignaturefortests11111111111111111111111111111111111'),
    markChallengeDone: vi.fn(),
  }
})

vi.mock('../../composables/useWallet', () => ({
  useWallet: () => ({ account: mocks.account, sendInstructions: mocks.sendInstructions }),
}))

vi.mock('../../composables/useSolana', () => ({
  useSolana: () => ({ cluster: mocks.cluster, getBalance: mocks.getBalance }),
}))

vi.mock('../../composables/useProgress', () => ({
  useProgress: () => ({
    isChallengeDone: () => false,
    markChallengeDone: mocks.markChallengeDone,
  }),
}))

import StakePage from '../../pages/challenges/stake.vue'

const WALLET = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

const walletButtonStub = {
  template: '<button type="button" class="wallet-button-stub">Connect wallet</button>',
}

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

async function mountConnected(cluster: Cluster) {
  mocks.cluster.value = cluster
  mocks.account.value = { address: WALLET }
  const wrapper = mount(StakePage, {
    global: { stubs: { WalletButton: walletButtonStub, NuxtLink: nuxtLinkStub } },
  })
  await flushPromises() // mount hooks reveal the connected UI; balance resolves
  return wrapper
}

describe('stake challenge page', () => {
  beforeEach(() => {
    mocks.account.value = null
    mocks.cluster.value = 'devnet'
    mocks.getBalance.mockReset()
    mocks.getBalance.mockResolvedValue(2_000_000_000n)
    mocks.sendInstructions.mockClear()
    mocks.markChallengeDone.mockClear()
  })

  async function typeAmount(wrapper: Awaited<ReturnType<typeof mountConnected>>, value: string) {
    await wrapper.find('#stake-amount').setValue(value)
  }

  it('points a Devnet balance shortage at the free faucet, two drips if needed', async () => {
    // 1 SOL exactly cannot cover 1 SOL stake + rent reserve + fee.
    mocks.getBalance.mockResolvedValue(1_000_000_000n)
    const wrapper = await mountConnected('devnet')
    await typeAmount(wrapper, '1')

    expect(wrapper.find('[role="alert"]').text()).toContain('does not have quite enough SOL')
    const hint = wrapper.text()
    expect(hint).toContain('On the practice network, use the faucet on the')
    expect(hint).toContain('you may need two free drips')
    expect(wrapper.find('.stake__form a[href="/start"]').exists()).toBe(true)
  })

  it('keeps the faucet hint off Mainnet, where a shortage is real money', async () => {
    mocks.getBalance.mockResolvedValue(1_000_000_000n)
    const wrapper = await mountConnected('mainnet-beta')
    await typeAmount(wrapper, '1')

    expect(wrapper.find('.stake__hint[role="alert"]').text()).toContain(
      'does not have quite enough SOL',
    )
    expect(wrapper.text()).not.toContain('two free drips')
  })

  it('stays quiet on Devnet when the balance comfortably covers the stake', async () => {
    const wrapper = await mountConnected('devnet')
    await typeAmount(wrapper, '1')

    expect(wrapper.find('.stake__hint[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('two free drips')
  })

  it('stays quiet on Devnet for a non-shortage problem like a sub-minimum amount', async () => {
    mocks.getBalance.mockResolvedValue(1_000_000_000n)
    const wrapper = await mountConnected('devnet')
    await typeAmount(wrapper, '0.5')

    expect(wrapper.find('.stake__hint[role="alert"]').text()).toContain('at least 1 SOL')
    expect(wrapper.text()).not.toContain('two free drips')
  })
})
