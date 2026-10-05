/*
 * Client for Jupiter's swap API (https://api.jup.ag/swap/v1), used by the swap
 * challenge on Mainnet. Every failure mode — offline, timeout, non-OK status,
 * or a payload that does not look like a quote — collapses into a single
 * JupiterError('unavailable') so challenge pages can show one calm message
 * instead of leaking transport details.
 *
 * Verified live 2026-10-05: both /quote and /swap answer unauthenticated
 * (HTTP 200); Jupiter documents an API key for some tiers, so if requests
 * start failing with 401/429 the 'unavailable' path is the intended UX.
 */
export const JUPITER_API_BASE = 'https://api.jup.ag/swap/v1'

export const SOL_MINT = 'So11111111111111111111111111111111111111112'
export const USDC_MAINNET_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export const DEFAULT_SLIPPAGE_BPS = 50

const QUOTE_TIMEOUT_MS = 10_000

export type JupiterErrorKind = 'unavailable'

export class JupiterError extends Error {
  readonly kind: JupiterErrorKind
  /** Transport detail for the console/debugging — never shown to learners. */
  readonly detail?: string

  constructor(kind: JupiterErrorKind, detail?: string) {
    super(`Jupiter ${kind}`)
    this.name = 'JupiterError'
    this.kind = kind
    if (detail !== undefined) this.detail = detail
  }
}

export interface QuoteRequest {
  inputMint: string
  outputMint: string
  amountLamports: bigint
  slippageBps: number
}

export interface JupiterQuote {
  /** Expected output in the output mint's smallest unit (USDC: 6 decimals). */
  outAmount: string
  /** Worst-case output once slippage is applied ("min received"). */
  otherAmountThreshold: string
  /** The raw quote response, echoed verbatim in the swap POST body. */
  quoteResponse: Record<string, unknown>
}

async function jupiterFetch(url: string, timeoutMs: number, init?: RequestInit) {
  let response: Response
  try {
    // fetch() itself receives the timeout signal; hanging connections are
    // turned into the same DOMException TimeoutError as slow responses.
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new JupiterError('unavailable', error instanceof Error ? error.message : String(error))
  }
  if (!response.ok) {
    throw new JupiterError('unavailable', `HTTP ${response.status}`)
  }
  try {
    return (await response.json()) as unknown
  } catch {
    throw new JupiterError('unavailable', 'response was not JSON')
  }
}

export async function fetchQuote(
  { inputMint, outputMint, amountLamports, slippageBps }: QuoteRequest,
  options?: { timeoutMs?: number },
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountLamports.toString(),
    slippageBps: String(slippageBps),
  })
  const data = (await jupiterFetch(
    `${JUPITER_API_BASE}/quote?${params.toString()}`,
    options?.timeoutMs ?? QUOTE_TIMEOUT_MS,
  )) as Record<string, unknown> | null
  if (
    data === null ||
    typeof data !== 'object' ||
    typeof data.outAmount !== 'string' ||
    typeof data.otherAmountThreshold !== 'string'
  ) {
    throw new JupiterError('unavailable', 'response did not look like a quote')
  }
  return {
    outAmount: data.outAmount,
    otherAmountThreshold: data.otherAmountThreshold,
    quoteResponse: data,
  }
}

export async function fetchSwapTransaction(
  quote: JupiterQuote,
  userAddress: string,
  options?: { timeoutMs?: number },
): Promise<string> {
  const data = (await jupiterFetch(`${JUPITER_API_BASE}/swap`, options?.timeoutMs ?? QUOTE_TIMEOUT_MS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote.quoteResponse,
      userPublicKey: userAddress,
      wrapAndUnwrapSol: true,
    }),
  })) as Record<string, unknown> | null
  const swapTransaction = data?.swapTransaction
  if (typeof swapTransaction !== 'string' || swapTransaction === '') {
    throw new JupiterError('unavailable', 'response had no transaction')
  }
  return swapTransaction
}

const USDC_DECIMALS = 6

/** Formats a USDC base-unit string ('7420000') for display ('7.42'). */
export function formatUsdc(units: string, maxDecimals = 2): string {
  const value = BigInt(units)
  const base = 10n ** BigInt(USDC_DECIMALS)
  const whole = value / base
  const fraction = value % base
  if (fraction === 0n || maxDecimals <= 0) return `${whole}`
  const digits = fraction
    .toString()
    .padStart(USDC_DECIMALS, '0')
    .slice(0, maxDecimals)
    .replace(/0+$/, '')
  return digits ? `${whole}.${digits}` : `${whole}`
}
