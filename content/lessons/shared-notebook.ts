import type { LessonSlide } from '../lessons'

/** Glossary terms used by lesson 2 — consumed by the glossary consistency test. */
export const terms = ['blockchain', 'validator']

export const slides: LessonSlide[] = [
  {
    icon: 'notebook-pen',
    title: 'One notebook, many keepers',
    lines: [
      'Solana keeps one shared record book.',
      [
        'It is a ',
        { term: 'blockchain' },
        ', kept honest by ',
        { term: 'validator', label: 'validators' },
        '.',
      ],
    ],
  },
  {
    icon: 'x',
    title: 'Cheating fails by itself',
    lines: ['Change your copy and it becomes the odd one out.', 'All the other copies vote it down.'],
  },
  {
    icon: 'circle-check',
    title: 'Trust what you can see',
    lines: ['Every line is public. You can check any record yourself.'],
  },
]
