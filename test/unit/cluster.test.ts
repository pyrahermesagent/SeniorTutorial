// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CLUSTERS,
  explorerAddressUrl,
  explorerTxUrl,
  formatSol,
  isValidSolanaAddress,
  parseSolToLamports,
  type Cluster,
} from '../../utils/cluster'
import type { ProgressState } from '../../utils/progress'

vi.mock('../../composables/useProgress', async () => {
  const { ref } = await import('vue')
  const state = ref<ProgressState>({ lessonsDone: [], challengesDone: [], quiz: {} })
  return {
    useProgress: () => ({
      state,
      setCluster: (cluster: Cluster) => {
        state.value = { ...state.value, cluster }
      },
    }),
  }
})

import { useSolana } from '../../composables/useSolana'

const GOOD_ADDRESS = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'
const FAKE_SIG =
  '5j7s6KJSNKSJREfhbnzY5kE3cHk1dRrTYWZovfKebYW3nqC3N3zJ3a1NqtPb8VYjL3pQGV4eQ6hEBGZjFkPMzWqE'

type JsonRpcHandler = (payload: { id: unknown; method: string }) =>
  | { ok: true; result: unknown }
  | { ok: false; status: number; statusText: string }

function stubRpcFetch(handler: JsonRpcHandler) {
  vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
    const payload = JSON.parse(init.body)
    const res = handler(payload)
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        statusText: res.statusText,
        headers: new Headers(),
      }
    }
    const body = JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: res.result })
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      text: async () => body,
    }
  })
}

describe('CLUSTERS', () => {
  it('describes mainnet-beta and devnet with their public endpoints', () => {
    expect(CLUSTERS['mainnet-beta'].rpcUrl).toBe('https://api.mainnet-beta.solana.com')
    expect(CLUSTERS.devnet.rpcUrl).toBe('https://api.devnet.solana.com')
    expect(CLUSTERS.devnet.faucetUrl).toBe('https://faucet.solana.com')
  })
})

describe('explorerTxUrl', () => {
  it('appends ?cluster=devnet for devnet transactions', () => {
    expect(explorerTxUrl('sig123', 'devnet')).toBe(
      'https://explorer.solana.com/tx/sig123?cluster=devnet',
    )
  })

  it('adds no query param for mainnet transactions', () => {
    expect(explorerTxUrl('sig123', 'mainnet-beta')).toBe(
      'https://explorer.solana.com/tx/sig123',
    )
  })
})

describe('explorerAddressUrl', () => {
  it('appends ?cluster=devnet for devnet addresses', () => {
    expect(explorerAddressUrl(GOOD_ADDRESS, 'devnet')).toBe(
      `https://explorer.solana.com/address/${GOOD_ADDRESS}?cluster=devnet`,
    )
  })

  it('adds no query param for mainnet addresses', () => {
    expect(explorerAddressUrl(GOOD_ADDRESS, 'mainnet-beta')).toBe(
      `https://explorer.solana.com/address/${GOOD_ADDRESS}`,
    )
  })
})

describe('formatSol', () => {
  it('formats 1.5 SOL and trims trailing zeros', () => {
    expect(formatSol(1_500_000_000n)).toBe('1.5')
  })

  it('formats whole SOL without a decimal point', () => {
    expect(formatSol(2_000_000_000n)).toBe('2')
  })

  it('formats zero', () => {
    expect(formatSol(0n)).toBe('0')
  })

  it('truncates beyond maxDecimals instead of rounding', () => {
    expect(formatSol(1_234_567_890n, 4)).toBe('1.2345')
  })

  it('keeps small fractional amounts', () => {
    expect(formatSol(40_000_000n)).toBe('0.04')
  })
})

describe('parseSolToLamports', () => {
  it('parses a fractional amount', () => {
    expect(parseSolToLamports('0.001')).toBe(1_000_000n)
  })

  it('parses a whole amount', () => {
    expect(parseSolToLamports('2')).toBe(2_000_000_000n)
  })

  it('parses down to 9 decimal places', () => {
    expect(parseSolToLamports('0.000000001')).toBe(1n)
  })

  it.each(['abc', '-1', '0.0000000001', '', '1.2.3'])('returns null for %j', (input) => {
    expect(parseSolToLamports(input)).toBeNull()
  })
})

describe('isValidSolanaAddress', () => {
  it('accepts a real-looking base58 address', () => {
    expect(isValidSolanaAddress(GOOD_ADDRESS)).toBe(true)
  })

  it('accepts the system program address', () => {
    expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true)
  })

  it.each(['hello', '', 'not an address!'])('rejects %j', (input) => {
    expect(isValidSolanaAddress(input)).toBe(false)
  })
})

describe('useSolana', () => {
  beforeEach(() => {
    stubRpcFetch(() => ({ ok: true, result: FAKE_SIG }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to devnet when no cluster is stored', () => {
    const { cluster } = useSolana()
    expect(cluster.value).toBe('devnet')
  })

  it('persists cluster changes through useProgress', () => {
    const { cluster, setCluster } = useSolana()
    setCluster('mainnet-beta')
    expect(cluster.value).toBe('mainnet-beta')
    setCluster('devnet')
    expect(cluster.value).toBe('devnet')
  })

  it('returns the balance in lamports', async () => {
    stubRpcFetch(() => ({ ok: true, result: { context: { slot: 1 }, value: 1_500_000_000 } }))
    const { getBalance } = useSolana()
    await expect(getBalance(GOOD_ADDRESS)).resolves.toBe(1_500_000_000n)
  })

  it('returns the airdrop signature on success', async () => {
    const { requestDevnetAirdrop } = useSolana()
    await expect(requestDevnetAirdrop(GOOD_ADDRESS, 0.5)).resolves.toEqual({ sig: FAKE_SIG })
  })

  it('requests the parsed lamports amount', async () => {
    let seenParams: unknown
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      const payload = JSON.parse(init.body)
      seenParams = payload.params
      const body = JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: FAKE_SIG })
      return { ok: true, status: 200, statusText: 'OK', headers: new Headers(), text: async () => body }
    })
    const { requestDevnetAirdrop } = useSolana()
    await requestDevnetAirdrop(GOOD_ADDRESS, 0.001)
    expect(seenParams).toEqual([GOOD_ADDRESS, 1_000_000, { commitment: 'confirmed' }])
  })

  it('maps an HTTP 429 to rate-limited', async () => {
    stubRpcFetch(() => ({ ok: false, status: 429, statusText: 'Too Many Requests' }))
    const { requestDevnetAirdrop } = useSolana()
    await expect(requestDevnetAirdrop(GOOD_ADDRESS, 1)).resolves.toEqual({
      error: 'rate-limited',
    })
  })

  it('maps other HTTP failures to unavailable', async () => {
    stubRpcFetch(() => ({ ok: false, status: 500, statusText: 'Internal Server Error' }))
    const { requestDevnetAirdrop } = useSolana()
    await expect(requestDevnetAirdrop(GOOD_ADDRESS, 1)).resolves.toEqual({
      error: 'unavailable',
    })
  })

  it('maps a network failure to unavailable', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed')
    })
    const { requestDevnetAirdrop } = useSolana()
    await expect(requestDevnetAirdrop(GOOD_ADDRESS, 1)).resolves.toEqual({
      error: 'unavailable',
    })
  })
})
