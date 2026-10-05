import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { getBase58Decoder, getBase64Encoder } from '@solana/kit'
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


/*
 * Minimal structural types for the wallet-standard features used when a DEX
 * hands us a complete, pre-built versioned transaction (e.g. a Jupiter swap
 * tx) instead of instruction lists. Kept local: the feature type packages
 * are transitive deps, so we narrow with shapes like useWallet.ts does.
 */
export interface WalletSignAndSendTransactionFeature {
  signAndSendTransaction(
    ...inputs: readonly {
      account: WalletAccount
      transaction: Uint8Array
      chain: string
      options?: { commitment?: 'processed' | 'confirmed' | 'finalized' }
    }[]
  ): Promise<readonly { signature: Uint8Array }[]>
}

export interface WalletSignTransactionFeature {
  signTransaction(
    ...inputs: readonly { account: WalletAccount; transaction: Uint8Array; chain?: string }[]
  ): Promise<readonly { signedTransaction: Uint8Array }[]>
}

export interface SendVersionedTransactionInput {
  signAndSend?: WalletSignAndSendTransactionFeature
  sign?: WalletSignTransactionFeature
  account: WalletAccount
  /** Wallet-standard chain id, e.g. 'solana:mainnet'. */
  chain: string
  /** Base64-encoded versioned transaction, as Jupiter's /swap returns it. */
  transactionBase64: string
  /** Sends a wallet-signed transaction to the network and confirms it. */
  sendSignedTransaction: (signedTransaction: Uint8Array) => Promise<string>
}

/*
 * Signs and sends a pre-built versioned transaction through the connected
 * wallet. Prefers solana:signAndSendTransaction (the wallet submits, which is
 * what wallets optimize for swaps); falls back to solana:signTransaction and
 * lets the caller's `sendSignedTransaction` callback broadcast. Returns the
 * base58 signature. Wallet rejections bubble up unchanged so callers can map
 * them with classifySendError.
 */
export async function sendVersionedTransactionViaWallet({
  signAndSend,
  sign,
  account,
  chain,
  transactionBase64,
  sendSignedTransaction,
}: SendVersionedTransactionInput): Promise<string> {
  // In kit's codec naming, the base64 *encoder* maps the wire string to bytes.
  const transaction = getBase64Encoder().encode(transactionBase64) as Uint8Array
  if (signAndSend) {
    const [output] = await signAndSend.signAndSendTransaction({
      account,
      transaction,
      chain,
      options: { commitment: 'confirmed' },
    })
    if (!output) throw new Error('The wallet did not return a signature')
    return getBase58Decoder().decode(output.signature)
  }
  if (!sign) throw new Error('This wallet cannot sign Solana transactions')
  const [output] = await sign.signTransaction({ account, transaction, chain })
  if (!output) throw new Error('The wallet did not return a signed transaction')
  return await sendSignedTransaction(output.signedTransaction)
}


/*
 * Thrown only AFTER a transaction was broadcast: the network has it, we hold
 * its signature, but the outcome is failed-on-chain or simply unknown. Pages
 * must never map this to "nothing was sent" — with a real-money flow that lie
 * invites a double-send. `failedOnChain` distinguishes "the network processed
 * it and it failed" (fee spent, effects reverted) from "we stopped hearing
 * back" (state genuinely unknown — check the explorer).
 */
export class UnconfirmedBroadcastError extends Error {
  readonly signature: string
  readonly failedOnChain: boolean

  constructor(signature: string, failedOnChain: boolean) {
    super(
      failedOnChain
        ? 'The transaction failed on the network.'
        : 'The transaction could not be confirmed yet.',
    )
    this.name = 'UnconfirmedBroadcastError'
    this.signature = signature
    this.failedOnChain = failedOnChain
  }
}
