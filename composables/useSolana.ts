import {
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
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
import { CLUSTERS, isValidSolanaAddress, parseSolToLamports, type Cluster } from '../utils/cluster'

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
  // JSON-RPC code -32002 is the classic devnet requestAirdrop rate-limit
  // response. kit 8.4.0 routes it through the preflight-failure branch, which
  // drops the server's message — and throws a plain TypeError instead when the
  // error body has no `data` field. requestAirdrop cannot otherwise produce a
  // preflight failure, so both shapes mean "rate limited" here.
  if (
    isSolanaError(
      error,
      SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
    )
  ) {
    return true
  }
  if (error instanceof TypeError && /Cannot destructure property 'err'/.test(error.message)) {
    return true
  }
  const messages = [error instanceof Error ? error.message : String(error)]
  if (isSolanaError(error) && '__serverMessage' in error.context) {
    messages.push(String(error.context.__serverMessage))
  }
  if (error instanceof Error && error.cause instanceof Error) {
    messages.push(error.cause.message)
  }
  return messages.some((m) => /429|rate.?limit|too many requests/i.test(m))
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
    if (amount === null || !isValidSolanaAddress(addr)) return { error: 'unavailable' }
    try {
      const sig = await getRpc('devnet')
        .requestAirdrop(toAddress(addr), toLamports(amount))
        .send()
      return { sig }
    } catch (error) {
      return { error: isRateLimitError(error) ? 'rate-limited' : 'unavailable' }
    }
  }

  async function getLatestBlockhash() {
    const { value } = await getRpc(cluster.value).getLatestBlockhash().send()
    return value
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

  return { cluster, setCluster, getBalance, requestDevnetAirdrop, getLatestBlockhash, sendAndConfirm }
}
