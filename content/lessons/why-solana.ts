import type { LessonSlide } from '../lessons'

/** Glossary terms used by lesson 4 — consumed by the glossary consistency test. */
export const terms = ['fee', 'transaction']

export const slides: LessonSlide[] = [
  {
    icon: 'zap',
    title: 'Fast as a text message',
    lines: [
      'Tap send — it lands in about a second.',
      ['Every ', { term: 'transaction' }, ' is checked in moments, any hour, any day.'],
    ],
  },
  {
    icon: 'coins',
    title: 'Costs a crumb',
    lines: [
      ['A bank wire costs $25+. A Solana ', { term: 'fee', label: 'fee' }, ' is under a penny.'],
      'Slide next and compare for yourself.',
    ],
  },
  {
    icon: 'clock',
    title: 'Always on',
    lines: [
      'Running 24/7 for years. The numbers coming up are live, right now.',
      'Honest note: SOL’s price moves — speed and fees do not. So we practice small.',
    ],
  },
]
