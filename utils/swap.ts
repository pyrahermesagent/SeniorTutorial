import {
  createNoopSigner,
  type AccountMeta,
  type Address,
  type Instruction,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import {
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getSyncNativeInstruction,
} from '@solana-program/token'
import { parseSolToLamports, type Cluster } from './cluster'

/*
 * Swap challenge helpers.
 *
 * Mainnet trades through Jupiter's swap program and needs no local
 * instruction building. Devnet has no real markets, so the practice flow
 * performs the swap sub-move that is real there: wrapping SOL into wSOL
 * (the native-mint token account) — exactly what Jupiter's wrapAndUnwrapSol
 * does under the hood before an aggregator swaps.
 *
 * @solana-program/token (0.17) ships no NATIVE_MINT constant, so the
 * canonical wSOL mint is pinned here (its address *is* the string below on
 * every Solana cluster — the devnet practice flow stays real).
 */
export const WSOL_MINT = 'So11111111111111111111111111111111111111112'

// Challenge rules mirror the transfer challenge: a small real amount, with a
// reserve covering the signature fee plus possible wSOL account creation
// (rent if the learner's wallet has never held wSOL) so a full-balance
// amount cannot strand the transaction.
export const SWAP_MIN_LAMPORTS = 1_000_000n // 0.001 SOL
export const SWAP_FEE_RESERVE_LAMPORTS = 3_000_000n // fee + wSOL ATA rent headroom

export type SwapMode = 'jupiter' | 'practice'

export function describeSwapMode(cluster: Cluster): SwapMode {
  return cluster === 'mainnet-beta' ? 'jupiter' : 'practice'
}

export type SwapAmountValidation = { ok: true; lamports: bigint } | { ok: false; reason: string }

export function validateSwapAmount({
  amountSol,
  balanceLamports,
}: {
  amountSol: string
  balanceLamports: bigint
}): SwapAmountValidation {
  const lamports = parseSolToLamports(amountSol)
  if (lamports === null) {
    if (/^\d+\.\d{10,}$/.test(amountSol.trim())) {
      return {
        ok: false,
        reason: 'SOL amounts have at most 9 decimal places — please round it, like 0.001.',
      }
    }
    return { ok: false, reason: 'Please type the amount as a number, like 0.01.' }
  }
  if (lamports < SWAP_MIN_LAMPORTS) {
    return { ok: false, reason: 'The challenge is to swap at least 0.001 SOL.' }
  }
  if (lamports + SWAP_FEE_RESERVE_LAMPORTS > balanceLamports) {
    return {
      ok: false,
      reason:
        'Your wallet does not have quite enough SOL for this amount plus the tiny network fee.',
    }
  }
  return { ok: true, lamports }
}

/**
 * Wraps `lamports` of the owner's SOL into wSOL: create the wSOL associated
 * token account if missing (idempotent — existing accounts pass through),
 * transfer the lamports into it, then syncNative so the token program sees
 * the new balance.
 */
export async function buildWrapSolIxs(owner: Address, lamports: bigint): Promise<Instruction[]> {
  const wsolMint = WSOL_MINT as Address
  const [ata] = await findAssociatedTokenPda({
    owner,
    mint: wsolMint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  const createAta = getCreateAssociatedTokenIdempotentInstruction({
    payer: createNoopSigner(owner),
    ata,
    owner,
    mint: wsolMint,
  })
  const transfer = getTransferSolInstruction({
    source: createNoopSigner(owner),
    destination: ata,
    amount: lamports,
  })
  const syncNative = getSyncNativeInstruction({ account: ata })
  // Like utils/transfer.ts: the connected wallet signs, so noop signers used
  // to satisfy the builders are stripped from the account metas — else the
  // sendInstructions fallback path would hit duplicate-signer errors.
  return [createAta, transfer, syncNative].map(stripSignerMetas)
}

function stripSignerMetas(ix: Instruction): Instruction {
  const accounts: AccountMeta[] = (ix.accounts ?? []).map(({ address, role }) => ({
    address,
    role,
  }))
  return { programAddress: ix.programAddress, accounts, data: ix.data }
}
