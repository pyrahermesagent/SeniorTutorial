import {
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  address as toAddress,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  isSolanaError,
  lamports as toLamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
  type Rpc,
  type RpcSubscriptions,
  type SignatureNotificationsApi,
  type SlotNotificationsApi,
  type SolanaRpcApi,
  type TransactionSigner,
} from '@solana/kit'
import { computed } from 'vue'
import { useProgress } from './useProgress'
import { CLUSTERS, parseSolToLamports, type Cluster } from '../utils/cluster'

type AirdropResult = { sig: string } | { error: 'rate-limited' | 'unavailable' }

type RpcClient = Rpc<SolanaRpcApi>
type SubscriptionsClient = RpcSubscriptions<SignatureNotificationsApi & SlotNotificationsApi>

const rpcCache = new Map<Cluster, RpcClient>()

function getRpc(cluster: Cluster): RpcClient {
  let rpc = rpcCache.get(cluster)
  if (!rpc) {
    rpc = createSolanaRpc(CLUSTERS[cluster].rpcUrl) as RpcClient
    rpcCache.set(cluster, rpc)
  }
  return rpc
}

function isRateLimitError(error: unknown): boolean {
  if (isSolanaError(error, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR)) {
    return error.context.statusCode === 429
  }
  const message = error instanceof Error ? error.message : String(error)
  return /429|rate.?limit|too many requests/i.test(message)
}

export function useSolana() {
  const progress = useProgress()
  const cluster = computed<Cluster>(() => progress.state.value.cluster ?? 'devnet')

  function setCluster(next: Cluster) {
    progress.setCluster(next)
  }

  async function getBalance(addr: string): Promise<bigint> {
    const { value } = await getRpc(cluster.value).getBalance(toAddress(addr)).send()
    return value
  }

  async function requestDevnetAirdrop(addr: string, sol: number | string): Promise<AirdropResult> {
    const amount = parseSolToLamports(typeof sol === 'number' ? String(sol) : sol)
    if (amount === null || !isValidRecipient(addr)) return { error: 'unavailable' }
    try {
      const sig = await getRpc('devnet')
        .requestAirdrop(toAddress(addr), toLamports(amount))
        .send()
      return { sig }
    } catch (error) {
      return { error: isRateLimitError(error) ? 'rate-limited' : 'unavailable' }
    }
  }

  async function sendAndConfirm(ixs: Instruction[], signer: TransactionSigner): Promise<string> {
    const current = cluster.value
    const rpc = getRpc(current)
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstructions(ixs, m),
    )
    const signed = await signTransactionMessageWithSigners(message)
    assertIsTransactionWithBlockhashLifetime(signed)
    const rpcSubscriptions = createSolanaRpcSubscriptions(
      CLUSTERS[current].rpcUrl.replace(/^http/, 'ws'),
    ) as SubscriptionsClient
    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signed, {
      commitment: 'confirmed',
    })
    return getSignatureFromTransaction(signed)
  }

  return { cluster, setCluster, getBalance, requestDevnetAirdrop, sendAndConfirm }
}

function isValidRecipient(addr: string): boolean {
  try {
    toAddress(addr)
    return true
  } catch {
    return false
  }
}
