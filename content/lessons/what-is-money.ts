import type { LessonSlide } from '../lessons'

/** Glossary terms used by lesson 1 — consumed by the glossary consistency test. */
export const terms = ['transfer', 'fee']

export const slides: LessonSlide[] = [
  {
    icon: 'landmark',
    title: 'Money runs on trust',
    lines: ['Banks keep the official record of who owns what.'],
  },
  {
    icon: 'clock',
    title: 'The old way is slow',
    lines: [
      [
        'A ',
        { term: 'transfer', label: 'transfer' },
        ' abroad takes days and $25+ in ',
        { term: 'fee', label: 'fees' },
        '.',
      ],
      'Weekends do not count.',
    ],
  },
  {
    icon: 'sparkles',
    title: 'A newer kind of money',
    lines: [
      'Since 2009, money can live on the internet itself.',
      'Thousands of computers check each other — no single boss.',
    ],
  },
]
