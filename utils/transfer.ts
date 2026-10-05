import {
  createNoopSigner,
  type AccountMeta,
  type Address,
  type Instruction,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { isValidSolanaAddress, parseSolToLamports } from './cluster'

// Challenge rules: 0.001 SOL keeps the gesture real but tiny, and a classic
// SOL transfer costs one signature, so the fee is exactly 5000 lamports.
export const MIN_TRANSFER_LAMPORTS = 1_000_000n // 0.001 SOL
export const TRANSFER_FEE_LAMPORTS = 5_000n

export interface TransferFields {
  to: string
  amountSol: string
  balanceLamports: bigint
  from?: string
}

export type TransferValidation =
  | { ok: true; lamports: bigint; warning?: string }
  | { ok: false; reason: string }

export function validateTransfer({
  to,
  amountSol,
  balanceLamports,
  from,
}: TransferFields): TransferValidation {
  const recipient = to.trim()
  if (!isValidSolanaAddress(recipient)) {
    return {
      ok: false,
      reason:
        'That wallet address does not look quite right — please paste the whole address again.',
    }
  }
  const lamports = parseSolToLamports(amountSol)
  if (lamports === null) {
    return { ok: false, reason: 'Please type the amount as a number, like 0.01.' }
  }
  if (lamports < MIN_TRANSFER_LAMPORTS) {
    return { ok: false, reason: 'The challenge is to send at least 0.001 SOL.' }
  }
  if (lamports + TRANSFER_FEE_LAMPORTS > balanceLamports) {
    return {
      ok: false,
      reason:
        'Your wallet does not have quite enough SOL for this amount plus the tiny network fee.',
    }
  }
  if (from !== undefined && from.trim() === recipient) {
    return {
      ok: true,
      lamports,
      warning:
        'That is your own wallet address, so you would be sending the SOL to yourself. It still works — but sending it to someone else shows off Solana better.',
    }
  }
  return { ok: true, lamports }
}

export function buildTransferIxs({
  from,
  to,
  lamports,
}: {
  from: Address
  to: Address
  lamports: bigint
}): Instruction[] {
  const ix = getTransferSolInstruction({
    source: createNoopSigner(from),
    destination: to,
    amount: lamports,
  })
  // The connected wallet signs (it is the fee payer too), so the instruction
  // keeps address-only account metas: an embedded signer would clash with the
  // fee-payer signer inside useWallet.sendInstructions' fallback path.
  const accounts: AccountMeta[] = ix.accounts.map(({ address, role }) => ({ address, role }))
  return [{ programAddress: ix.programAddress, accounts, data: ix.data }]
}
