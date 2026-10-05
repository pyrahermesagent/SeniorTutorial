// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CLUSTERS, isValidSolanaAddress, type Cluster } from '../../utils/cluster'
import { SUGGESTED_VALIDATORS } from '../../utils/validators'

const CLUSTER_IDS = Object.keys(CLUSTERS) as Cluster[]

describe('SUGGESTED_VALIDATORS', () => {
  it('offers at least one suggestion for every cluster the app supports', () => {
    for (const cluster of CLUSTER_IDS) {
      expect(
        SUGGESTED_VALIDATORS[cluster]?.length,
        `${cluster} has no suggested validators`,
      ).toBeGreaterThan(0)
    }
  })

  it('suggests exactly three well-known validators on mainnet', () => {
    expect(SUGGESTED_VALIDATORS['mainnet-beta']).toHaveLength(3)
  })

  it('only uses real, on-curve-looking Solana vote account addresses', () => {
    for (const cluster of CLUSTER_IDS) {
      for (const validator of SUGGESTED_VALIDATORS[cluster]) {
        expect(
          isValidSolanaAddress(validator.voteAddress),
          `${validator.name} (${cluster}) vote address ${validator.voteAddress} is malformed`,
        ).toBe(true)
      }
    }
  })

  it('never repeats a vote address within a cluster', () => {
    for (const cluster of CLUSTER_IDS) {
      const addresses = SUGGESTED_VALIDATORS[cluster].map((v) => v.voteAddress)
      expect(new Set(addresses).size).toBe(addresses.length)
    }
  })

  it('gives every suggestion a plain-language name and one-line note', () => {
    for (const cluster of CLUSTER_IDS) {
      for (const validator of SUGGESTED_VALIDATORS[cluster]) {
        expect(validator.name.trim().length).toBeGreaterThan(0)
        expect(validator.note.trim().length).toBeGreaterThan(0)
        // A note is a single plain sentence — never a wall of text.
        expect(validator.note.trim().split('\n')).toHaveLength(1)
      }
    }
  })
})
