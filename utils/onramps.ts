/*
 * Wallet install links and fiat on-ramps for the Getting Started page.
 * Play Store URLs are pinned by the design spec; App Store / extension
 * links were verified to resolve. Onramp address-prefilling: only MoonPay
 * documents its `walletAddress` parameter. Topper's prefill works in the
 * live app today but is undocumented and may silently degrade — if it does,
 * fall back to the plain URL + paste note like Coinbase. Coinbase Pay needs
 * a registered appId for prefill, so it links to its plain Solana buying
 * guide and the note tells the learner to paste their address themselves.
 */

export interface WalletInstallEntry {
  name: 'Solflare' | 'Phantom'
  playStoreUrl: string
  appStoreUrl: string
  extensionUrl: string
  blurb: string
}

export interface OnrampEntry {
  name: string
  buildUrl: (address: string) => string
  note: string
}

export const WALLETS: WalletInstallEntry[] = [
  {
    name: 'Solflare',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
    appStoreUrl: 'https://apps.apple.com/app/solflare/id1580902717',
    extensionUrl: 'https://solflare.com/download',
    blurb: 'A Solana wallet made for this network — free, and friendly for beginners.',
  },
  {
    name: 'Phantom',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=app.phantom',
    appStoreUrl: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
    extensionUrl: 'https://phantom.com/download',
    blurb: 'The most popular Solana wallet — free, and works on phones and computers.',
  },
]

export const ONRAMPS: OnrampEntry[] = [
  {
    name: 'Coinbase Pay',
    buildUrl: () => 'https://www.coinbase.com/how-to-buy/solana',
    note: 'Coinbase cannot fill in your address ahead of time — copy it from your wallet and paste it when they ask where to send your SOL.',
  },
  {
    name: 'MoonPay',
    buildUrl: (address) =>
      `https://buy.moonpay.com?currencyCode=sol&walletAddress=${encodeURIComponent(address)}`,
    note: 'Your wallet address is filled in for you. MoonPay will ask you to prove your identity before you buy.',
  },
  {
    name: 'Topper',
    buildUrl: (address) =>
      `https://app.topperpay.com/?cryptoCurrency=SOL&walletAddress=${encodeURIComponent(address)}`,
    note: 'Your wallet address is filled in for you. Topper will ask you to prove your identity before you buy.',
  },
]
