import { h, render } from 'vue'
import {
  AccountRole,
  createNoopSigner,
  generateKeyPairSigner,
  getAddressEncoder,
  getProgramDerivedAddress,
  type AccountMeta,
  type Address,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit'
import { SYSTEM_PROGRAM_ADDRESS, getCreateAccountInstruction } from '@solana-program/system'
import {
  AuthorityType,
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstruction,
  getInitializeMintInstruction,
  getMintToInstruction,
  getSetAuthorityInstruction,
} from '@solana-program/token'
import { iconMap } from './icons'

/*
 * Memecoin challenge helpers.
 *
 * Everything except one instruction comes from the official clients
 * (@solana-program/system and @solana-program/token). The Metaplex
 * Token Metadata program has no light official client, so its one
 * instruction — CreateMetadataAccountV3 — is hand-rolled here and pinned
 * by byte-level tests (see test/unit/memecoin.test.ts).
 */

// The Token Metadata program — the same address on every cluster.
export const METAPLEX_METADATA_PROGRAM_ADDRESS =
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address

export const RENT_SYSVAR_ADDRESS = 'SysvarRent111111111111111111111111111111111' as Address

// CreateMetadataAccountV3 sits at index 33 of the mpl-token-metadata
// instruction enum (borsh enums serialize as a one-byte discriminant).
const CREATE_METADATA_V3_DISCRIMINATOR = 33

// An SPL mint account is 82 bytes. The JS client exports no size constant.
export const MINT_ACCOUNT_SIZE = 82n

/*
 * Rent-exempt reserves, pinned like utils/stake.ts and verified live via
 * getMinimumBalanceForRentExemption on both mainnet and devnet on
 * 2026-10-05 (82 → 1,066,800; 165 → 1,488,440; 679 → 4,099,560 lamports).
 * Rent parameters only ever go down; if they fall further, the mint
 * account simply holds a little extra, still closest to the owner.
 */
export const MINT_ACCOUNT_RENT_LAMPORTS = 1_066_800n
export const ATA_ACCOUNT_RENT_LAMPORTS = 1_488_440n
export const METADATA_ACCOUNT_RENT_LAMPORTS = 4_099_560n // 679-byte metadata account

/*
 * Rough total the whole creation costs the wallet: mint account + token
 * account + metadata account rents, plus two signatures (the wallet and
 * the fresh mint keypair). Shown to learners before they commit.
 */
export const MEMECOIN_SETUP_LAMPORTS =
  MINT_ACCOUNT_RENT_LAMPORTS + ATA_ACCOUNT_RENT_LAMPORTS + METADATA_ACCOUNT_RENT_LAMPORTS + 10_000n

// On-chain Metaplex limits — the metadata program rejects anything longer.
export const MAX_NAME_BYTES = 32
export const MAX_SYMBOL_BYTES = 10
export const MAX_URI_LENGTH = 200
// Ours: the inline JSON URI leaves little room, so descriptions stay micro.
export const MAX_DESCRIPTION_LENGTH = 60
export const MAX_DECIMALS = 9

// A u64's worth of token base units — supply × 10^decimals must fit.
const U64_MAX = 18_446_744_073_709_551_615n

/** The eight coin pictures the picker offers (keys into utils/icons). */
export const MEMECOIN_ICONS = [
  { key: 'coins', label: 'Coins' },
  { key: 'rocket', label: 'Rocket' },
  { key: 'zap', label: 'Lightning' },
  { key: 'star', label: 'Star' },
  { key: 'heart', label: 'Heart' },
  { key: 'dog', label: 'Dog' },
  { key: 'cat', label: 'Cat' },
  { key: 'sun', label: 'Sun' },
] as const

/** The six background colours the picker offers. */
export const MEMECOIN_COLORS = [
  { hex: '#5B5BD6', label: 'Purple' },
  { hex: '#C24E70', label: 'Rose' },
  { hex: '#2B8C8C', label: 'Teal' },
  { hex: '#E07B39', label: 'Orange' },
  { hex: '#4C8A3F', label: 'Green' },
  { hex: '#3B6FB5', label: 'Blue' },
] as const

/*
 * Tiny valid 1×1 PNG, used whenever canvas rendering is unavailable
 * (SSR, tests, privacy-locked browsers) so a coin always has SOME image.
 */
export const FALLBACK_IMAGE_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOIjr4GAAKhAY1EqR66AAAAAElFTkSuQmCC'

/**
 * Metaplex-standard off-chain metadata document: name, symbol, and — when
 * present — a micro description (capped at MAX_DESCRIPTION_LENGTH) and the
 * coin picture. Empty optional fields are omitted, not written blank.
 */
export function buildMetadataJson({
  name,
  symbol,
  description,
  imageDataUri,
}: {
  name: string
  symbol: string
  description?: string
  imageDataUri?: string
}): string {
  const metadata: Record<string, string> = { name, symbol }
  const trimmedDescription = description?.trim().slice(0, MAX_DESCRIPTION_LENGTH) ?? ''
  if (trimmedDescription) metadata.description = trimmedDescription
  if (imageDataUri) metadata.image = imageDataUri
  return JSON.stringify(metadata)
}

/*
 * Packs the metadata JSON into an inline `data:` URI no longer than the
 * 200-byte on-chain limit. Inline JSON is the whole point of the challenge
 * (no hosting step), so when space runs out the description is dropped
 * first and the image after that — name and symbol always survive, which
 * the validation rules (≤ 32 / ≤ 10 bytes) guarantee fits.
 */
export function toDataUri(json: string): string {
  const payload = JSON.parse(json) as Record<string, unknown>
  let uri = encodePayload(payload)
  if (uri.length <= MAX_URI_LENGTH) return uri
  delete payload.description
  uri = encodePayload(payload)
  if (uri.length <= MAX_URI_LENGTH) return uri
  delete payload.image
  return encodePayload(payload)
}

function encodePayload(payload: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:application/json;base64,${btoa(binary)}`
}

export type MemecoinValidation =
  | { ok: true; supply: bigint; decimals: number }
  | { ok: false; reason: string }

export function validateMemecoinForm({
  name,
  symbol,
  supply,
  decimals,
}: {
  name: string
  symbol: string
  supply: string
  decimals: string
}): MemecoinValidation {
  const trimmedName = name.trim()
  if (trimmedName === '') {
    return { ok: false, reason: 'Please give your coin a name, like Grandma Coin.' }
  }
  if (byteLength(trimmedName) > MAX_NAME_BYTES) {
    return {
      ok: false,
      reason: `That name is a little too long — please keep it to ${MAX_NAME_BYTES} characters.`,
    }
  }
  const trimmedSymbol = symbol.trim()
  if (trimmedSymbol === '') {
    return { ok: false, reason: 'Please give your coin a symbol — the short ticker, like GRAN.' }
  }
  if (byteLength(trimmedSymbol) > MAX_SYMBOL_BYTES) {
    return {
      ok: false,
      reason: `That symbol is a little too long — please keep it to ${MAX_SYMBOL_BYTES} characters.`,
    }
  }
  if (!/^\d+$/.test(supply.trim())) {
    return { ok: false, reason: 'Please type how many coins there will be, as a whole number, like 1000000.' }
  }
  const supplyAmount = BigInt(supply.trim())
  if (supplyAmount === 0n) {
    return { ok: false, reason: 'There needs to be at least one coin — please choose more than zero.' }
  }
  if (!/^\d+$/.test(decimals.trim())) {
    return { ok: false, reason: 'Decimals must be a whole number from 0 to 9.' }
  }
  const decimalsCount = Number.parseInt(decimals.trim(), 10)
  if (decimalsCount > MAX_DECIMALS) {
    return { ok: false, reason: `Decimals can be ${MAX_DECIMALS} at most.` }
  }
  if (supplyAmount * 10n ** BigInt(decimalsCount) > U64_MAX) {
    return {
      ok: false,
      reason: 'That supply is too large for Solana — please choose a smaller number.',
    }
  }
  return { ok: true, supply: supplyAmount, decimals: decimalsCount }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

export interface BuiltMemecoinIxs {
  instructions: Instruction[]
  /** Address of the brand-new mint account — the coin's permanent ID. */
  mintAddress: Address
  /**
   * Keypair of the new mint account — it must co-sign the transaction (it
   * also stays embedded in the create-account instruction so kit's
   * multi-signer flow finds it). Pass it to useWallet.sendInstructions as
   * extraSigners.
   */
  mintSigner: TransactionSigner
}

/**
 * Builds the full creation in order: create the 82-byte mint account with
 * its rent reserve → initialize it (wallet is mint authority, no freeze
 * authority) → create the wallet's associated token account → mint the
 * whole supply into it → register name/symbol/picture with Metaplex →
 * optionally revoke the mint authority forever. A fresh mint keypair is
 * generated every call, so two builds never produce the same coin.
 */
export async function buildMemecoinIxs({
  payer,
  name,
  symbol,
  uri,
  decimals,
  supply,
  revokeMintAuthority,
}: {
  payer: Address
  name: string
  symbol: string
  uri: string
  decimals: number
  supply: bigint
  revokeMintAuthority: boolean
}): Promise<BuiltMemecoinIxs> {
  const mintSigner = await generateKeyPairSigner()
  const mint = mintSigner.address
  const [ata] = await findAssociatedTokenPda({
    owner: payer,
    mint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  const [metadataPda] = await getProgramDerivedAddress({
    programAddress: METAPLEX_METADATA_PROGRAM_ADDRESS,
    seeds: [
      'metadata',
      getAddressEncoder().encode(METAPLEX_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
    ],
  })

  const createMint = getCreateAccountInstruction({
    payer: createNoopSigner(payer),
    newAccount: mintSigner,
    lamports: MINT_ACCOUNT_RENT_LAMPORTS,
    space: MINT_ACCOUNT_SIZE,
    programAddress: TOKEN_PROGRAM_ADDRESS,
  })
  const initializeMint = getInitializeMintInstruction({
    mint,
    decimals,
    mintAuthority: payer,
    freezeAuthority: null,
  })
  const createAta = getCreateAssociatedTokenInstruction({
    payer: createNoopSigner(payer),
    ata,
    owner: payer,
    mint,
  })
  const mintTo = getMintToInstruction({
    mint,
    token: ata,
    mintAuthority: createNoopSigner(payer),
    amount: supply * 10n ** BigInt(decimals),
  })
  const registerMetadata = buildCreateMetadataV3Instruction({
    metadataPda,
    mint,
    payer,
    name,
    symbol,
    uri,
  })

  const instructions: Instruction[] = [
    createMint as Instruction,
    initializeMint as Instruction,
    createAta as Instruction,
    mintTo as Instruction,
    registerMetadata,
  ]
  if (revokeMintAuthority) {
    instructions.push(
      getSetAuthorityInstruction({
        owned: mint,
        owner: createNoopSigner(payer),
        authorityType: AuthorityType.MintTokens,
        newAuthority: null,
      }) as Instruction,
    )
  }
  return {
    instructions: instructions.map((ix) => stripNoopWalletSigner(ix, payer)),
    mintAddress: mint,
    mintSigner,
  }
}

/*
 * Hand-rolled CreateMetadataAccountV3: borsh-serialized DataV2 (name,
 * symbol, uri, sellerFeeBasisPoints, no creators/collection/uses), then
 * isMutable and no collectionDetails. Accounts follow the processor's
 * exact order: metadata PDA, mint, mint authority (signer), payer,
 * update authority, system program, rent sysvar (read unconditionally
 * on-chain, so always sent).
 */
function buildCreateMetadataV3Instruction({
  metadataPda,
  mint,
  payer,
  name,
  symbol,
  uri,
}: {
  metadataPda: Address
  mint: Address
  payer: Address
  name: string
  symbol: string
  uri: string
}): Instruction {
  const data = new Uint8Array([
    CREATE_METADATA_V3_DISCRIMINATOR,
    ...borshString(name),
    ...borshString(symbol),
    ...borshString(uri),
    0,
    0, // sellerFeeBasisPoints: u16 = 0
    0, // creators: None
    0, // collection: None
    0, // uses: None
    1, // isMutable: true
    0, // collectionDetails: None
  ])
  const accounts: AccountMeta[] = [
    { address: metadataPda, role: AccountRole.WRITABLE },
    { address: mint, role: AccountRole.READONLY },
    { address: payer, role: AccountRole.READONLY_SIGNER }, // mint authority
    { address: payer, role: AccountRole.WRITABLE_SIGNER }, // payer
    { address: payer, role: AccountRole.READONLY }, // update authority
    { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    { address: RENT_SYSVAR_ADDRESS, role: AccountRole.READONLY },
  ]
  return { programAddress: METAPLEX_METADATA_PROGRAM_ADDRESS, accounts, data }
}

function borshString(value: string): number[] {
  const bytes = new TextEncoder().encode(value)
  return [bytes.length & 0xff, (bytes.length >> 8) & 0xff, (bytes.length >> 16) & 0xff, (bytes.length >>> 24) & 0xff, ...bytes]
}

/*
 * Like utils/transfer.ts and utils/stake.ts: the connected wallet signs as
 * fee payer, so noop signers embedded for ITS address are stripped from the
 * metas — other metas, including the fresh mint keypair that must really
 * sign, pass through untouched.
 */
function stripNoopWalletSigner(ix: Instruction, from: Address): Instruction {
  const accounts: AccountMeta[] = (ix.accounts ?? []).map((meta) =>
    meta.address === from ? { address: meta.address, role: meta.role } : meta,
  )
  return { programAddress: ix.programAddress, accounts, data: ix.data }
}

const CANVAS_PIXELS = 256
const ICON_PIXELS = 160
const ICON_COLOR = '#FFFFFF'

/**
 * Renders the picked icon onto the picked background as a small PNG data
 * URI for the coin's metadata picture. Browser-only by nature: any failure
 * (no DOM, no canvas, odd image decoding) quietly yields the tiny built-in
 * fallback PNG instead, so the creation flow can always carry on.
 */
export async function renderCoinImagePng({
  iconKey,
  colorHex,
}: {
  iconKey: string
  colorHex: string
}): Promise<string> {
  try {
    if (typeof document === 'undefined') return FALLBACK_IMAGE_DATA_URI
    const Icon = iconMap[iconKey]
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_PIXELS
    canvas.height = CANVAS_PIXELS
    const context = canvas.getContext('2d')
    if (!Icon || !context) return FALLBACK_IMAGE_DATA_URI

    context.beginPath()
    if (typeof context.roundRect === 'function') {
      context.roundRect(0, 0, CANVAS_PIXELS, CANVAS_PIXELS, 48)
    } else {
      context.rect(0, 0, CANVAS_PIXELS, CANVAS_PIXELS)
    }
    context.fillStyle = colorHex
    context.fill()

    // Draw the lucide icon large: render its SVG off-DOM, whiten the
    // currentColor stroke, and rasterize it through an <img>.
    const host = document.createElement('div')
    render(
      h(Icon, { size: ICON_PIXELS, 'stroke-width': 2.5, color: ICON_COLOR }),
      host,
    )
    const svgMarkup = host.innerHTML.replaceAll('currentColor', ICON_COLOR)
    render(null, host)
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The coin picture could not be drawn.'))
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`
    })
    const inset = (CANVAS_PIXELS - ICON_PIXELS) / 2
    context.drawImage(image, inset, inset, ICON_PIXELS, ICON_PIXELS)
    return canvas.toDataURL('image/png')
  } catch {
    return FALLBACK_IMAGE_DATA_URI
  }
}
