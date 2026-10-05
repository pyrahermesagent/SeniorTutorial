/*
 * Glossary content — every term the app explains in plain language.
 * GlossaryTerm links to `/glossary#<slug>`, so each slug here is an anchor
 * on the glossary page. Definitions are written for a reader who has never
 * touched crypto: short, warm, concrete, no unexplained jargon, no emoji.
 * Kept alphabetical by `term`; the page sorts defensively as well.
 * Pinned by test/unit/glossary.test.ts.
 */

export interface GlossaryEntry {
  term: string
  slug: string
  definition: string
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Blockchain',
    slug: 'blockchain',
    definition:
      'A shared notebook that everyone can read and no one can secretly change. Every payment is written down as a new line, and thousands of computers around the world each keep an identical copy.',
  },
  {
    term: 'Decentralized',
    slug: 'decentralized',
    definition:
      'Spread out, with no single company or bank in charge. Many independent computers share the work of keeping the records, so no one person can quietly rewrite them.',
  },
  {
    term: 'Explorer',
    slug: 'explorer',
    definition:
      'A public website where anyone can read what has been written in the shared notebook. If you ever want to check for yourself that a payment really arrived, this is where you look.',
  },
  {
    term: 'Fee',
    slug: 'fee',
    definition:
      'A small charge paid each time you ask the network to do something, like a stamp on a letter. On Solana the fee is usually a fraction of a penny.',
  },
  {
    term: 'Lamport',
    slug: 'lamport',
    definition:
      'The tiniest unit of SOL, like a penny compared to a dollar — only much smaller. One SOL is made of one billion lamports. Computers count in lamports; people count in SOL.',
  },
  {
    term: 'Memecoin',
    slug: 'memecoin',
    definition:
      'A kind of token anyone can create, usually just for fun. It promises nothing and is worth only what people will pay for it — so treat it as entertainment, never as savings.',
  },
  {
    term: 'Public key',
    slug: 'public-key',
    definition:
      'Your address on the network, safe to share with anyone — like the address on your mailbox. People use it to send you money, and knowing it never lets them take anything. It is sometimes called your public address.',
  },
  {
    term: 'Recovery phrase',
    slug: 'recovery-phrase',
    definition:
      'A short list of ordinary words — usually 12 or 24 — that acts as the one and only key to your wallet. Whoever holds those words holds your money. Write the phrase on paper, keep it somewhere safe, and never share it with anyone.',
  },
  {
    term: 'SOL',
    slug: 'sol',
    definition:
      'The money of the Solana network — the coin you hold, send, and use to pay fees. Its value in dollars moves up and down from day to day.',
  },
  {
    term: 'Stablecoin',
    slug: 'stablecoin',
    definition:
      'A digital coin designed to hold a steady value, usually one US dollar. It lets you keep and send dollars on the blockchain without the price jumping up and down.',
  },
  {
    term: 'Staking',
    slug: 'staking',
    definition:
      'Setting aside some of your SOL to help keep the network running safely. In return, the network pays you a little extra SOL over time — a bit like interest on a savings account.',
  },
  {
    term: 'Transaction',
    slug: 'transaction',
    definition:
      'Any action recorded in the shared notebook — most often a payment. Once it is written down, it is permanent and cannot be changed or erased.',
  },
  {
    term: 'Transfer',
    slug: 'transfer',
    definition:
      'Sending money from one address to another. On Solana it arrives in seconds, any day of the week — weekends and holidays included.',
  },
  {
    term: 'USDC',
    slug: 'usdc',
    definition:
      'A popular stablecoin — a digital dollar. One USDC is designed to always be worth exactly one US dollar.',
  },
  {
    term: 'Validator',
    slug: 'validator',
    definition:
      'One of the independent computers that keep the network honest. Validators check every transaction and write it into the shared notebook — with hundreds of them checking each other\'s work, no one can cheat.',
  },
  {
    term: 'Wallet',
    slug: 'wallet',
    definition:
      'An app that holds your keys and lets you receive, keep, and send your money. The money itself never sits inside the app — it lives in the shared notebook, and the wallet is how you reach it.',
  },
]
