import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Cluster } from '../../utils/cluster'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    account: ref<{ address: string } | null>(null),
    cluster: ref<Cluster>('devnet'),
    getBalance: vi.fn(async () => 1_000_000_000n), // 1 SOL
    sendInstructions: vi.fn(async () => '5VERFakesignaturefortests11111111111111111111111111111111111'),
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

import TransferPage from '../../pages/challenges/transfer.vue'

const WALLET = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'
const RECIPIENT = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi'

const walletButtonStub = {
  template: '<button type="button" class="wallet-button-stub">Connect wallet</button>',
}

async function mountConnected() {
  mocks.account.value = { address: WALLET }
  const wrapper = mount(TransferPage, { global: { stubs: { WalletButton: walletButtonStub } } })
  await flushPromises() // mount hooks reveal the connected UI; balance resolves
  return wrapper
}

async function fillForm(wrapper: Awaited<ReturnType<typeof mountConnected>>, to: string, amount: string) {
  await wrapper.find('#transfer-recipient').setValue(to)
  await wrapper.find('#transfer-amount').setValue(amount)
}

function reviewButton(wrapper: Awaited<ReturnType<typeof mountConnected>>) {
  const button = wrapper.findAll('button').find((b) => b.text().includes('Review this transfer'))
  expect(button, 'review button is rendered').toBeDefined()
  return button!
}

describe('transfer challenge page', () => {
  beforeEach(() => {
    mocks.account.value = null
    mocks.cluster.value = 'devnet'
    mocks.getBalance.mockReset()
    mocks.getBalance.mockResolvedValue(1_000_000_000n)
    mocks.sendInstructions.mockClear()
    mocks.markChallengeDone.mockClear()
  })

  it('nudges a mistyped address in plain words and keeps Review disabled', async () => {
    const wrapper = await mountConnected()
    await fillForm(wrapper, 'not-an-address', '0.01')
    expect(wrapper.text()).toContain('wallet address does not look quite right')
    expect(wrapper.find('[role="alert"]').text()).toContain('address')
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('explains the minimum amount for a dust transfer', async () => {
    const wrapper = await mountConnected()
    await fillForm(wrapper, RECIPIENT, '0.0005')
    expect(wrapper.find('[role="alert"]').text()).toContain('at least 0.001 SOL')
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('explains when the balance cannot cover the amount plus the fee', async () => {
    mocks.getBalance.mockResolvedValue(10_000_000n) // exactly 0.01 SOL
    const wrapper = await mountConnected()
    await fillForm(wrapper, RECIPIENT, '0.01')
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'does not have quite enough SOL for this amount plus the tiny network fee',
    )
    expect(reviewButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('warns (without blocking) when sending to your own address', async () => {
    const wrapper = await mountConnected()
    await fillForm(wrapper, WALLET, '0.01')
    const warning = wrapper.find('.app-notice--warning')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain('your own wallet address')
    expect(reviewButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('reviews valid input in plain English, then confirms through to success', async () => {
    const wrapper = await mountConnected()
    await fillForm(wrapper, RECIPIENT, '0.01')
    expect(reviewButton(wrapper).attributes('disabled')).toBeUndefined()

    await reviewButton(wrapper).trigger('click')
    const summary = wrapper.text()
    expect(summary).toContain(
      'You are sending 0.01 SOL to the wallet starting with 4vJ9…kLKi. Transfers cannot be undone — check the address twice.',
    )
    expect(summary).toContain(RECIPIENT)

    const confirm = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Yes — send it now'))
    expect(confirm, 'confirm button is rendered').toBeDefined()
    await confirm!.trigger('click')
    await flushPromises()

    expect(mocks.sendInstructions).toHaveBeenCalledTimes(1)
    const ixs = mocks.sendInstructions.mock.calls[0]![0] as unknown[]
    expect(ixs).toHaveLength(1)
    expect(mocks.markChallengeDone).toHaveBeenCalledWith('transfer')
    expect(wrapper.text()).toContain('Well done — it went through!')
    expect(wrapper.text()).toContain(
      'You just moved money on Solana — no bank involved, settled in under a second.',
    )
  })

  it('restores the review step when the learner cancels in their wallet', async () => {
    // The real composable throws the literal string 'rejected' when the
    // learner says no in their wallet — mirror that exactly.
    mocks.sendInstructions.mockRejectedValueOnce('rejected')
    const wrapper = await mountConnected()
    await fillForm(wrapper, RECIPIENT, '0.01')
    await reviewButton(wrapper).trigger('click')
    const confirm = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Yes — send it now'))!
    await confirm.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('You cancelled — nothing was sent.')
    const retry = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Go back and check the details'))
    expect(retry, 'retry button inside TxStatus').toBeDefined()
    await retry!.trigger('click')
    expect(wrapper.text()).toContain('You are sending 0.01 SOL to the wallet starting with')
    expect(mocks.markChallengeDone).not.toHaveBeenCalled()
  })
})
