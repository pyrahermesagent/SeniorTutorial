/*
 * Lesson content model — metadata for the six lessons of the Learn track,
 * in the order of spec §5. Lesson bodies arrive as content/lessons/<slug>.ts
 * in later tasks; this index drives the /learn overview and its routes.
 * `icon` must be a key of the curated icon map in utils/icons.ts.
 */

export interface LessonMeta {
  slug: string
  title: string
  tagline: string
  minutes: number
  icon: string
}

/*
 * Slide model for the slideshow presentation. One slide = one idea: a short
 * title plus at most two lines. A line is plain text, or an array of text
 * pieces and inline glossary links so key words stay tappable.
 */
export interface GlossaryLink {
  /** Glossary slug — must exist in content/glossary.ts. */
  term: string
  /** Displayed wording; defaults to the term slug itself. */
  label?: string
}

export type SlideLine = string | Array<string | GlossaryLink>

export interface LessonSlide {
  /** Optional hero icon for the slide; a key of the curated icon map. */
  icon?: string
  title: string
  lines: SlideLine[]
}

export const LESSONS: LessonMeta[] = [
  {
    slug: 'what-is-money',
    title: 'What is money, anyway?',
    tagline: 'Why we trust banks — and where they fall short.',
    minutes: 5,
    icon: 'coins',
  },
  {
    slug: 'shared-notebook',
    title: 'The shared notebook',
    tagline: 'A notebook everyone can check, and no one can secretly change.',
    minutes: 6,
    icon: 'notebook-pen',
  },
  {
    slug: 'whos-in-charge',
    title: "Who's in charge here?",
    tagline: 'What it means when no single company runs the show.',
    minutes: 5,
    icon: 'network',
  },
  {
    slug: 'why-solana',
    title: 'Why Solana?',
    tagline: 'Fast, low-cost, and open to everyone — here is what makes it special.',
    minutes: 5,
    icon: 'zap',
  },
  {
    slug: 'wallets-and-keys',
    title: 'Your wallet and your keys',
    tagline: 'How a wallet holds your money, and why your keys matter.',
    minutes: 8,
    icon: 'key-round',
  },
  {
    slug: 'staying-safe',
    title: 'Staying safe',
    tagline: 'Simple habits that keep your money and your information safe.',
    minutes: 6,
    icon: 'shield-check',
  },
]
