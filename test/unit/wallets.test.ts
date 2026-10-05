// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { getBase58Decoder } from '@solana/kit'
import {
  SOLANA_CHAIN_BY_CLUSTER,
  classifySendError,
  isSolanaStandardWallet,
  sendVersionedTransactionViaWallet,
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

  it('maps user-rejection names to rejected', () => {
    const rejected = new Error('no')
    rejected.name = 'UserRejectedRequestError'
    expect(classifySendError(rejected)).toBe('rejected')
  })

  // Fixtures below mirror the real error classes in
  // @solana-mobile/mobile-wallet-adapter-protocol (lib/esm/index.browser.js):
  // both set `name` to the class name; the adapter error carries a string
  // constant code, the protocol error a numeric one.
  function mwaError(code: string): Error & { code: string } {
    return Object.assign(new Error('cancelled'), {
      name: 'SolanaMobileWalletAdapterError',
      code,
    })
  }

  function mwaProtocolError(code: number): Error & { code: number } {
    return Object.assign(new Error('protocol error'), {
      name: 'SolanaMobileWalletAdapterProtocolError',
      code,
    })
  }

  it('maps a real MWA association cancellation to rejected', () => {
    expect(classifySendError(mwaError('ERROR_ASSOCIATION_CANCELLED'))).toBe('rejected')
  })

  it('maps an MWA authorization decline (protocol code -1) to rejected', () => {
    expect(classifySendError(mwaProtocolError(-1))).toBe('rejected')
  })

  it.each([-2, -3, -4, -5, -100])('maps MWA protocol code %i to failed', (code) => {
    expect(classifySendError(mwaProtocolError(code))).toBe('failed')
  })

  it.each(['ERROR_SESSION_CLOSED', 'ERROR_WALLET_NOT_FOUND', 'ERROR_SESSION_TIMEOUT'])(
    'maps non-cancellation MWA code %s to failed',
    (code) => {
      expect(classifySendError(mwaError(code))).toBe('failed')
    },
  )

  it('maps a generic error to failed', () => {
    expect(classifySendError(new Error('network down'))).toBe('failed')
  })

  it.each([null, undefined, 'boom', 42])('maps %j to failed', (value) => {
    expect(classifySendError(value)).toBe('failed')
  })
})


function fakeWalletAccount(): WalletAccount {
  return {
    address: '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM',
    publicKey: new Uint8Array(32),
    chains: ['solana:mainnet'],
    features: [],
  } as unknown as WalletAccount
}

// A tiny fixed payload standing in for a DEX-built versioned transaction:
// base64 for the 8 bytes 01 02 03 04 05 06 07 08.
const TX_BASE64 = 'AQIDBAUGBwg='

describe('sendVersionedTransactionViaWallet', () => {
  it('prefers signAndSendTransaction and returns the base58 signature', async () => {
    const signatureBytes = new Uint8Array(64).fill(7)
    const expected = getBase58Decoder().decode(signatureBytes)
    const signAndSend = {
      signAndSendTransaction: vi.fn(async () => [{ signature: signatureBytes }]),
    }
    const sendSignedTransaction = vi.fn(async () => 'unused')
    const result = await sendVersionedTransactionViaWallet({
      signAndSend,
      account: fakeWalletAccount(),
      chain: 'solana:mainnet',
      transactionBase64: TX_BASE64,
      sendSignedTransaction,
    })
    expect(result).toBe(expected)
    expect(signAndSend.signAndSendTransaction).toHaveBeenCalledTimes(1)
    const [input] = signAndSend.signAndSendTransaction.mock.calls[0]!
    expect(input.chain).toBe('solana:mainnet')
    expect(input.options).toEqual({ commitment: 'confirmed' })
    // The base64 tx must arrive at the wallet as its original bytes.
    expect(Array.from(input.transaction)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(sendSignedTransaction).not.toHaveBeenCalled()
  })

  it('falls back to signTransaction plus the RPC send callback', async () => {
    const signedBytes = new Uint8Array([9, 8, 7])
    const sign = {
      signTransaction: vi.fn(async () => [{ signedTransaction: signedBytes }]),
    }
    const sendSignedTransaction = vi.fn(async () => '5VERFake')
    const result = await sendVersionedTransactionViaWallet({
      sign,
      account: fakeWalletAccount(),
      chain: 'solana:mainnet',
      transactionBase64: TX_BASE64,
      sendSignedTransaction,
    })
    expect(sign.signTransaction).toHaveBeenCalledTimes(1)
    // The wallet's signed bytes are what goes to the network, not the draft.
    expect(sendSignedTransaction).toHaveBeenCalledWith(signedBytes)
    expect(result).toBe('5VERFake')
  })

  it('refuses when the wallet has neither feature', async () => {
    await expect(
      sendVersionedTransactionViaWallet({
        account: fakeWalletAccount(),
        chain: 'solana:mainnet',
        transactionBase64: TX_BASE64,
        sendSignedTransaction: vi.fn(),
      }),
    ).rejects.toThrow('cannot sign Solana transactions')
  })

  it('throws when the wallet returns no signature', async () => {
    const signAndSend = {
      signAndSendTransaction: vi.fn(async () => [] as readonly { signature: Uint8Array }[]),
    }
    await expect(
      sendVersionedTransactionViaWallet({
        signAndSend,
        account: fakeWalletAccount(),
        chain: 'solana:mainnet',
        transactionBase64: TX_BASE64,
        sendSignedTransaction: vi.fn(),
      }),
    ).rejects.toThrow('did not return a signature')
  })

  it('lets the wallet rejection error bubble up for the caller to classify', async () => {
    const rejection = new Error('denied')
    rejection.name = 'WalletSignTransactionError'
    const signAndSend = {
      signAndSendTransaction: vi.fn(async () => {
        throw rejection
      }),
    }
    const sendSignedTransaction = vi.fn()
    await expect(
      sendVersionedTransactionViaWallet({
        signAndSend,
        account: fakeWalletAccount(),
        chain: 'solana:mainnet',
        transactionBase64: TX_BASE64,
        sendSignedTransaction,
      }),
    ).rejects.toBe(rejection)
    expect(sendSignedTransaction).not.toHaveBeenCalled()
    // …and the existing classifier agrees it is a rejection.
    expect(classifySendError(rejection)).toBe('rejected')
  })
})
