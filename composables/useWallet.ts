import {
  address as toAddress,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase58Decoder,
  getTransactionDecoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Instruction,
  type SignatureBytes,
  type SignatureDictionary,
  type TransactionPartialSigner,
} from '@solana/kit'
import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { useState } from '#imports'
import { onMounted } from 'vue'
import { useProgress } from './useProgress'
import { useSolana } from './useSolana'
import {
  SOLANA_CHAIN_BY_CLUSTER,
  classifySendError,
  isSolanaStandardWallet,
  sendVersionedTransactionViaWallet,
  walletDisplayName,
  type StandardWalletInfo,
  type WalletSignAndSendTransactionFeature,
  type WalletSignTransactionFeature,
} from '~/utils/wallets'

/*
 * Minimal structural types for the wallet-standard features we use. The
 * feature type packages are transitive deps, so we describe the shapes we
 * need locally and narrow with `in` checks at runtime.
 */
type ConnectFeature = {
  connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>
}
type DisconnectFeature = { disconnect(): Promise<void> }
type EventsFeature = {
  on(
    event: 'change',
    listener: (input: { accounts?: readonly WalletAccount[] }) => void,
  ): () => void
}
type SignAndSendFeature = {
  signAndSendTransaction(
    ...inputs: readonly {
      account: WalletAccount
      transaction: Uint8Array
      chain: string
      options?: { commitment?: 'processed' | 'confirmed' | 'finalized' }
    }[]
  ): Promise<readonly { signature: Uint8Array }[]>
}
type SignFeature = {
  signTransaction(
    ...inputs: readonly { account: WalletAccount; transaction: Uint8Array; chain?: string }[]
  ): Promise<readonly { signedTransaction: Uint8Array }[]>
}

export interface ConnectedAccount {
  address: string
  label?: string
}

let connectedWallet: Wallet | null = null
let offWalletEvents: (() => void) | null = null
let walletsApiInitialized = false

function getFeature<T>(wallet: Wallet | null, name: string): T | undefined {
  if (!wallet) return undefined
  const features = wallet.features as Record<string, unknown>
  return name in features ? (features[name] as T) : undefined
}

export function useWallet() {
  const progress = useProgress()
  const solana = useSolana()

  const wallets = useState<StandardWalletInfo[]>('wallet-list', () => [])
  const account = useState<ConnectedAccount | null>('wallet-account', () => null)
  const connecting = useState<boolean>('wallet-connecting', () => false)

  function refreshWallets() {
    const seen = new Set<string>()
    wallets.value = getWallets()
      .get()
      .filter(isSolanaStandardWallet)
      .filter((wallet) => {
        if (seen.has(wallet.name)) return false
        seen.add(wallet.name)
        return true
      })
      .map((wallet) => ({ name: walletDisplayName(wallet), icon: wallet.icon, wallet }))
  }

  function setConnectedAccount(wallet: Wallet, next: WalletAccount) {
    offWalletEvents?.()
    connectedWallet = wallet
    account.value = next.label
      ? { address: next.address, label: next.label }
      : { address: next.address }
    const events = getFeature<EventsFeature>(wallet, 'standard:events')
    offWalletEvents =
      events?.on('change', ({ accounts: changed }) => {
        const changedAccount = changed?.[0]
        account.value = changedAccount
          ? { address: changedAccount.address, label: changedAccount.label }
          : null
      }) ?? null
  }

  async function registerMwaIfMobile() {
    if (!import.meta.client) return
    if (!/Android|iPhone|iPad/i.test(window.navigator.userAgent)) return
    try {
      const {
        registerMwa,
        createDefaultAuthorizationCache,
        createDefaultChainSelector,
        createDefaultWalletNotFoundHandler,
      } = await import('@solana-mobile/wallet-standard-mobile')
      registerMwa({
        appIdentity: { name: 'Senior Solana School' },
        authorizationCache: createDefaultAuthorizationCache(),
        chains: ['solana:devnet', 'solana:mainnet'],
        chainSelector: createDefaultChainSelector(),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      })
    } catch {
      // MWA registration is best-effort and must never break desktop browsers.
    }
  }

  async function reconnectLastWallet() {
    const lastWallet = progress.state.value.lastWallet
    if (!lastWallet || account.value) return
    const info = wallets.value.find((w) => w.wallet.name === lastWallet)
    if (!info) return
    try {
      const connectFeature = getFeature<ConnectFeature>(info.wallet, 'standard:connect')
      const { accounts } = (await connectFeature?.connect({ silent: true })) ?? { accounts: [] }
      const first = accounts[0]
      if (first) setConnectedAccount(info.wallet, first)
    } catch {
      // Silent reconnect is best-effort; the learner can connect by hand.
    }
  }

  // Wallet enumeration touches window events, so it runs on the client only.
  onMounted(() => {
    if (walletsApiInitialized) {
      refreshWallets()
      return
    }
    walletsApiInitialized = true
    void registerMwaIfMobile()
    const api = getWallets()
    refreshWallets()
    api.on('register', refreshWallets)
    api.on('unregister', refreshWallets)
    void reconnectLastWallet()
  })

  async function connect(name?: string) {
    const info = name
      ? wallets.value.find((w) => w.name === name || w.wallet.name === name)
      : wallets.value[0]
    if (!info) throw new Error('Wallet not found')
    const connectFeature = getFeature<ConnectFeature>(info.wallet, 'standard:connect')
    if (!connectFeature) throw new Error('This wallet cannot connect')
    connecting.value = true
    try {
      const { accounts } = await connectFeature.connect()
      const first = accounts[0]
      if (!first) throw new Error('The wallet did not share an account')
      setConnectedAccount(info.wallet, first)
      progress.setLastWallet(info.wallet.name)
    } finally {
      connecting.value = false
    }
  }

  async function disconnect() {
    const wallet = connectedWallet
    try {
      await getFeature<DisconnectFeature>(wallet, 'standard:disconnect')?.disconnect()
    } catch {
      // Disconnecting must always clear local state, even if the wallet errs.
    }
    offWalletEvents?.()
    offWalletEvents = null
    connectedWallet = null
    account.value = null
    progress.setLastWallet(undefined)
  }

  /*
   * Signs and sends a complete, pre-built versioned transaction — the shape
   * Jupiter's /swap endpoint returns (base64). Unlike sendInstructions, no
   * message is assembled locally; the wallet receives the DEX's bytes. The
   * wallet-signTransaction fallback broadcasts via useSolana, which handles
   * the base64 round-trip and confirmation polling.
   */
  async function sendVersionedTransaction(transactionBase64: string): Promise<string> {
    const current = account.value
    const wallet = connectedWallet
    const walletAccount =
      wallet?.accounts.find((a) => a.address === current?.address) ?? wallet?.accounts[0]
    if (!current || !wallet || !walletAccount) throw new Error('No wallet connected')
    const chain: string = SOLANA_CHAIN_BY_CLUSTER[solana.cluster.value]
    try {
      return await sendVersionedTransactionViaWallet({
        signAndSend: getFeature<WalletSignAndSendTransactionFeature>(
          wallet,
          'solana:signAndSendTransaction',
        ),
        sign: getFeature<WalletSignTransactionFeature>(wallet, 'solana:signTransaction'),
        account: walletAccount,
        chain,
        transactionBase64,
        sendSignedTransaction: (signed) => solana.sendSignedTransaction(signed),
      })
    } catch (error) {
      if (classifySendError(error) === 'rejected') throw 'rejected'
      throw error
    }
  }

  async function sendInstructions(ixs: unknown[]): Promise<string> {
    const current = account.value
    const wallet = connectedWallet
    const walletAccount =
      wallet?.accounts.find((a) => a.address === current?.address) ?? wallet?.accounts[0]
    if (!current || !wallet || !walletAccount) throw new Error('No wallet connected')
    const chain: string = SOLANA_CHAIN_BY_CLUSTER[solana.cluster.value]
    try {
      const signAndSend = getFeature<SignAndSendFeature>(wallet, 'solana:signAndSendTransaction')
      if (signAndSend) {
        const latestBlockhash = await solana.getLatestBlockhash()
        const message = pipe(
          createTransactionMessage({ version: 0 }),
          (m) => setTransactionMessageFeePayer(toAddress(current.address), m),
          (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
          (m) => appendTransactionMessageInstructions(ixs as Instruction[], m),
        )
        const unsigned = getTransactionEncoder().encode(compileTransaction(message)) as Uint8Array
        const [output] = await signAndSend.signAndSendTransaction({
          account: walletAccount,
          transaction: unsigned,
          chain,
          options: { commitment: 'confirmed' },
        })
        if (!output) throw new Error('The wallet did not return a signature')
        return getBase58Decoder().decode(output.signature)
      }
      const sign = getFeature<SignFeature>(wallet, 'solana:signTransaction')
      if (!sign) throw new Error('This wallet cannot sign Solana transactions')
      const signer: TransactionPartialSigner = {
        address: toAddress(current.address),
        async signTransactions(transactions) {
          return Promise.all(
            transactions.map(async (transaction) => {
              const unsigned = getTransactionEncoder().encode(transaction) as Uint8Array
              const [output] = await sign.signTransaction({
                account: walletAccount,
                transaction: unsigned,
                chain,
              })
              if (!output) throw new Error('The wallet did not return a signed transaction')
              const signed = getTransactionDecoder().decode(output.signedTransaction)
              const signatures: Record<string, SignatureBytes> = {}
              for (const [signerAddress, signature] of Object.entries(signed.signatures)) {
                if (signature) signatures[signerAddress] = signature
              }
              return signatures as SignatureDictionary
            }),
          )
        },
      }
      return await solana.sendAndConfirm(ixs as Instruction[], signer)
    } catch (error) {
      if (classifySendError(error) === 'rejected') throw 'rejected'
      throw error
    }
  }

  return { wallets, account, connecting, connect, disconnect, sendInstructions, sendVersionedTransaction }
}
