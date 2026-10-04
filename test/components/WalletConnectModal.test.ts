import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { StandardWalletInfo } from '../../utils/wallets'

const mocks = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    wallets: ref<StandardWalletInfo[]>([]),
    account: ref<{ address: string; label?: string } | null>(null),
    connecting: ref(false),
    connect: vi.fn<(name?: string) => Promise<void>>().mockResolvedValue(undefined),
    disconnect: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    sendInstructions: vi.fn(),
  }
})

vi.mock('../../composables/useWallet', () => ({
  useWallet: () => mocks,
}))

import WalletConnectModal from '../../components/WalletConnectModal.vue'

function solanaWallet(name: string, icon?: string): StandardWalletInfo {
  return {
    name,
    icon,
    wallet: {
      version: '1.0.0',
      name,
      chains: ['solana:devnet'],
      features: { 'standard:connect': {}, 'solana:signTransaction': {} },
      accounts: [],
    } as unknown as StandardWalletInfo['wallet'],
  }
}

describe('WalletConnectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.wallets.value = []
    mocks.account.value = null
    mocks.connecting.value = false
  })

  it('renders nothing when closed', () => {
    const wrapper = mount(WalletConnectModal, { props: { open: true } })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    const closed = mount(WalletConnectModal, { props: { open: false } })
    expect(closed.find('[role="dialog"]').exists()).toBe(false)
  })

  it('shows install links instead of an empty list when no wallet is detected', () => {
    const wrapper = mount(WalletConnectModal, { props: { open: true } })
    expect(wrapper.text()).toContain('No wallet found on this device')

    const solflare = wrapper.find('a[href*="solflare"]')
    const phantom = wrapper.find('a[href*="phantom"]')
    expect(solflare.exists()).toBe(true)
    expect(phantom.exists()).toBe(true)
    expect(solflare.attributes('target')).toBe('_blank')
    expect(phantom.attributes('rel')).toContain('noopener')

    // Review focus: must NOT render an empty wallet list.
    expect(wrapper.find('.wallet-row').exists()).toBe(false)
    expect(wrapper.find('.wallet-modal__list').exists()).toBe(false)
  })

  it('lists detected wallets with name and icon', () => {
    mocks.wallets.value = [
      solanaWallet('Solflare', 'data:image/svg+xml;base64,AAAA'),
      solanaWallet('Phantom'),
    ]
    const wrapper = mount(WalletConnectModal, { props: { open: true } })
    const rows = wrapper.findAll('.wallet-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Solflare')
    expect(rows[1]!.text()).toContain('Phantom')
    expect(rows[0]!.find('img').exists()).toBe(true)
  })

  it('connects with the chosen wallet and closes', async () => {
    mocks.wallets.value = [solanaWallet('Solflare'), solanaWallet('Phantom')]
    const wrapper = mount(WalletConnectModal, { props: { open: true } })
    await wrapper.findAll('.wallet-row')[1]!.trigger('click')
    expect(mocks.connect).toHaveBeenCalledWith('Phantom')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('stays open without an error notice when the user cancels connecting', async () => {
    mocks.connect.mockRejectedValueOnce('rejected')
    mocks.wallets.value = [solanaWallet('Solflare')]
    const wrapper = mount(WalletConnectModal, { props: { open: true } })
    await wrapper.find('.wallet-row').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.find('.app-notice--warning').exists()).toBe(false)
  })

  it('shows a warning notice when connecting fails for other reasons', async () => {
    mocks.connect.mockRejectedValueOnce(new Error('boom'))
    mocks.wallets.value = [solanaWallet('Solflare')]
    const wrapper = mount(WalletConnectModal, { props: { open: true } })
    await wrapper.find('.wallet-row').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.find('.app-notice--warning').exists()).toBe(true)
  })

  it('closes on backdrop click', async () => {
    const wrapper = mount(WalletConnectModal, { props: { open: true } })
    await wrapper.find('.wallet-modal').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes on Escape', async () => {
    const wrapper = mount(WalletConnectModal, { props: { open: true }, attachTo: document.body })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})
