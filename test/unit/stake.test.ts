// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  AccountRole,
  address as toAddress,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Blockhash,
  type Instruction,
  type SignatureBytes,
  type TransactionPartialSigner,
} from '@solana/kit'
import {
  SYSTEM_PROGRAM_ADDRESS,
  parseCreateAccountInstruction,
} from '@solana-program/system'
import {
  DELEGATE_STAKE_DISCRIMINATOR,
  INITIALIZE_DISCRIMINATOR,
  STAKE_PROGRAM_ADDRESS,
  parseDelegateStakeInstruction,
  parseInitializeInstruction,
} from '@solana-program/stake'
import {
  MIN_STAKE_LAMPORTS,
  STAKE_ACCOUNT_RENT_LAMPORTS,
  STAKE_ACCOUNT_SIZE,
  buildStakeIxs,
  getStakeRent,
  validateStakeAmount,
} from '../../utils/stake'

const WALLET = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'
// Helius mainnet vote account — a real vote address; see utils/validators.ts.
const VOTE = 'he1iusunGwqrNtafDtLdhsUQDFvo13z9sUa36PauBtk'
const STAKE_AMOUNT = 10_000_000n // 0.01 SOL
const AMPLE_BALANCE = 1_000_000_000n // 1 SOL

/**
 * Mirrors the useWallet signTransaction fallback: a wallet that can only
 * produce a signature for its own address, nothing else.
 */
function mockWalletSigner(from: string): TransactionPartialSigner {
  return {
    address: toAddress(from),
    async signTransactions(transactions) {
      return transactions.map(() => ({ [from]: new Uint8Array(64) as SignatureBytes }))
    },
  }
}

async function build() {
  return buildStakeIxs({
    from: toAddress(WALLET),
    voteAddress: toAddress(VOTE),
    lamports: STAKE_AMOUNT,
  })
}

describe('validateStakeAmount', () => {
  it('rejects an amount below the challenge minimum and says what the minimum is', () => {
    const result = validateStakeAmount({ amountSol: '0.005', balanceLamports: AMPLE_BALANCE })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('0.01')
    expect(result.reason.toLowerCase()).toMatch(/at least|minimum/)
  })

  it('accepts exactly the minimum amount with an ample balance', () => {
    const result = validateStakeAmount({ amountSol: '0.01', balanceLamports: AMPLE_BALANCE })
    expect(result).toEqual({ ok: true, lamports: MIN_STAKE_LAMPORTS })
  })

  it('rejects when the balance covers the stake but not the rent reserve and fee', () => {
    const needed = MIN_STAKE_LAMPORTS + STAKE_ACCOUNT_RENT_LAMPORTS
    const result = validateStakeAmount({
      amountSol: '0.01',
      balanceLamports: needed, // covers amount + rent but not the fee on top
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason.toLowerCase()).toContain('enough')
  })

  it('accepts when the balance covers the amount, rent reserve, and fee exactly', () => {
    const result = validateStakeAmount({
      amountSol: '0.01',
      balanceLamports: MIN_STAKE_LAMPORTS + STAKE_ACCOUNT_RENT_LAMPORTS + 10_000n,
    })
    expect(result.ok).toBe(true)
  })

  it('rejects empty and non-numeric amounts before any wallet prompt', () => {
    for (const amountSol of ['', 'abc', '-1', '1.2.3']) {
      const result = validateStakeAmount({ amountSol, balanceLamports: AMPLE_BALANCE })
      expect(result.ok, `amount ${JSON.stringify(amountSol)} is rejected`).toBe(false)
    }
  })

  it('rejects a numeric amount with more than 9 decimals with a rounding hint', () => {
    const result = validateStakeAmount({
      amountSol: '0.0009999999',
      balanceLamports: AMPLE_BALANCE,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('9 decimal places')
  })
})

describe('getStakeRent', () => {
  it('returns the rent reserve used to fund the stake account', () => {
    expect(getStakeRent()).toBe(STAKE_ACCOUNT_RENT_LAMPORTS)
  })
})

describe('buildStakeIxs', () => {
  it('builds exactly create → initialize → delegate, all decoded by the official clients', async () => {
    const built = await build()
    expect(built.instructions).toHaveLength(3)
    const [createIx, initializeIx, delegateIx] = built.instructions as [
      Instruction,
      Instruction,
      Instruction,
    ]
    expect(createIx.programAddress).toBe(SYSTEM_PROGRAM_ADDRESS)
    expect(initializeIx.programAddress).toBe(STAKE_PROGRAM_ADDRESS)
    expect(delegateIx.programAddress).toBe(STAKE_PROGRAM_ADDRESS)

    // Discriminators are asserted through the official client's own decoders,
    // never against hand-computed bytes.
    expect(INITIALIZE_DISCRIMINATOR).toBe(0)
    expect(DELEGATE_STAKE_DISCRIMINATOR).toBe(2)
    expect(parseInitializeInstruction(initializeIx as never).data.discriminator).toBe(0)
    expect(parseDelegateStakeInstruction(delegateIx as never).data.discriminator).toBe(2)
  })

  it('creates a 200-byte stake account funded with the amount plus the rent reserve', async () => {
    const built = await build()
    const parsed = parseCreateAccountInstruction(built.instructions[0] as never)
    expect(parsed.accounts.payer.address).toBe(WALLET)
    expect(parsed.accounts.newAccount.address).toBe(built.stakeAddress)
    expect(parsed.data.lamports).toBe(STAKE_AMOUNT + STAKE_ACCOUNT_RENT_LAMPORTS)
    expect(parsed.data.space).toBe(STAKE_ACCOUNT_SIZE)
    expect(parsed.data.space).toBe(200n)
    expect(parsed.data.programAddress).toBe(STAKE_PROGRAM_ADDRESS)
  })

  it('initializes the account with the wallet as both staker and withdrawer, no lockup', async () => {
    const built = await build()
    const parsed = parseInitializeInstruction(built.instructions[1] as never)
    expect(parsed.accounts.stake.address).toBe(built.stakeAddress)
    expect(parsed.data.arg0.staker).toBe(WALLET)
    expect(parsed.data.arg0.withdrawer).toBe(WALLET)
    expect(parsed.data.arg1.unixTimestamp).toBe(0n)
    expect(parsed.data.arg1.epoch).toBe(0n)
    expect(parsed.data.arg1.custodian).toBe(SYSTEM_PROGRAM_ADDRESS)
  })

  it('delegates the new account to the requested vote address', async () => {
    const built = await build()
    const parsed = parseDelegateStakeInstruction(built.instructions[2] as never)
    expect(parsed.accounts.stake.address).toBe(built.stakeAddress)
    expect(parsed.accounts.vote.address).toBe(VOTE)
    expect(parsed.accounts.stakeAuthority.address).toBe(WALLET)
    expect(parsed.accounts.stakeAuthority.role).toBe(AccountRole.READONLY_SIGNER)
  })

  it('generates a fresh stake account every time', async () => {
    const first = await build()
    const second = await build()
    expect(first.stakeAddress).not.toBe(second.stakeAddress)
  })

  it('strips noop wallet signers but keeps the stake keypair signer for the multi-signer flow', async () => {
    const built = await build()
    const createIx = built.instructions[0]!
    const payer = createIx.accounts!.find((a) => a.address === WALLET)!
    // The wallet signs through sendInstructions; a leftover noop signer for its
    // address would clash there (same rule as utils/transfer.ts).
    expect('signer' in payer).toBe(false)
    const newAccount = createIx.accounts!.find((a) => a.address === built.stakeAddress)!
    expect('signer' in newAccount && newAccount.signer).toBe(built.stakeSigner)
  })

  it('the composed message gets a signature from the stake keypair even when the wallet only signs for itself', async () => {
    const built = await build()
    // Exactly what useWallet.sendInstructions' fallback path does: wallet as
    // fee-payer partial signer, instructions appended, kit signs with every
    // signer it can find (the fresh stake keypair embedded in the create ix).
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(mockWalletSigner(WALLET), m),
      (m) =>
        setTransactionMessageLifetimeUsingBlockhash(
          { blockhash: WALLET as unknown as Blockhash, lastValidBlockHeight: 1n },
          m,
        ),
      (m) => appendTransactionMessageInstructions(built.instructions, m),
    )
    const signed = await signTransactionMessageWithSigners(message)
    expect(signed.signatures[toAddress(WALLET)]).toBeDefined()
    expect(signed.signatures[built.stakeAddress]).toBeDefined()
    expect(Object.keys(signed.signatures)).toHaveLength(2)
  })
})
