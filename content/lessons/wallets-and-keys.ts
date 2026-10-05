import type { LessonSlide } from '../lessons'

/** Glossary terms used by lesson 5 — consumed by the glossary consistency test. */
export const terms = ['wallet', 'public-key', 'recovery-phrase']

export const slides: LessonSlide[] = [
  {
    icon: 'wallet',
    title: 'Money lives in the notebook',
    lines: [
      [
        'A ',
        { term: 'wallet', label: 'wallet' },
        ' holds no coins — it holds the proof they are yours.',
      ],
    ],
  },
  {
    icon: 'send',
    title: 'Address: share freely',
    lines: [
      [
        'Your ',
        { term: 'public-key', label: 'public address' },
        ' is like the address on a mailbox — safe to share.',
      ],
    ],
  },
  {
    icon: 'key-round',
    title: 'Key: share with no one',
    lines: [
      [
        'Your ',
        { term: 'recovery-phrase', label: 'recovery phrase' },
        ' is the only key to the mailbox.',
      ],
      'Anyone who asks for it is a thief.',
    ],
  },
]
