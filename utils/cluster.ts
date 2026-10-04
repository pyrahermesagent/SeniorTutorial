import { address as toAddress } from '@solana/kit'

export type Cluster = 'mainnet-beta' | 'devnet'

export interface ClusterInfo {
  label: string
  rpcUrl: string
  faucetUrl?: string
}

export const CLUSTERS: Record<Cluster, ClusterInfo> = {
  'mainnet-beta': {
    label: 'Mainnet Beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
  devnet: {
    label: 'Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    faucetUrl: 'https://faucet.solana.com',
  },
}

const EXPLORER_BASE = 'https://explorer.solana.com'

function withClusterParam(path: string, cluster: Cluster): string {
  return cluster === 'devnet' ? `${path}?cluster=devnet` : path
}

export function explorerTxUrl(signature: string, cluster: Cluster): string {
  return withClusterParam(`${EXPLORER_BASE}/tx/${signature}`, cluster)
}

export function explorerAddressUrl(addr: string, cluster: Cluster): string {
  return withClusterParam(`${EXPLORER_BASE}/address/${addr}`, cluster)
}

const LAMPORTS_PER_SOL = 1_000_000_000n
const DECIMAL_PLACES = 9

export function formatSol(lamports: bigint, maxDecimals = 4): string {
  const negative = lamports < 0n
  const absolute = negative ? -lamports : lamports
  const whole = absolute / LAMPORTS_PER_SOL
  const fraction = absolute % LAMPORTS_PER_SOL
  const sign = negative ? '-' : ''
  if (fraction === 0n || maxDecimals <= 0) return `${sign}${whole}`
  const digits = fraction
    .toString()
    .padStart(DECIMAL_PLACES, '0')
    .slice(0, maxDecimals)
    .replace(/0+$/, '')
  return digits ? `${sign}${whole}.${digits}` : `${sign}${whole}`
}

export function parseSolToLamports(input: string): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input.trim())
  if (!match) return null
  const wholePart = match[1]
  if (wholePart === undefined) return null
  const fractionPart = match[2] ?? ''
  if (fractionPart.length > DECIMAL_PLACES) return null
  return (
    BigInt(wholePart) * LAMPORTS_PER_SOL +
    BigInt(fractionPart.padEnd(DECIMAL_PLACES, '0') || '0')
  )
}

export function isValidSolanaAddress(value: string): boolean {
  try {
    toAddress(value)
    return true
  } catch {
    return false
  }
}
