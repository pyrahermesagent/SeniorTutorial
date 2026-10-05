// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { AccountRole, address as toAddress } from '@solana/kit'
import {
  SYSTEM_PROGRAM_ADDRESS,
  TRANSFER_SOL_DISCRIMINATOR,
  getTransferSolInstructionDataDecoder,
} from '@solana-program/system'
import {
  MIN_TRANSFER_LAMPORTS,
  buildTransferIxs,
  validateTransfer,
} from '../../utils/transfer'

const SENDER = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'
const RECIPIENT = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi'
const AMPLE_BALANCE = 2_000_000_000n // 2 SOL

describe('validateTransfer', () => {
  it('rejects an amount below the challenge minimum and says what the minimum is', () => {
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.0005',
      balanceLamports: AMPLE_BALANCE,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('0.001')
    expect(result.reason.toLowerCase()).toMatch(/at least|minimum/)
  })

  it('accepts exactly the minimum amount', () => {
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.001',
      balanceLamports: AMPLE_BALANCE,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.lamports).toBe(MIN_TRANSFER_LAMPORTS)
  })

  it('rejects a 9-decimal sub-minimum with the minimum reason, not a parse error', () => {
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.000999999',
      balanceLamports: AMPLE_BALANCE,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('at least 0.001')
  })

  it('accepts an enormous valid amount with an ample balance', () => {
    const oneMillionSol = 1_000_000_000_000_000n
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '1000000',
      balanceLamports: oneMillionSol + 5_000n,
    })
    expect(result).toEqual({ ok: true, lamports: oneMillionSol })
  })

  it('rejects a recipient that is not a Solana address', () => {
    const result = validateTransfer({
      to: 'grandma@example.com',
      amountSol: '0.01',
      balanceLamports: AMPLE_BALANCE,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason.toLowerCase()).toContain('address')
  })

  it('rejects empty and non-numeric amounts before any wallet prompt', () => {
    for (const amountSol of ['', 'abc', '-1', '1.2.3']) {
      const result = validateTransfer({
        to: RECIPIENT,
        amountSol,
        balanceLamports: AMPLE_BALANCE,
      })
      expect(result.ok, `amount ${JSON.stringify(amountSol)} is rejected`).toBe(false)
    }
  })

  it('rejects a numeric amount with more than 9 decimals with a rounding hint', () => {
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.0009999999',
      balanceLamports: AMPLE_BALANCE,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('9 decimal places')
    expect(result.reason).not.toContain('as a number')
  })

  it('rejects an amount that would not leave room for the network fee', () => {
    // 0.01 SOL balance exactly: sending 0.01 SOL leaves nothing for the fee.
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.01',
      balanceLamports: 10_000_000n,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason.toLowerCase()).toContain('enough')
  })

  it('accepts an amount when the balance covers it plus the fee exactly', () => {
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.01',
      balanceLamports: 10_005_000n,
    })
    expect(result.ok).toBe(true)
  })

  it('accepts a valid transfer with ample balance and returns the lamports', () => {
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.01',
      balanceLamports: AMPLE_BALANCE,
    })
    expect(result).toEqual({ ok: true, lamports: 10_000_000n })
  })

  it('warns (without blocking) when the recipient is the sender', () => {
    const result = validateTransfer({
      to: SENDER,
      amountSol: '0.01',
      balanceLamports: AMPLE_BALANCE,
      from: SENDER,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.lamports).toBe(10_000_000n)
    expect(result.warning).toBeTruthy()
    expect(result.warning!.toLowerCase()).toContain('yourself')
  })

  it('does not warn when the recipient is someone else', () => {
    const result = validateTransfer({
      to: RECIPIENT,
      amountSol: '0.01',
      balanceLamports: AMPLE_BALANCE,
      from: SENDER,
    })
    expect(result).toEqual({ ok: true, lamports: 10_000_000n })
  })
})

describe('buildTransferIxs', () => {
  it('emits exactly one system transfer instruction carrying the amount', () => {
    const ixs = buildTransferIxs({
      from: toAddress(SENDER),
      to: toAddress(RECIPIENT),
      lamports: 10_000_000n,
    })
    expect(ixs).toHaveLength(1)
    const ix = ixs[0]!
    expect(ix.programAddress).toBe(SYSTEM_PROGRAM_ADDRESS)
    expect(ix.accounts).toHaveLength(2)
    expect(ix.accounts?.[0]?.address).toBe(SENDER)
    expect(ix.accounts?.[0]?.role).toBe(AccountRole.WRITABLE_SIGNER)
    expect(ix.accounts?.[1]?.address).toBe(RECIPIENT)
    expect(ix.accounts?.[1]?.role).toBe(AccountRole.WRITABLE)
    // The wallet supplies the signature via sendInstructions, so the
    // instruction itself must not smuggle in a duplicate signer.
    expect(ix.accounts?.some((account) => 'signer' in account)).toBe(false)
    const decoded = getTransferSolInstructionDataDecoder().decode(ix.data!)
    expect(decoded.discriminator).toBe(TRANSFER_SOL_DISCRIMINATOR)
    expect(decoded.amount).toBe(10_000_000n)
  })
})
