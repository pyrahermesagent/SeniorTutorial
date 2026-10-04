// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Wallet } from '@wallet-standard/base'
import {
  SOLANA_CHAIN_BY_CLUSTER,
  classifySendError,
  isSolanaStandardWallet,
  shortenAddress,
  walletDisplayName,
} from '../../utils/wallets'

function fakeWallet(features: Record<string, unknown>, name = 'Test Wallet'): Wallet {
  return {
    version: '1.0.0',
    name,
    icon: 'data:image/svg+xml;base64,AAAA',
    chains: ['solana:devnet'],
    features,
    accounts: [],
  } as Wallet
}

describe('isSolanaStandardWallet', () => {
  it('accepts a wallet with standard:connect and a solana feature', () => {
    const wallet = fakeWallet({
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [] }) },
      'solana:signTransaction': { version: '1.0.0' },
    })
    expect(isSolanaStandardWallet(wallet)).toBe(true)
  })

  it('accepts signAndSendTransaction as the solana feature', () => {
    const wallet = fakeWallet({
      'standard:connect': {},
      'solana:signAndSendTransaction': {},
    })
    expect(isSolanaStandardWallet(wallet)).toBe(true)
  })

  it('rejects a wallet without standard:connect', () => {
    const wallet = fakeWallet({ 'solana:signTransaction': {} })
    expect(isSolanaStandardWallet(wallet)).toBe(false)
  })

  it('rejects a wallet with connect but no solana feature', () => {
    const wallet = fakeWallet({
      'standard:connect': {},
      'standard:disconnect': {},
      'standard:events': {},
    })
    expect(isSolanaStandardWallet(wallet)).toBe(false)
  })

  it('rejects a non-solana (ethereum-style) wallet', () => {
    const wallet = fakeWallet({
      'standard:connect': {},
      'eip155:signTransaction': {},
    })
    expect(isSolanaStandardWallet(wallet)).toBe(false)
  })

  it.each([null, undefined, 'wallet', 42, {}])('rejects %j', (value) => {
    expect(isSolanaStandardWallet(value)).toBe(false)
  })
})

describe('walletDisplayName', () => {
  it('returns the wallet name', () => {
    expect(walletDisplayName(fakeWallet({ 'standard:connect': {} }, 'Solflare'))).toBe('Solflare')
  })

  it('falls back for missing or blank names', () => {
    expect(walletDisplayName(fakeWallet({}, ''))).toBe('Unknown wallet')
    expect(walletDisplayName(fakeWallet({}, '   '))).toBe('Unknown wallet')
    expect(walletDisplayName(null)).toBe('Unknown wallet')
  })
})

describe('shortenAddress', () => {
  it('keeps 4 characters on each side by default', () => {
    expect(shortenAddress('4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM')).toBe('4uQe…iofM')
  })

  it('returns short addresses unchanged', () => {
    expect(shortenAddress('4uQeVj5')).toBe('4uQeVj5')
  })

  it('returns empty string for empty input', () => {
    expect(shortenAddress('')).toBe('')
  })
})

describe('SOLANA_CHAIN_BY_CLUSTER', () => {
  it('maps app clusters to wallet-standard chain identifiers', () => {
    expect(SOLANA_CHAIN_BY_CLUSTER.devnet).toBe('solana:devnet')
    expect(SOLANA_CHAIN_BY_CLUSTER['mainnet-beta']).toBe('solana:mainnet')
  })
})

describe('classifySendError', () => {
  it('maps code 4001 to rejected', () => {
    expect(classifySendError({ code: 4001, message: 'User rejected the request.' })).toBe(
      'rejected',
    )
  })

  it('maps WalletSignTransactionError-style names to rejected', () => {
    const signError = new Error('User rejected')
    signError.name = 'WalletSignTransactionError'
    expect(classifySendError(signError)).toBe('rejected')

    const sendError = new Error('User rejected')
    sendError.name = 'WalletSendTransactionError'
    expect(classifySendError(sendError)).toBe('rejected')

    const signAndSendError = new Error('User rejected')
    signAndSendError.name = 'WalletSignAndSendTransactionError'
    expect(classifySendError(signAndSendError)).toBe('rejected')
  })

  it('maps user-rejection and cancellation names to rejected', () => {
    const rejected = new Error('no')
    rejected.name = 'UserRejectedRequestError'
    expect(classifySendError(rejected)).toBe('rejected')

    const cancelled = new Error('no')
    cancelled.name = 'SolanaMobileWalletAdapterError: ERROR_ASSOCIATION_CANCELLED'
    expect(classifySendError(cancelled)).toBe('rejected')
  })

  it('maps a generic error to failed', () => {
    expect(classifySendError(new Error('network down'))).toBe('failed')
  })

  it.each([null, undefined, 'boom', 42])('maps %j to failed', (value) => {
    expect(classifySendError(value)).toBe('failed')
  })
})
