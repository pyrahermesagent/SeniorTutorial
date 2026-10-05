import type { LessonSlide } from '../lessons'

/** Glossary terms used by lesson 3 — consumed by the glossary consistency test. */
export const terms = ['decentralized', 'validator']

export const slides: LessonSlide[] = [
  {
    icon: 'landmark',
    title: 'One boss, one off-switch',
    lines: [
      "Banks and email run on one company's computers.",
      'When that company stumbles, everyone stops.',
    ],
  },
  {
    icon: 'network',
    title: 'Many keepers instead',
    lines: [
      [
        'Solana is kept by independent ',
        { term: 'validator', label: 'validators' },
        ' — no single boss.',
      ],
      [{ term: 'decentralized' }, ' means the power is spread out.'],
    ],
  },
  {
    icon: 'server-off',
    title: 'No off-switch',
    lines: ['No one can shut it down or quietly change the rules.'],
  },
]
