import type { Cluster } from './cluster'

export interface SuggestedValidator {
  name: string
  /** The validator's vote account — this is what a stake delegates to. */
  voteAddress: string
  /** One plain sentence explaining who runs it. */
  note: string
}

/*
 * Suggested validators for the stake challenge picker.
 *
 * Every vote address below was verified LIVE on 2026-10-05 by probing
 * getVoteAccounts on the cluster's public RPC (each is in the *current* set
 * with epochVoteAccount: true — i.e. actively voting right now, not just
 * documented). Operator names were cross-checked against validators.app.
 * Mainnet: Helius (0% commission, ~15.9M SOL staked), Everstake (7%, ~7.6M),
 * Figment (7%, ~17.9M). Devnet: the largest devnet node by stake, one of the
 * Solana Foundation's own practice-network validators.
 *
 * These are a static starting point so the page prerenders without any RPC
 * call; the live set is fetchable from getVoteAccounts at runtime if the
 * picker ever wants to refresh or grow the list.
 */
export const SUGGESTED_VALIDATORS: Record<Cluster, SuggestedValidator[]> = {
  'mainnet-beta': [
    {
      name: 'Helius',
      voteAddress: 'he1iusunGwqrNtafDtLdhsUQDFvo13z9sUa36PauBtk',
      note: 'Run by Helius, a company that builds tools for Solana',
    },
    {
      name: 'Everstake',
      voteAddress: '9QU2QSxhb24FUX3Tu2FpczXjpK3VYrvRudywSZaM29mF',
      note: 'A large community validator that has run for many years',
    },
    {
      name: 'Figment',
      voteAddress: 'CcaHc2L43ZWjwCHART3oZoJvHLAe9hzT2DJNUpBzoTN1',
      note: 'A large validator trusted by institutions',
    },
  ],
  devnet: [
    {
      name: 'Solana Foundation',
      voteAddress: 'vgcDar2pryHvMgPkKaZfh8pQy4BJxv7SpwUG7zinWjG',
      note: 'Run by the Solana Foundation on the practice network',
    },
  ],
}
