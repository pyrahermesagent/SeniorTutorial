// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bankFeeEstimate, describeSolanaFee, formatUsd } from '../../utils/fees'

describe('bankFeeEstimate', () => {
  it('charges the flat $25 minimum on a $50 transfer', () => {
    expect(bankFeeEstimate(50)).toBe(25)
  })

  it('charges 1% once that exceeds the flat minimum ($5,000 → $50)', () => {
    expect(bankFeeEstimate(5000)).toBe(50)
  })

  it('never drops below the flat minimum', () => {
    expect(bankFeeEstimate(1)).toBe(25)
    expect(bankFeeEstimate(2499)).toBe(25)
  })

  it('crosses over to the percentage at $2,500', () => {
    expect(bankFeeEstimate(2500)).toBe(25)
    expect(bankFeeEstimate(10000)).toBe(100)
  })
})

describe('formatUsd', () => {
  it('formats dollars with cents and thousands separators', () => {
    expect(formatUsd(25)).toBe('$25.00')
    expect(formatUsd(50)).toBe('$50.00')
    expect(formatUsd(5000)).toBe('$5,000.00')
  })
})

describe('describeSolanaFee', () => {
  it('is always the same flat phrase', () => {
    expect(describeSolanaFee()).toBe('less than $0.01')
  })
})
