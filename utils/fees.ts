/*
 * Fee math for the lesson-4 "Why Solana?" fee comparison slider.
 * Pure functions — the Vue component is a thin wrapper and tests drive
 * these directly.
 *
 * The bank figure is a typical bank/wire estimate: a flat $25 minimum
 * (a common wire fee — the same $50 → $25 story as lesson 1) plus 1% of
 * the amount once that grows larger. Solana's fee is a flat phrase, not
 * a number: it is always less than a penny, whatever the amount.
 */

export const BANK_FLAT_FEE_USD = 25
export const BANK_PERCENT_RATE = 0.01

/** Typical bank/wire cost in USD for sending `amountUsd`. */
export function bankFeeEstimate(amountUsd: number): number {
  return Math.max(BANK_FLAT_FEE_USD, amountUsd * BANK_PERCENT_RATE)
}

/** Solana's fee never depends on the amount, so it is described, not computed. */
export function describeSolanaFee(): string {
  return 'less than $0.01'
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
})

export function formatUsd(amount: number): string {
  return usdFormatter.format(amount)
}
