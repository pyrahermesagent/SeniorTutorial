import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, SolanaError } from '@solana/kit'
import type { Cluster } from '../../utils/cluster'
import { UnconfirmedBroadcastError } from '../../utils/wallets'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    account: ref<{ address: string } | null>(null),
    cluster: ref<Cluster>('devnet'),
    getBalance: vi.fn(async () => 1_000_000_000n), // 1 SOL
    sendInstructions: vi.fn(async () => '5VERFakesignaturefortests11111111111111111111111111111111111'),
    sendVersionedTransaction: vi.fn(
      async () => '4JUPFakesignaturefortests11111111111111111111111111111111111',
    ),
    markChallengeDone: vi.fn(),
  }
})

vi.mock('../../composables/useWallet', () => ({
  useWallet: () => ({
    account: mocks.account,
    sendInstructions: mocks.sendInstructions,
    sendVersionedTransaction: mocks.sendVersionedTransaction,
  }),
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

import SwapPage from '../../pages/challenges/swap.vue'

const WALLET = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

const walletButtonStub = {
  template: '<button type="button" class="wallet-button-stub">Connect wallet</button>',
}

function quotePayload() {
  return {
    inputMint: 'So11111111111111111111111111111111111111112',
    inAmount: '50000000',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    outAmount: '7420000',
    otherAmountThreshold: '7380000',
    swapMode: 'ExactIn',
    slippageBps: 50,
    routePlan: [],
  }
}

const fetchMock = vi.fn()

function stubJupiterFetch() {
  fetchMock.mockImplementation((input: unknown, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/quote')) {
      return Promise.resolve(new Response(JSON.stringify(quotePayload()), { status: 200 }))
    }
    if (url.includes('/swap') && init?.method === 'POST') {
      return Promise.resolve(
        new Response(JSON.stringify({ swapTransaction: 'AQAAAA==' }), { status: 200 }),
      )
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

async function mountConnected(cluster: Cluster) {
  mocks.cluster.value = cluster
  mocks.account.value = { address: WALLET }
  const wrapper = mount(SwapPage, { global: { stubs: { WalletButton: walletButtonStub } } })
  await flushPromises() // mount hooks reveal the connected UI; balance resolves
  return wrapper
}

async function fillAmount(wrapper: Awaited<ReturnType<typeof mountConnected>>, value: string) {
  await wrapper.find('#swap-amount').setValue(value)
}

function buttonByText(wrapper: Awaited<ReturnType<typeof mountConnected>>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text().includes(text))
  expect(button, `button containing "${text}" is rendered`).toBeDefined()
  return button!
}

async function toConfirmStep(wrapper: Awaited<ReturnType<typeof mountConnected>>) {
  await fillAmount(wrapper, '0.05')
  const cta = wrapper
    .findAll('button')
    .find((b) => /See the rate|Review this wrap/.test(b.text()))!
  expect(cta.attributes('disabled')).toBeUndefined()
  await cta.trigger('click')
  await flushPromises()
}

// The wrap builder derives the wSOL address with crypto.subtle, which settles
// on a macrotask — plain flushPromises (microtasks) can end the test before
// the send completes and leak markChallengeDone into the next test.
async function settle() {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
  }
}

describe('swap challenge page', () => {
  beforeEach(() => {
    mocks.account.value = null
    mocks.cluster.value = 'devnet'
    mocks.getBalance.mockReset()
    mocks.getBalance.mockResolvedValue(1_000_000_000n)
    mocks.sendInstructions.mockClear()
    mocks.sendVersionedTransaction.mockClear()
    mocks.markChallengeDone.mockClear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    stubJupiterFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the practice card on Devnet and never mentions a rate', async () => {
    const wrapper = await mountConnected('devnet')
    const text = wrapper.text()
    expect(text).toContain('Practice mode')
    expect(text).toContain('wrap SOL into wSOL — the same move swaps make under the hood')
    expect(text).not.toContain('See the rate')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the rate flow on Mainnet and no practice card', async () => {
    const wrapper = await mountConnected('mainnet-beta')
    const text = wrapper.text()
    expect(text).not.toContain('Practice mode')
    expect(buttonByText(wrapper, 'See the rate').exists()).toBe(true)
  })

  it('wraps on Devnet: review, confirm, on-chain wrap, done', async () => {
    const wrapper = await mountConnected('devnet')
    await toConfirmStep(wrapper)

    const review = wrapper.text()
    expect(review).toContain('You are wrapping 0.05 SOL into wSOL')
    expect(fetchMock).not.toHaveBeenCalled() // practice mode never talks to Jupiter

    await buttonByText(wrapper, 'Yes — wrap it now').trigger('click')
    await settle()

    expect(mocks.sendInstructions).toHaveBeenCalledTimes(1)
    const ixs = mocks.sendInstructions.mock.calls[0]![0] as unknown[]
    expect(ixs).toHaveLength(3)
    expect(mocks.sendVersionedTransaction).not.toHaveBeenCalled()
    expect(mocks.markChallengeDone).toHaveBeenCalledWith('swap')
    const done = wrapper.text()
    expect(done).toContain('Well done — it went through!')
    expect(done).toContain('exactly what a swap does with your SOL behind the scenes')
    // The recap closes by reassuring the learner that SOL → wSOL is fine on Devnet.
    expect(done).toContain('play money in a different envelope')
  })

  it('swaps on Mainnet: quote in plain English, confirm, done', async () => {
    const wrapper = await mountConnected('mainnet-beta')
    await fillAmount(wrapper, '0.05')
    await buttonByText(wrapper, 'See the rate').trigger('click')
    await flushPromises()

    // The quote went out for the right mints and amount.
    const [quoteUrl] = fetchMock.mock.calls[0]!
    expect(String(quoteUrl)).toContain('inputMint=So11111111111111111111111111111111111111112')
    expect(String(quoteUrl)).toContain('amount=50000000')

    const card = wrapper.text()
    expect(card).toContain(
      'Your 0.05 SOL buys about 7.42 USDC. You will receive at least 7.38 USDC.',
    )

    await buttonByText(wrapper, 'Yes — swap now').trigger('click')
    await settle()

    expect(mocks.sendVersionedTransaction).toHaveBeenCalledWith('AQAAAA==')
    expect(mocks.sendInstructions).not.toHaveBeenCalled()
    expect(mocks.markChallengeDone).toHaveBeenCalledWith('swap')
    const done = wrapper.text()
    expect(done).toContain('Well done — it went through!')
    expect(done).toContain('stablecoin')
    expect(done).toContain('your 0.05 SOL became about 7.42 USDC')
  })

  it('stays calm and shows no raw error when the quote cannot be fetched', async () => {
    fetchMock.mockReset()
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const wrapper = await mountConnected('mainnet-beta')
    await fillAmount(wrapper, '0.05')
    await buttonByText(wrapper, 'See the rate').trigger('click')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain(
      "We couldn't fetch a swap quote right now — please try again in a moment.",
    )
    expect(text).not.toContain('TypeError')
    expect(text).not.toContain('fetch failed')
    // Still on the form — the learner can simply try again.
    expect(buttonByText(wrapper, 'See the rate').exists()).toBe(true)
    expect(mocks.sendVersionedTransaction).not.toHaveBeenCalled()
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()
  })

  it('stays calm when the swap transaction cannot be prepared', async () => {
    const wrapper = await mountConnected('mainnet-beta')
    await fillAmount(wrapper, '0.05')
    await buttonByText(wrapper, 'See the rate').trigger('click')
    await flushPromises()
    fetchMock.mockReset()
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await buttonByText(wrapper, 'Yes — swap now').trigger('click')
    await settle()

    const text = wrapper.text()
    expect(text).toContain('We could not prepare this swap right now — nothing was sent.')
    expect(text).not.toContain('TypeError')
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()
  })

  it('after a cancel, retries only with a fresh quote — never a stale one', async () => {
    mocks.sendVersionedTransaction.mockRejectedValueOnce('rejected')
    const wrapper = await mountConnected('mainnet-beta')
    await fillAmount(wrapper, '0.05')
    await buttonByText(wrapper, 'See the rate').trigger('click')
    await flushPromises()
    await buttonByText(wrapper, 'Yes — swap now').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('You cancelled — nothing was sent.')
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()

    // Jupiter quotes expire, so "retry" is a fresh rate, not the old card.
    await buttonByText(wrapper, 'Go back and get a fresh rate').trigger('click')
    expect(buttonByText(wrapper, 'See the rate').exists()).toBe(true)

    fetchMock.mockClear()
    await buttonByText(wrapper, 'See the rate').trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1) // a brand-new quote was fetched
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/quote')
    expect(wrapper.text()).toContain('Your 0.05 SOL buys about 7.42 USDC')
  })

  it('restores the review card when the learner cancels a practice wrap', async () => {
    mocks.sendInstructions.mockRejectedValueOnce('rejected')
    const wrapper = await mountConnected('devnet')
    await toConfirmStep(wrapper)
    await buttonByText(wrapper, 'Yes — wrap it now').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('You cancelled — nothing was sent.')
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()
    // Practice wraps have no expiring quote: the review card comes back.
    await buttonByText(wrapper, 'Go back and try again').trigger('click')
    expect(wrapper.text()).toContain('You are wrapping 0.05 SOL into wSOL')
  })

  it('tells the truth when the practice wrap raced the blockhash expiry', async () => {
    // The signed wrap WAS broadcast; confirmation simply raced the blockhash
    // expiry. The copy must point at the wallet activity tab — never claim
    // "nothing was sent", which would invite a second wrap.
    mocks.sendInstructions.mockRejectedValueOnce(
      new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED),
    )
    const wrapper = await mountConnected('devnet')
    await toConfirmStep(wrapper)
    await buttonByText(wrapper, 'Yes — wrap it now').trigger('click')
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Your wrap was sent to the network')
    expect(text).toContain('taking longer than expected to confirm')
    expect(text).toContain('activity tab')
    expect(text).not.toContain('nothing was sent')
    expect(text).not.toContain('did not go through')
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()
  })

  it('never claims "nothing was sent" when the broadcast cannot be confirmed', async () => {
    mocks.sendVersionedTransaction.mockRejectedValueOnce(
      new UnconfirmedBroadcastError('5VERUncertainSignature1111111111111111111111111111', false),
    )
    const wrapper = await mountConnected('mainnet-beta')
    await fillAmount(wrapper, '0.05')
    await buttonByText(wrapper, 'See the rate').trigger('click')
    await flushPromises()
    await buttonByText(wrapper, 'Yes — swap now').trigger('click')
    await settle()

    const text = wrapper.text()
    expect(text).toContain("We sent your swap, but we couldn't confirm it yet.")
    expect(text).not.toContain('nothing was sent')
    expect(text).not.toContain('did not go through')
    // The signature is right there to check.
    const link = wrapper.find('a[href*="explorer.solana.com/tx/5VERUncertainSignature"]')
    expect(link.exists()).toBe(true)
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()

    await buttonByText(wrapper, 'Go back to the start').trigger('click')
    expect(buttonByText(wrapper, 'See the rate').exists()).toBe(true)
  })

  it('tells the truth when the network processed the swap and it failed', async () => {
    mocks.sendVersionedTransaction.mockRejectedValueOnce(
      new UnconfirmedBroadcastError('5VEROnChainFailure1111111111111111111111111111111', true),
    )
    const wrapper = await mountConnected('mainnet-beta')
    await fillAmount(wrapper, '0.05')
    await buttonByText(wrapper, 'See the rate').trigger('click')
    await flushPromises()
    await buttonByText(wrapper, 'Yes — swap now').trigger('click')
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Your swap reached the network but could not be completed.')
    expect(text).not.toContain('nothing was sent')
    expect(wrapper.find('a[href*="explorer.solana.com/tx/5VEROnChainFailure"]').exists()).toBe(true)
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()
  })
})
