// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  JUPITER_API_BASE,
  JupiterError,
  SOL_MINT,
  USDC_MAINNET_MINT,
  fetchQuote,
  fetchSwapTransaction,
  formatUsdc,
} from '../../utils/jupiter'

const QUOTE_PARAMS = {
  inputMint: SOL_MINT,
  outputMint: USDC_MAINNET_MINT,
  amountLamports: 10_000_000n, // 0.01 SOL
  slippageBps: 50,
}

// Trimmed but faithful copy of a real api.jup.ag/swap/v1/quote response.
function quoteResponsePayload() {
  return {
    inputMint: SOL_MINT,
    inAmount: '10000000',
    outputMint: USDC_MAINNET_MINT,
    outAmount: '1205183',
    otherAmountThreshold: '1199158',
    swapMode: 'ExactIn',
    slippageBps: 50,
    platformFee: null,
    priceImpactPct: '0',
    routePlan: [{ percent: 100 }],
  }
}

function okJson(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchQuote', () => {
  it('requests the quote with both mints, the lamports amount, and the slippage', async () => {
    fetchMock.mockResolvedValue(okJson(quoteResponsePayload()))
    await fetchQuote(QUOTE_PARAMS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]!
    expect(url).toContain(`${JUPITER_API_BASE}/quote`)
    expect(url).toContain(`inputMint=${SOL_MINT}`)
    expect(url).toContain(`outputMint=${USDC_MAINNET_MINT}`)
    expect(url).toContain('amount=10000000')
    expect(url).toContain('slippageBps=50')
  })

  it('maps outAmount and otherAmountThreshold onto the quote', async () => {
    fetchMock.mockResolvedValue(okJson(quoteResponsePayload()))
    const quote = await fetchQuote(QUOTE_PARAMS)
    expect(quote.outAmount).toBe('1205183')
    expect(quote.otherAmountThreshold).toBe('1199158')
    // The raw response travels along so the swap POST can echo it back.
    expect(quote.quoteResponse).toEqual(quoteResponsePayload())
  })

  it('throws an unavailable JupiterError on a non-OK response', async () => {
    fetchMock.mockResolvedValue(new Response('rate limited', { status: 429 }))
    const failure = await fetchQuote(QUOTE_PARAMS).catch((error) => error)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
    // The raw status detail must not leak into what a learner could read.
    expect(String(failure.message)).not.toContain('429')
  })

  it('throws unavailable on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const failure = await fetchQuote(QUOTE_PARAMS).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })

  it('throws unavailable when the request times out', async () => {
    // What fetch rejects with when AbortSignal.timeout fires.
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'))
    const failure = await fetchQuote(QUOTE_PARAMS).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })

  it('actually aborts a hanging request after the timeout', async () => {
    fetchMock.mockImplementation(
      (_input: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation timed out.', 'TimeoutError'))
          })
        }),
    )
    const failure = await fetchQuote(QUOTE_PARAMS, { timeoutMs: 25 }).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })

  it('throws unavailable when the response is missing the quote amounts', async () => {
    fetchMock.mockResolvedValue(okJson({ outAmount: '1205183' }))
    const failure = await fetchQuote(QUOTE_PARAMS).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })

  it('throws unavailable when the response is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 200 }))
    const failure = await fetchQuote(QUOTE_PARAMS).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })
})

describe('fetchSwapTransaction', () => {
  const WALLET = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

  async function prepareQuote() {
    fetchMock.mockResolvedValueOnce(okJson(quoteResponsePayload()))
    return fetchQuote(QUOTE_PARAMS)
  }

  it('posts the quote, the wallet, and SOL wrapping to the swap endpoint', async () => {
    const quote = await prepareQuote()
    fetchMock.mockResolvedValueOnce(okJson({ swapTransaction: 'AQAAAA==' }))
    const transaction = await fetchSwapTransaction(quote, WALLET)
    expect(transaction).toBe('AQAAAA==')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [url, init] = fetchMock.mock.calls[1]!
    expect(url).toBe(`${JUPITER_API_BASE}/swap`)
    expect(init?.method).toBe('POST')
    const body = JSON.parse(String(init?.body))
    expect(body).toEqual({
      quoteResponse: quoteResponsePayload(),
      userPublicKey: WALLET,
      wrapAndUnwrapSol: true,
    })
  })

  it('throws unavailable when the swap endpoint rejects', async () => {
    const quote = await prepareQuote()
    fetchMock.mockResolvedValueOnce(new Response('bad request', { status: 400 }))
    const failure = await fetchSwapTransaction(quote, WALLET).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })

  it('throws unavailable when the response has no transaction', async () => {
    const quote = await prepareQuote()
    fetchMock.mockResolvedValueOnce(okJson({ lastValidBlockHeight: 123 }))
    const failure = await fetchSwapTransaction(quote, WALLET).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })

  it('throws unavailable on a network failure', async () => {
    const quote = await prepareQuote()
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    const failure = await fetchSwapTransaction(quote, WALLET).catch((error) => error)
    expect(failure).toBeInstanceOf(JupiterError)
    expect(failure.kind).toBe('unavailable')
  })
})

describe('JupiterError', () => {
  it('is an Error with a stable name and kind', () => {
    const error = new JupiterError('unavailable')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('JupiterError')
    expect(error.kind).toBe('unavailable')
  })
})

describe('formatUsdc', () => {
  it('formats base-6 units with trimmed decimals', () => {
    expect(formatUsdc('7420000')).toBe('7.42')
    expect(formatUsdc('7380000')).toBe('7.38')
    expect(formatUsdc('1205183')).toBe('1.2')
    expect(formatUsdc('1000000')).toBe('1')
    expect(formatUsdc('0')).toBe('0')
    expect(formatUsdc('1234567')).toBe('1.23')
  })
})
