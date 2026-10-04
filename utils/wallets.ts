import type { Wallet } from '@wallet-standard/base'
import type { Cluster } from './cluster'

/** Wallet information safe to hand to the UI: display data plus the live wallet. */
export interface StandardWalletInfo {
  name: string
  icon?: string
  wallet: Wallet
}

/** wallet-standard chain identifiers for the clusters this app supports. */
export const SOLANA_CHAIN_BY_CLUSTER = {
  'mainnet-beta': 'solana:mainnet',
  devnet: 'solana:devnet',
} as const satisfies Record<Cluster, `solana:${string}`>

/** True when the value is a Wallet Standard wallet that can connect and speaks Solana. */
export function isSolanaStandardWallet(wallet: unknown): boolean {
  if (typeof wallet !== 'object' || wallet === null) return false
  const features = (wallet as { features?: unknown }).features
  if (typeof features !== 'object' || features === null) return false
  const names = Object.keys(features)
  return names.includes('standard:connect') && names.some((name) => name.startsWith('solana:'))
}

/** Display name for a wallet, with a fallback for malformed entries. */
export function walletDisplayName(wallet: { name?: unknown } | null | undefined): string {
  const name = typeof wallet?.name === 'string' ? wallet.name.trim() : ''
  return name || 'Unknown wallet'
}

/** `4uQe…ziofM`-style middle elision for showing addresses in chips. */
export function shortenAddress(addr: string, edgeChars = 4): string {
  if (!addr || addr.length <= edgeChars * 2) return addr
  return `${addr.slice(0, edgeChars)}…${addr.slice(-edgeChars)}`
}

const USER_REJECTED_REQUEST_CODE = 4001
// SolanaMobileWalletAdapterProtocolError: ERROR_AUTHORIZATION_FAILED is how
// MWA reports the user declining authorization in the wallet sheet.
const MWA_PROTOCOL_ERROR_NAME = 'SolanaMobileWalletAdapterProtocolError'
const MWA_AUTHORIZATION_FAILED_CODE = -1
// wallet-standard errors (WalletSignTransactionError & friends) and EIP-1193
// user-rejection errors name themselves; match by name because the error
// classes live in wallet-side packages we don't import.
const REJECTION_NAME = /reject|declined|cancelled|canceled|wallet\w*(sign|send)\w*error/i
// MWA adapter errors carry string constant codes (ERROR_ASSOCIATION_CANCELLED
// is the user cancelling the wallet sheet); their name is just the class name.
const REJECTION_CODE = /cancelled|canceled|reject/i

/** Distinguish "the user said no" from real failures so the UI can stay calm. */
export function classifySendError(error: unknown): 'rejected' | 'failed' {
  if (typeof error !== 'object' || error === null) return 'failed'
  const { code, name } = error as { code?: unknown; name?: unknown }
  if (code === USER_REJECTED_REQUEST_CODE) return 'rejected'
  if (typeof code === 'string' && REJECTION_CODE.test(code)) return 'rejected'
  if (name === MWA_PROTOCOL_ERROR_NAME && code === MWA_AUTHORIZATION_FAILED_CODE) return 'rejected'
  if (typeof name === 'string' && REJECTION_NAME.test(name)) return 'rejected'
  return 'failed'
}
