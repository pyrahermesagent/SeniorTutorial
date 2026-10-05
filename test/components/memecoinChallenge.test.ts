import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Cluster } from '../../utils/cluster'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    account: ref<{ address: string } | null>(null),
    cluster: ref<Cluster>('devnet'),
    getBalance: vi.fn(async () => 1_000_000_000n), // 1 SOL
    sendInstructions: vi.fn(async () => '5COINFakesignaturefortests1111111111111111111111111111111111'),
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

import MemecoinPage from '../../pages/challenges/memecoin.vue'

const WALLET = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

const walletButtonStub = {
  template: '<button type="button" class="wallet-button-stub">Connect wallet</button>',
}

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

async function mountConnected() {
  mocks.account.value = { address: WALLET }
  const wrapper = mount(MemecoinPage, {
    global: { stubs: { WalletButton: walletButtonStub, NuxtLink: nuxtLinkStub } },
  })
  await flushPromises() // mount hooks reveal the connected UI; balance resolves
  return wrapper
}

describe('memecoin challenge page', () => {
  beforeEach(() => {
    mocks.account.value = null
    mocks.cluster.value = 'devnet'
    mocks.getBalance.mockReset()
    mocks.getBalance.mockResolvedValue(1_000_000_000n)
    mocks.sendInstructions.mockClear()
    mocks.markChallengeDone.mockClear()
  })

  it('captions the preview: name and symbol live on-chain, the picture lives in the app', async () => {
    const wrapper = await mountConnected()
    const form = wrapper.find('.memecoin__form')
    expect(form.exists()).toBe(true)
    const preview = form.find('.memecoin__preview')
    expect(preview.exists()).toBe(true)
    // The calm caption sits right under the preview, before any problem line.
    const caption = preview.element.nextElementSibling
    expect(caption?.textContent).toContain('the picture lives here in the app')
    expect(caption?.textContent).toContain('200 characters')
    expect(form.text()).toContain(
      'On Solana your coin keeps its name and symbol — the picture lives here in the app.',
    )
  })
})
