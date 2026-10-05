import { describe, expect, it } from 'vitest'
import { ONRAMPS, WALLETS } from '../../utils/onramps'

const SAMPLE_ADDRESS = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'

describe('WALLETS', () => {
  it('lists Solflare and Phantom with equal prominence', () => {
    expect(WALLETS.map((w) => w.name)).toEqual(['Solflare', 'Phantom'])
  })

  it('pins the exact Google Play Store URLs', () => {
    const solflare = WALLETS.find((w) => w.name === 'Solflare')!
    const phantom = WALLETS.find((w) => w.name === 'Phantom')!
    expect(solflare.playStoreUrl).toBe(
      'https://play.google.com/store/apps/details?id=com.solflare.mobile',
    )
    expect(phantom.playStoreUrl).toBe('https://play.google.com/store/apps/details?id=app.phantom')
  })

  it('gives every wallet an App Store link, an extension link, and a blurb', () => {
    for (const wallet of WALLETS) {
      expect(wallet.appStoreUrl).toMatch(/^https:\/\/apps\.apple\.com\//)
      expect(wallet.extensionUrl).toMatch(/^https:\/\//)
      expect(wallet.blurb.length).toBeGreaterThan(0)
    }
  })
})

describe('ONRAMPS', () => {
  it('lists Coinbase Pay, MoonPay, and Topper', () => {
    expect(ONRAMPS.map((o) => o.name)).toEqual(['Coinbase Pay', 'MoonPay', 'Topper'])
  })

  it('MoonPay pre-fills the wallet address (documented walletAddress param)', () => {
    const moonpay = ONRAMPS.find((o) => o.name === 'MoonPay')!
    const url = moonpay.buildUrl(SAMPLE_ADDRESS)
    expect(url.startsWith('https://buy.moonpay.com')).toBe(true)
    expect(url).toContain(`walletAddress=${SAMPLE_ADDRESS}`)
    expect(url).toContain('currencyCode=sol')
  })

  it('Topper pre-fills the wallet address (undocumented today — may silently degrade)', () => {
    const topper = ONRAMPS.find((o) => o.name === 'Topper')!
    const url = topper.buildUrl(SAMPLE_ADDRESS)
    expect(url.startsWith('https://app.topperpay.com')).toBe(true)
    expect(url).toContain(`walletAddress=${SAMPLE_ADDRESS}`)
    expect(url).toContain('cryptoCurrency=SOL')
  })

  it('Coinbase Pay cannot pre-fill without a registered appId, so it returns a plain URL and says so', () => {
    const coinbase = ONRAMPS.find((o) => o.name === 'Coinbase Pay')!
    const url = coinbase.buildUrl(SAMPLE_ADDRESS)
    expect(url).toBe('https://www.coinbase.com/how-to-buy/solana')
    expect(url).not.toContain(SAMPLE_ADDRESS)
    // Honest UI copy: the learner will paste their address themselves.
    expect(coinbase.note).toMatch(/paste/i)
  })

  it('every onramp carries a plain-English note', () => {
    for (const onramp of ONRAMPS) {
      expect(onramp.note.length).toBeGreaterThan(0)
    }
  })
})
