import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Cluster } from '../../utils/cluster'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    cluster: ref<Cluster>('devnet'),
  }
})

vi.mock('../../composables/useSolana', () => ({
  useSolana: () => mocks,
}))

import TxStatus from '../../components/TxStatus.vue'

const SIGNATURE = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'

function mountTxStatus(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return mount(TxStatus, { props, slots })
}

describe('TxStatus', () => {
  beforeEach(() => {
    mocks.cluster.value = 'devnet'
  })

  it('renders nothing while idle', () => {
    const wrapper = mountTxStatus({ state: 'idle' })
    expect(wrapper.text()).toBe('')
    expect(wrapper.html()).not.toContain('tx-status')
  })

  it('announces progress states politely with the pinned copy', () => {
    const expectations: [string, string][] = [
      ['building', 'Preparing…'],
      ['awaiting-signature', 'Please check your wallet — it is asking you to approve this.'],
      ['sending', 'Sending…'],
      ['confirming', 'Almost done — confirming…'],
    ]
    for (const [state, copy] of expectations) {
      const wrapper = mountTxStatus({ state })
      const status = wrapper.find('[aria-live="polite"]')
      expect(status.exists(), `${state} has aria-live="polite"`).toBe(true)
      expect(wrapper.text(), `${state} copy`).toContain(copy)
    }
  })

  it('links a success to the devnet explorer with the signature', () => {
    const wrapper = mountTxStatus({ state: 'success', signature: SIGNATURE })
    const link = wrapper.find('a[href*="explorer.solana.com"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(
      `https://explorer.solana.com/tx/${SIGNATURE}?cluster=devnet`,
    )
    expect(link.attributes('href')).toContain(SIGNATURE)
    expect(link.attributes('href')).toContain('?cluster=devnet')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('omits the cluster param on mainnet', () => {
    mocks.cluster.value = 'mainnet-beta'
    const wrapper = mountTxStatus({ state: 'success', signature: SIGNATURE })
    const link = wrapper.find('a[href*="explorer.solana.com"]')
    expect(link.attributes('href')).toBe(`https://explorer.solana.com/tx/${SIGNATURE}`)
    expect(link.attributes('href')).not.toContain('cluster=')
  })

  it('shows calm cancelled copy with no technical error text, plus the retry slot', () => {
    const wrapper = mountTxStatus(
      { state: 'cancelled', error: '0x1 custom program error: insufficient funds' },
      { retry: '<button type="button">Try again</button>' },
    )
    expect(wrapper.text()).toContain('You cancelled — nothing was sent.')
    expect(wrapper.text()).not.toContain('0x1')
    expect(wrapper.text()).not.toContain('custom program error')
    expect(wrapper.text()).not.toContain('insufficient funds')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    const retry = wrapper.findAll('button').find((b) => b.text() === 'Try again')
    expect(retry, 'retry slot button').toBeDefined()
  })

  it('shows the failed message plainly with the support hint', () => {
    const wrapper = mountTxStatus({
      state: 'failed',
      error: 'The network is busy right now.',
    })
    expect(wrapper.text()).toContain('The network is busy right now.')
    expect(wrapper.text()).toContain(
      'If this keeps happening, try again later or switch to Devnet to practice.',
    )
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
})
