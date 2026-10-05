import {
  createNoopSigner,
  generateKeyPairSigner,
  type AccountMeta,
  type Address,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit'
import { SYSTEM_PROGRAM_ADDRESS, getCreateAccountInstruction } from '@solana-program/system'
import {
  STAKE_PROGRAM_ADDRESS,
  getDelegateStakeInstruction,
  getInitializeInstruction,
} from '@solana-program/stake'
import { parseSolToLamports } from './cluster'

/*
 * Stake challenge helpers. Instruction encodings come from the official
 * clients (@solana-program/system and @solana-program/stake) — never
 * hand-rolled byte layouts.
 */

// Size of the StakeStateV2 account, in bytes, from the stake program docs.
// The JS client exports no size constant.
export const STAKE_ACCOUNT_SIZE = 200n

/*
 * Rent-exempt reserve for the 200-byte stake account. Pinned as a constant —
 * verified live via getMinimumBalanceForRentExemption(200) on both mainnet and
 * devnet on 2026-10-05 (1,666,240 lamports on both). Rent parameters only ever
 * go down on Solana; if they decrease further, the account simply holds a
 * little more un-delegated lamports, still under the owner's control. A
 * constant keeps building (and testing) possible with no RPC call.
 */
export const STAKE_ACCOUNT_RENT_LAMPORTS = 1_666_240n

export function getStakeRent(): bigint {
  return STAKE_ACCOUNT_RENT_LAMPORTS
}

// Challenge rules: 0.01 SOL keeps the gesture small but real. The staking
// transaction carries two signatures (the wallet fee payer plus the fresh
// stake-account keypair), so the network fee is 2 × 5000 lamports.
export const MIN_STAKE_LAMPORTS = 10_000_000n // 0.01 SOL
export const STAKE_FEE_LAMPORTS = 10_000n

export type StakeAmountValidation = { ok: true; lamports: bigint } | { ok: false; reason: string }

export function validateStakeAmount({
  amountSol,
  balanceLamports,
}: {
  amountSol: string
  balanceLamports: bigint
}): StakeAmountValidation {
  const lamports = parseSolToLamports(amountSol)
  if (lamports === null) {
    if (/^\d+\.\d{10,}$/.test(amountSol.trim())) {
      return {
        ok: false,
        reason: 'SOL amounts have at most 9 decimal places — please round it, like 0.01.',
      }
    }
    return { ok: false, reason: 'Please type the amount as a number, like 0.01.' }
  }
  if (lamports < MIN_STAKE_LAMPORTS) {
    return { ok: false, reason: 'The challenge is to stake at least 0.01 SOL.' }
  }
  if (lamports + STAKE_ACCOUNT_RENT_LAMPORTS + STAKE_FEE_LAMPORTS > balanceLamports) {
    return {
      ok: false,
      reason:
        'Your wallet does not have quite enough SOL for this amount plus the small account setup cost.',
    }
  }
  return { ok: true, lamports }
}

export interface BuiltStakeIxs {
  instructions: Instruction[]
  /** Address of the brand-new stake account being created. */
  stakeAddress: Address
  /**
   * Keypair of the new stake account — it must co-sign the transaction (it
   * also stays embedded in the create-account instruction so kit's
   * multi-signer flow finds it). Pass it to useWallet.sendInstructions as
   * extraSigners.
   */
  stakeSigner: TransactionSigner
}

/**
 * Builds the three instructions for a fresh delegation, in order:
 * create a new 200-byte stake account funded with `lamports + rent`, then
 * Initialize it with `from` as both staker and withdrawer (no lockup), then
 * DelegateStake to `voteAddress`. A fresh keypair is generated every call.
 */
export async function buildStakeIxs({
  from,
  voteAddress,
  lamports,
}: {
  from: Address
  voteAddress: Address
  lamports: bigint
}): Promise<BuiltStakeIxs> {
  const stakeSigner = await generateKeyPairSigner()
  const createAccount = getCreateAccountInstruction({
    payer: createNoopSigner(from),
    newAccount: stakeSigner,
    lamports: lamports + STAKE_ACCOUNT_RENT_LAMPORTS,
    space: STAKE_ACCOUNT_SIZE,
    programAddress: STAKE_PROGRAM_ADDRESS,
  })
  const initialize = getInitializeInstruction({
    stake: stakeSigner.address,
    arg0: { staker: from, withdrawer: from },
    // A lockup with zero epoch/timestamp and the system program as custodian
    // is the stake program's "no lockup".
    arg1: { unixTimestamp: 0, epoch: 0, custodian: SYSTEM_PROGRAM_ADDRESS },
  })
  const delegate = getDelegateStakeInstruction({
    stake: stakeSigner.address,
    vote: voteAddress,
    stakeAuthority: createNoopSigner(from),
  })
  const instructions = [createAccount, initialize, delegate].map((ix) =>
    stripNoopWalletSigner(ix as Instruction, from),
  )
  return { instructions, stakeAddress: stakeSigner.address, stakeSigner }
}

/*
 * Like utils/transfer.ts: the connected wallet signs as fee payer, so a noop
 * signer embedded for ITS address would clash inside sendInstructions'
 * fallback path. Strip only that address; other metas — including the fresh
 * stake keypair, which must really sign — pass through untouched.
 */
function stripNoopWalletSigner(ix: Instruction, from: Address): Instruction {
  const accounts: AccountMeta[] = (ix.accounts ?? []).map((meta) =>
    meta.address === from ? { address: meta.address, role: meta.role } : meta,
  )
  return { programAddress: ix.programAddress, accounts, data: ix.data }
}
