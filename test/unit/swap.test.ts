// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { AccountRole, address as toAddress } from '@solana/kit'
import {
  SYSTEM_PROGRAM_ADDRESS,
  getTransferSolInstructionDataDecoder,
} from '@solana-program/system'
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  CREATE_ASSOCIATED_TOKEN_IDEMPOTENT_DISCRIMINATOR,
  SYNC_NATIVE_DISCRIMINATOR,
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
} from '@solana-program/token'
import {
  SWAP_MIN_LAMPORTS,
  WSOL_MINT,
  buildWrapSolIxs,
  describeSwapMode,
  validateSwapAmount,
} from '../../utils/swap'

const OWNER = toAddress('4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM')
const AMPLE_BALANCE = 2_000_000_000n // 2 SOL

async function expectedWsolAta() {
  const [ata] = await findAssociatedTokenPda({
    owner: OWNER,
    mint: toAddress(WSOL_MINT),
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  return ata
}

describe('describeSwapMode', () => {
  it('uses Jupiter on mainnet', () => {
    expect(describeSwapMode('mainnet-beta')).toBe('jupiter')
  })

  it('falls back to the wrap practice flow on devnet', () => {
    expect(describeSwapMode('devnet')).toBe('practice')
  })
})

describe('buildWrapSolIxs', () => {
  it('builds the wSOL ATA creation, a SOL transfer into it, and a syncNative', async () => {
    const lamports = 10_000_000n
    const ata = await expectedWsolAta()
    const ixs = await buildWrapSolIxs(OWNER, lamports)

    // create ATA (idempotent) + system transfer + syncNative
    expect(ixs.length).toBeGreaterThanOrEqual(2)
    expect(ixs.length).toBeLessThanOrEqual(3)
    expect(ixs).toHaveLength(3)

    // 1) Create the wSOL associated token account if it is missing.
    const create = ixs[0]!
    expect(create.programAddress).toBe(ASSOCIATED_TOKEN_PROGRAM_ADDRESS)
    expect(Array.from(create.data!)).toEqual([CREATE_ASSOCIATED_TOKEN_IDEMPOTENT_DISCRIMINATOR])
    const createAccounts = create.accounts!.map((account) => account.address)
    expect(createAccounts).toContain(OWNER)
    expect(createAccounts).toContain(ata)
    expect(createAccounts).toContain(WSOL_MINT)

    // 2) Move the SOL into the wSOL account.
    const transfer = ixs[1]!
    expect(transfer.programAddress).toBe(SYSTEM_PROGRAM_ADDRESS)
    expect(transfer.accounts?.[0]?.address).toBe(OWNER)
    expect(transfer.accounts?.[0]?.role).toBe(AccountRole.WRITABLE_SIGNER)
    expect(transfer.accounts?.[1]?.address).toBe(ata)
    const decoded = getTransferSolInstructionDataDecoder().decode(transfer.data!)
    expect(decoded.amount).toBe(lamports)

    // 3) Tell the token program the new balance (syncNative to the wSOL mint's ATA).
    const sync = ixs[2]!
    expect(sync.programAddress).toBe(TOKEN_PROGRAM_ADDRESS)
    expect(Array.from(sync.data!)[0]).toBe(SYNC_NATIVE_DISCRIMINATOR)
    expect(Array.from(sync.data!)).toEqual([17])
    expect(sync.accounts?.[0]?.address).toBe(ata)
    const syncAccountAtas = ixs.filter(
      (ix) =>
        ix.programAddress === TOKEN_PROGRAM_ADDRESS &&
        Array.from(ix.data!)[0] === SYNC_NATIVE_DISCRIMINATOR,
    )
    expect(syncAccountAtas).toHaveLength(1)

    // The connected wallet signs, so no instruction may smuggle in a signer
    // (the noop-signer strip pattern from utils/transfer.ts).
    for (const ix of ixs) {
      expect(ix.accounts?.some((account) => 'signer' in account)).toBe(false)
    }
  })
})

describe('validateSwapAmount', () => {
  it('rejects an amount below the challenge minimum', () => {
    const result = validateSwapAmount({ amountSol: '0.0005', balanceLamports: AMPLE_BALANCE })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('at least 0.001')
  })

  it('accepts the minimum with an ample balance and returns the lamports', () => {
    const result = validateSwapAmount({ amountSol: '0.001', balanceLamports: AMPLE_BALANCE })
    expect(result).toEqual({ ok: true, lamports: SWAP_MIN_LAMPORTS })
  })

  it('rejects amounts that leave no room for the network fee and wrap overhead', () => {
    // 0.01 SOL balance exactly cannot cover 0.01 SOL plus the fee reserve.
    const result = validateSwapAmount({ amountSol: '0.01', balanceLamports: 10_000_000n })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason.toLowerCase()).toContain('enough')
  })

  it('rejects empty and non-numeric amounts before any wallet prompt', () => {
    for (const amountSol of ['', 'abc', '-1', '1.2.3']) {
      const result = validateSwapAmount({ amountSol, balanceLamports: AMPLE_BALANCE })
      expect(result.ok, `amount ${JSON.stringify(amountSol)} is rejected`).toBe(false)
    }
  })

  it('rejects more than 9 decimal places with a rounding hint', () => {
    const result = validateSwapAmount({ amountSol: '0.0009999999', balanceLamports: AMPLE_BALANCE })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('9 decimal places')
  })

  it('accepts a small mainnet-sized amount and returns parseable lamports', () => {
    const result = validateSwapAmount({ amountSol: '0.05', balanceLamports: AMPLE_BALANCE })
    expect(result).toEqual({ ok: true, lamports: 50_000_000n })
  })
})
