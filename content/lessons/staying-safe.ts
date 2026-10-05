import type { LessonSlide } from '../lessons'

/**
 * Lesson 6 — safety quiz content.
 * Shape matches QuizBlock's QuizQuestion; kept dependency-free so the data
 * stays usable from plain unit tests.
 */

/** Glossary terms used by lesson 6 — consumed by the glossary consistency test. */
export const terms = ['recovery-phrase', 'wallet']

export const slides: LessonSlide[] = [
  {
    icon: 'shield-check',
    title: 'The one rule',
    lines: [
      ['Never share your ', { term: 'recovery-phrase', label: 'recovery phrase' }, '. Ever.'],
      ['Real ', { term: 'wallet', label: 'wallet' }, ' support will never ask for it.'],
    ],
  },
  {
    icon: 'triangle-alert',
    title: 'Spot the tricks',
    lines: ['They rush you — and ask for something secret.', 'Hang up. Delete. Breathe.'],
  },
  {
    icon: 'send',
    title: 'Send with care',
    lines: [
      'Check the first and last characters of the address.',
      'Trying something new? Send a small test first.',
    ],
  },
]

export interface SafetyQuestion {
  q: string
  options: string[]
  answer: number
  explain: string
}

export const SAFETY_QUESTIONS: SafetyQuestion[] = [
  {
    q: 'Who may you share your recovery phrase with?',
    options: [
      'The wallet company\'s support team, if they ask for it',
      'No one, ever — not even family or "support"',
      'A close family member, just in case you forget it',
    ],
    answer: 1,
    explain:
      'Your recovery phrase is the only key to your money — anyone who holds it can take everything, so it stays with you alone.',
  },
  {
    q: 'Someone calls saying they are from your wallet\'s support team and need information to "fix a problem". What do you do?',
    options: [
      'Answer their questions — they sound official',
      'Read them your recovery phrase so they can verify you',
      'Hang up — real support will never call you or ask for your details',
    ],
    answer: 2,
    explain:
      'The bank will never call you asking for your password — and no real wallet support will ever ask for your recovery phrase.',
  },
  {
    q: 'Before you send money to someone, what should you do with their address?',
    options: [
      'Check that the first and last characters match exactly what they gave you',
      'Glance at it — if it looks about right, it is fine',
      'Nothing — the app checks every address for you',
    ],
    answer: 0,
    explain:
      'A single wrong character sends the money to a stranger, and there is no way to get it back — a careful check takes seconds.',
  },
  {
    q: 'How much money should you start with when you try this for the first time?',
    options: [
      'Your full savings, so it can grow faster',
      'Half of what you have, to be safe',
      'A small amount you could afford to lose while you are learning',
    ],
    answer: 2,
    explain:
      'Starting small means a mistake costs pennies, not savings — you can always add more once it feels familiar.',
  },
]
