// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  AccountRole,
  address as toAddress,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getAddressEncoder,
  getProgramDerivedAddress,
  isNone,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Blockhash,
  type SignatureBytes,
  type TransactionPartialSigner,
} from '@solana/kit'
import {
  SYSTEM_PROGRAM_ADDRESS,
  parseCreateAccountInstruction,
} from '@solana-program/system'
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  AuthorityType,
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  parseCreateAssociatedTokenInstruction,
  parseInitializeMintInstruction,
  parseMintToInstruction,
  parseSetAuthorityInstruction,
} from '@solana-program/token'
import {
  ATA_ACCOUNT_RENT_LAMPORTS,
  MAX_URI_LENGTH,
  MEMECOIN_SETUP_LAMPORTS,
  METADATA_ACCOUNT_RENT_LAMPORTS,
  METADATA_ACCOUNT_SPACE,
  METADATA_CREATION_FEE_LAMPORTS,
  METAPLEX_METADATA_PROGRAM_ADDRESS,
  MINT_ACCOUNT_RENT_LAMPORTS,
  MINT_ACCOUNT_SIZE,
  buildMemecoinIxs,
  buildMetadataJson,
  renderCoinImagePng,
  FALLBACK_IMAGE_DATA_URI,
  toDataUri,
  validateMemecoinForm,
} from '../../utils/memecoin'

const WALLET = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'
const RENT_SYSVAR = 'SysvarRent111111111111111111111111111111111'
const U64_MAX = 18_446_744_073_709_551_615n

const FIELDS = {
  name: 'Grandma Coin',
  symbol: 'GRAN',
  supply: '1000000',
  decimals: '9',
}

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

/** Independent borsh reader for the hand-rolled metadata instruction data. */
function readString(bytes: Uint8Array, offset: number): [string, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset)
  const length = view.getUint32(0, true)
  const start = offset + 4
  return [new TextDecoder().decode(bytes.subarray(start, start + length)), start + length]
}

function decodeMetadataData(bytes: Uint8Array) {
  let offset = 0
  const discriminator = bytes[offset++]!
  const [name, afterName] = readString(bytes, offset)
  offset = afterName
  const [symbol, afterSymbol] = readString(bytes, offset)
  offset = afterSymbol
  const [uri, afterUri] = readString(bytes, offset)
  offset = afterUri
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset)
  const sellerFeeBasisPoints = view.getUint16(0, true)
  offset += 2
  const creators = bytes[offset++]!
  const collection = bytes[offset++]!
  const uses = bytes[offset++]!
  const isMutable = bytes[offset++]!
  const collectionDetails = bytes[offset++]!
  return {
    discriminator,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints,
    creators,
    collection,
    uses,
    isMutable,
    collectionDetails,
    end: offset,
  }
}

async function build(revokeMintAuthority = true) {
  return buildMemecoinIxs({
    payer: toAddress(WALLET),
    name: FIELDS.name,
    symbol: FIELDS.symbol,
    uri: 'data:application/json;base64,e30=',
    decimals: 9,
    supply: 1_000_000n,
    revokeMintAuthority,
  })
}

describe('cost constants (live-verified on mainnet 2026-10-05)', () => {
  it('pins the Metaplex creation fee debited from the payer on CreateMetadataAccountV3', () => {
    // simulateTransaction post-state: the created metadata account held
    // its rent PLUS 10,000,000 lamports — the program's 0.01 SOL fee.
    expect(METADATA_CREATION_FEE_LAMPORTS).toBe(10_000_000n)
  })

  it('pins the metadata account size the program actually allocates, and its rent', () => {
    expect(METADATA_ACCOUNT_SPACE).toBe(607n)
    // Rent = (128-byte account header + data) × 5,080 lamports/byte — the
    // live rate verified via getMinimumBalanceForRentExemption the same day.
    expect(METADATA_ACCOUNT_RENT_LAMPORTS).toBe(5_080n * (128n + METADATA_ACCOUNT_SPACE))
  })

  it('totals everything the wallet is debited across the whole creation', () => {
    expect(MEMECOIN_SETUP_LAMPORTS).toBe(
      MINT_ACCOUNT_RENT_LAMPORTS +
        ATA_ACCOUNT_RENT_LAMPORTS +
        METADATA_ACCOUNT_RENT_LAMPORTS +
        METADATA_CREATION_FEE_LAMPORTS +
        10_000n, // two signatures: wallet + fresh mint keypair
    )
    // The live-verified ~0.0163 SOL total; a future version must never
    // again understate it (the original 0.0067 estimate lost the 0.01 fee).
    expect(MEMECOIN_SETUP_LAMPORTS).toBe(16_299_040n)
    expect(MEMECOIN_SETUP_LAMPORTS).toBeGreaterThanOrEqual(16_000_000n)
  })
})

describe('buildMetadataJson', () => {
  it('produces Metaplex-standard JSON carrying name, symbol, description and image', () => {
    const json = buildMetadataJson({
      name: 'Grandma Coin',
      symbol: 'GRAN',
      description: 'A homemade memecoin.',
      imageDataUri: 'data:image/png;base64,AAAA',
    })
    const parsed = JSON.parse(json)
    expect(parsed.name).toBe('Grandma Coin')
    expect(parsed.symbol).toBe('GRAN')
    expect(parsed.description).toBe('A homemade memecoin.')
    expect(parsed.image).toBe('data:image/png;base64,AAAA')
  })

  it('trims the description so the inline JSON stays micro (60 chars max)', () => {
    const json = buildMetadataJson({
      name: 'Grandma Coin',
      symbol: 'GRAN',
      description: 'x'.repeat(120),
      imageDataUri: 'data:image/png;base64,AAAA',
    })
    expect(JSON.parse(json).description).toBe('x'.repeat(60))
  })

  it('omits empty optional fields rather than writing blank strings', () => {
    const json = buildMetadataJson({ name: 'A', symbol: 'B' })
    const parsed = JSON.parse(json)
    expect(parsed).toEqual({ name: 'A', symbol: 'B' })
  })
})

describe('toDataUri', () => {
  it('prefixes with data:application/json;base64,', () => {
    const uri = toDataUri(JSON.stringify({ name: 'A', symbol: 'B' }))
    expect(uri.startsWith('data:application/json;base64,')).toBe(true)
  })

  it('round-trips small metadata unchanged', () => {
    const json = JSON.stringify({ name: 'Gran Coin', symbol: 'GRAN', image: 'data:image/png;base64,iVBOR' })
    const uri = toDataUri(json)
    const payload = Buffer.from(uri.slice('data:application/json;base64,'.length), 'base64').toString(
      'utf8',
    )
    expect(JSON.parse(payload)).toEqual(JSON.parse(json))
  })

  it('keeps maximal metadata at or under the 200-byte on-chain URI limit', () => {
    // Worst case shapes: a 32-char name, a 10-char symbol, a 60-char
    // description and a canvas-sized image. Metaplex rejects uri > 200 bytes.
    const json = buildMetadataJson({
      name: 'x'.repeat(32),
      symbol: 'y'.repeat(10),
      description: 'z'.repeat(60),
      imageDataUri: `data:image/png;base64,${'A'.repeat(500)}`,
    })
    const uri = toDataUri(json)
    expect(uri.length).toBeLessThanOrEqual(MAX_URI_LENGTH)
    expect(uri.length).toBeLessThanOrEqual(200)
    const payload = Buffer.from(uri.slice('data:application/json;base64,'.length), 'base64').toString(
      'utf8',
    )
    const parsed = JSON.parse(payload)
    expect(parsed.name).toBe('x'.repeat(32))
    expect(parsed.symbol).toBe('y'.repeat(10))
  })

  it('drops the description before the image when trimming to fit', () => {
    const json = buildMetadataJson({
      name: 'x'.repeat(32),
      symbol: 'y'.repeat(10),
      description: 'z'.repeat(60),
      imageDataUri: `data:image/png;base64,${'A'.repeat(20)}`,
    })
    const uri = toDataUri(json)
    expect(uri.length).toBeLessThanOrEqual(200)
    const parsed = JSON.parse(
      Buffer.from(uri.slice('data:application/json;base64,'.length), 'base64').toString('utf8'),
    )
    expect(parsed.description).toBeUndefined()
    expect(parsed.image).toBe(`data:image/png;base64,${'A'.repeat(20)}`)
  })
})

describe('validateMemecoinForm', () => {
  it('accepts the sensible defaults', () => {
    const result = validateMemecoinForm(FIELDS)
    expect(result).toEqual({ ok: true, supply: 1_000_000n, decimals: 9 })
  })

  it('rejects an empty or whitespace-only name', () => {
    for (const name of ['', '   ']) {
      const result = validateMemecoinForm({ ...FIELDS, name })
      expect(result.ok, JSON.stringify(name)).toBe(false)
      if (!result.ok) expect(result.reason.toLowerCase()).toContain('name')
    }
  })

  it('rejects a name longer than 32 bytes but accepts exactly 32', () => {
    expect(validateMemecoinForm({ ...FIELDS, name: 'x'.repeat(32) }).ok).toBe(true)
    const tooLong = validateMemecoinForm({ ...FIELDS, name: 'x'.repeat(33) })
    expect(tooLong.ok).toBe(false)
    if (!tooLong.ok) expect(tooLong.reason).toContain('32')
  })

  it('counts multibyte characters by bytes, like the on-chain limit does', () => {
    // 9 grinning emoji = 36 bytes — over 32 even though only 9 characters.
    const result = validateMemecoinForm({ ...FIELDS, name: '😀'.repeat(9) })
    expect(result.ok).toBe(false)
  })

  it('rejects an empty symbol and one longer than 10 bytes', () => {
    expect(validateMemecoinForm({ ...FIELDS, symbol: '' }).ok).toBe(false)
    expect(validateMemecoinForm({ ...FIELDS, symbol: 'y'.repeat(10) }).ok).toBe(true)
    const tooLong = validateMemecoinForm({ ...FIELDS, symbol: 'y'.repeat(11) })
    expect(tooLong.ok).toBe(false)
    if (!tooLong.ok) expect(tooLong.reason).toContain('10')
  })

  it('rejects zero, negative and non-whole supplies', () => {
    for (const supply of ['0', '', 'abc', '-5', '1.5', '1,000']) {
      const result = validateMemecoinForm({ ...FIELDS, supply })
      expect(result.ok, JSON.stringify(supply)).toBe(false)
    }
  })

  it('rejects decimals outside 0–9', () => {
    expect(validateMemecoinForm({ ...FIELDS, decimals: '0' }).ok).toBe(true)
    expect(validateMemecoinForm({ ...FIELDS, decimals: '9' }).ok).toBe(true)
    for (const decimals of ['10', '-1', 'x', '']) {
      const result = validateMemecoinForm({ ...FIELDS, decimals })
      expect(result.ok, JSON.stringify(decimals)).toBe(false)
    }
  })

  it('accepts the largest supply that still fits a u64 of token base units', () => {
    expect(
      validateMemecoinForm({ ...FIELDS, supply: U64_MAX.toString(), decimals: '0' }).ok,
    ).toBe(true)
    const over = validateMemecoinForm({ ...FIELDS, supply: (U64_MAX + 1n).toString(), decimals: '0' })
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.reason.toLowerCase()).toMatch(/too large|too many|smaller/)
  })

  it('scales the u64 bound by decimals: supply × 10^decimals must not overflow', () => {
    // floor(u64max / 1e9) = 18_446_744_073 with 9 decimals.
    expect(validateMemecoinForm({ ...FIELDS, supply: '18446744073' }).ok).toBe(true)
    expect(validateMemecoinForm({ ...FIELDS, supply: '18446744074' }).ok).toBe(false)
  })
})

describe('buildMemecoinIxs', () => {
  it('builds exactly create mint → initialize mint → create ATA → mint supply → register metadata → revoke', async () => {
    const built = await build()
    expect(built.instructions).toHaveLength(6)
    const programs = built.instructions.map((ix) => ix.programAddress)
    expect(programs).toEqual([
      SYSTEM_PROGRAM_ADDRESS,
      TOKEN_PROGRAM_ADDRESS,
      ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
      TOKEN_PROGRAM_ADDRESS,
      METAPLEX_METADATA_PROGRAM_ADDRESS,
      TOKEN_PROGRAM_ADDRESS,
    ])
  })

  it('omits the revoke instruction when the learner keeps the mint unlocked', async () => {
    const built = await build(false)
    expect(built.instructions).toHaveLength(5)
  })

  it('creates an 82-byte mint account funded with the pinned rent-exempt reserve', async () => {
    const built = await build()
    const parsed = parseCreateAccountInstruction(built.instructions[0]! as never)
    expect(parsed.accounts.newAccount.address).toBe(built.mintAddress)
    expect(parsed.accounts.payer.address).toBe(WALLET)
    expect(parsed.data.space).toBe(MINT_ACCOUNT_SIZE)
    expect(parsed.data.space).toBe(82n)
    expect(parsed.data.lamports).toBe(MINT_ACCOUNT_RENT_LAMPORTS)
    expect(parsed.data.programAddress).toBe(TOKEN_PROGRAM_ADDRESS)
  })

  it('initializes the mint with the wallet as mint authority and no freeze authority', async () => {
    const built = await build()
    const parsed = parseInitializeMintInstruction(built.instructions[1]! as never)
    expect(parsed.accounts.mint.address).toBe(built.mintAddress)
    expect(parsed.data.decimals).toBe(9)
    expect(parsed.data.mintAuthority).toBe(WALLET)
    expect(isNone(parsed.data.freezeAuthority)).toBe(true)
  })

  it('creates the wallet\u2019s associated token account for the new mint', async () => {
    const built = await build()
    const [expectedAta] = await findAssociatedTokenPda({
      owner: toAddress(WALLET),
      mint: built.mintAddress,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })
    const parsed = parseCreateAssociatedTokenInstruction(built.instructions[2]! as never)
    expect(parsed.accounts.ata.address).toBe(expectedAta)
    expect(parsed.accounts.owner.address).toBe(WALLET)
    expect(parsed.accounts.mint.address).toBe(built.mintAddress)
    expect(parsed.accounts.payer.address).toBe(WALLET)
  })

  it('mints the whole supply (scaled by decimals) into the wallet\u2019s ATA', async () => {
    const built = await build()
    const parsed = parseMintToInstruction(built.instructions[3]! as never)
    expect(parsed.accounts.mint.address).toBe(built.mintAddress)
    expect(parsed.accounts.mintAuthority.address).toBe(WALLET)
    // 1,000,000 coins × 10^9 base units.
    expect(parsed.data.amount).toBe(1_000_000_000_000_000n)
  })

  it('registers the name and picture through the real Metaplex program', async () => {
    const built = await build()
    const metadataIx = built.instructions[4]!
    expect(metadataIx.programAddress).toBe(METAPLEX_METADATA_PROGRAM_ADDRESS)
    expect(metadataIx.programAddress).toBe('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
  })

  it('derives the metadata PDA from the brand-new mint account', async () => {
    const built = await build()
    const [expectedPda] = await getProgramDerivedAddress({
      programAddress: toAddress(METAPLEX_METADATA_PROGRAM_ADDRESS),
      seeds: [
        'metadata',
        getAddressEncoder().encode(toAddress(METAPLEX_METADATA_PROGRAM_ADDRESS)),
        getAddressEncoder().encode(built.mintAddress),
      ],
    })
    const metadataIx = built.instructions[4]!
    expect(metadataIx.accounts![0]!.address).toBe(expectedPda)
  })

  it('lays out the metadata account metas exactly as CreateMetadataAccountV3 expects', async () => {
    const built = await build()
    const accounts = built.instructions[4]!.accounts!
    expect(
      accounts.map((meta) => [meta.address, meta.role] as const),
    ).toEqual([
      [accounts[0]!.address, AccountRole.WRITABLE], // metadata PDA (checked above)
      [built.mintAddress, AccountRole.READONLY],
      [WALLET, AccountRole.READONLY_SIGNER], // mint authority
      [WALLET, AccountRole.WRITABLE_SIGNER], // payer
      [WALLET, AccountRole.READONLY], // update authority
      [SYSTEM_PROGRAM_ADDRESS, AccountRole.READONLY],
      [RENT_SYSVAR, AccountRole.READONLY],
    ])
  })

  it('serializes CreateMetadataAccountV3 with discriminator 33 and borsh DataV2', async () => {
    const uri = 'data:application/json;base64,e30='
    const built = await build()
    const data = built.instructions[4]!.data!
    expect(data[0]).toBe(33) // CreateMetadataAccountV3 in the mpl instruction enum
    const decoded = decodeMetadataData(data)
    expect(decoded).toEqual({
      discriminator: 33,
      name: FIELDS.name,
      symbol: FIELDS.symbol,
      uri,
      sellerFeeBasisPoints: 0,
      creators: 0, // None
      collection: 0, // None
      uses: 0, // None
      isMutable: 1,
      collectionDetails: 0, // None
      end: data.length,
    })
  })

  it('revokes the mint authority with an official SetAuthority instruction to no one', async () => {
    const built = await build()
    const parsed = parseSetAuthorityInstruction(built.instructions[5]! as never)
    expect(parsed.accounts.owned.address).toBe(built.mintAddress)
    expect(parsed.accounts.owner.address).toBe(WALLET)
    expect(parsed.data.authorityType).toBe(AuthorityType.MintTokens)
    expect(isNone(parsed.data.newAuthority)).toBe(true)
  })

  it('generates a fresh mint keypair on every build', async () => {
    const first = await build()
    const second = await build()
    expect(first.mintAddress).not.toBe(second.mintAddress)
    expect(first.mintSigner).not.toBe(second.mintSigner)
  })

  it('strips noop wallet signers but keeps the mint keypair signer for the multi-signer flow', async () => {
    const built = await build()
    for (const ix of built.instructions) {
      for (const meta of ix.accounts ?? []) {
        if (meta.address === WALLET) expect('signer' in meta).toBe(false)
      }
    }
    const newAccount = built.instructions[0]!.accounts!.find(
      (meta) => meta.address === built.mintAddress,
    )!
    expect('signer' in newAccount && newAccount.signer).toBe(built.mintSigner)
  })

  it('the composed message gets a signature from the mint keypair even when the wallet only signs for itself', async () => {
    const built = await build()
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
    expect(signed.signatures[built.mintAddress]).toBeDefined()
    expect(Object.keys(signed.signatures)).toHaveLength(2)
  })
})

describe('renderCoinImagePng', () => {
  it('falls back to the tiny built-in PNG when no canvas exists (SSR / tests)', async () => {
    // Node has no document or canvas — the function must never reject, just
    // hand back the fallback so metadata building can always continue.
    const png = await renderCoinImagePng({ iconKey: 'coins', colorHex: '#5B5BD6' })
    expect(png).toBe(FALLBACK_IMAGE_DATA_URI)
    expect(png.startsWith('data:image/png;base64,')).toBe(true)
  })
})
