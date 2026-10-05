import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Cluster } from '../../utils/cluster'
import type { ChallengeId, ProgressState } from '../../utils/progress'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    account: ref<{ address: string } | null>(null),
    progressState: ref<ProgressState>({ lessonsDone: [], challengesDone: [], quiz: {} }),
    cluster: ref<Cluster>('devnet'),
  }
})

vi.mock('../../composables/useWallet', () => ({
  useWallet: () => ({ account: mocks.account }),
}))

// The stub behaves like the real composable: isChallengeDone reads the state.
vi.mock('../../composables/useProgress', () => ({
  useProgress: () => ({
    state: mocks.progressState,
    isChallengeDone: (id: ChallengeId) => mocks.progressState.value.challengesDone.includes(id),
  }),
}))

vi.mock('../../composables/useSolana', () => ({
  useSolana: () => ({ cluster: mocks.cluster }),
}))

import ChallengeShell from '../../components/ChallengeShell.vue'

const ADDRESS = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

const walletButtonStub = {
  template: '<button type="button" class="wallet-button-stub">Connect wallet</button>',
}

function mountShell(slotContent = '<p class="challenge-ui">Challenge UI goes here</p>') {
  return mount(ChallengeShell, {
    props: { challenge: 'transfer', goal: 'Send a little SOL to another wallet.', estCost: 'less than a penny' },
    slots: { default: slotContent },
    global: { stubs: { WalletButton: walletButtonStub } },
  })
}

describe('ChallengeShell', () => {
  beforeEach(() => {
    mocks.account.value = null
    mocks.progressState.value = { lessonsDone: [], challengesDone: [], quiz: {} }
    mocks.cluster.value = 'devnet'
  })

  it('shows the connect notice and hides the slot when no wallet is connected', async () => {
    const wrapper = mountShell()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Connect your wallet to try this challenge.')
    expect(wrapper.find('.wallet-button-stub').exists()).toBe(true)
    expect(wrapper.find('.challenge-ui').exists()).toBe(false)
  })

  it('shows the slot instead of the notice when a wallet is connected', async () => {
    mocks.account.value = { address: ADDRESS }
    const wrapper = mountShell()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Connect your wallet to try this challenge.')
    expect(wrapper.find('.challenge-ui').exists()).toBe(true)
  })

  it('first paint matches the prerendered not-connected markup even with a wallet', () => {
    // Prerendered HTML always shows the connect prompt; the connected state
    // is revealed after mount (same settled pattern as NetworkToggle).
    mocks.account.value = { address: ADDRESS }
    const wrapper = mountShell()
    expect(wrapper.text()).toContain('Connect your wallet to try this challenge.')
    expect(wrapper.find('.challenge-ui').exists()).toBe(false)
  })

  it('shows the goal and estimated cost from props', () => {
    const wrapper = mountShell()
    expect(wrapper.text()).toContain('Send a little SOL to another wallet.')
    expect(wrapper.text()).toContain('less than a penny')
  })

  it('shows a completion tick for a finished challenge only after hydration', async () => {
    mocks.account.value = { address: ADDRESS }
    mocks.progressState.value = {
      lessonsDone: [],
      challengesDone: ['transfer'],
      quiz: {},
    }
    const wrapper = mountShell()
    // Pre-hydration: tick hidden so SSR markup is progress-free.
    expect(wrapper.find('.challenge-shell__done').exists()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.challenge-shell__done').exists()).toBe(true)
  })

  it('keeps the tick hidden for a challenge that is not done', async () => {
    mocks.account.value = { address: ADDRESS }
    const wrapper = mountShell()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.challenge-shell__done').exists()).toBe(false)
  })

  it('warns calmly on Mainnet but still shows the challenge UI', async () => {
    mocks.account.value = { address: ADDRESS }
    mocks.cluster.value = 'mainnet-beta'
    const wrapper = mountShell()
    await wrapper.vm.$nextTick()
    const warning = wrapper.find('.app-notice--warning')
    expect(warning.exists()).toBe(true)
    expect(warning.text().toLowerCase()).toContain('real money')
    expect(wrapper.find('.challenge-ui').exists()).toBe(true)
  })

  it('shows no Mainnet warning on Devnet', async () => {
    mocks.account.value = { address: ADDRESS }
    const wrapper = mountShell()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.app-notice--warning').exists()).toBe(false)
  })
})
