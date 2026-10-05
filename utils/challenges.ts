import type { ChallengeId } from './progress'

export interface ChallengeMeta {
  id: ChallengeId
  title: string
  blurb: string
  icon: string
  difficulty: 1 | 2 | 3
}

/*
 * The four hands-on challenges, in the order learners meet them (easiest
 * first). Challenge pages land in Tasks 18–21 under /challenges/<id>.
 */
export const CHALLENGES: ChallengeMeta[] = [
  {
    id: 'transfer',
    title: 'Send SOL to someone',
    blurb: 'Send a little SOL to another wallet and watch it arrive in seconds.',
    icon: 'send',
    difficulty: 1,
  },
  {
    id: 'swap',
    title: 'Swap SOL for USDC',
    blurb: 'Swap a little of your SOL for a different coin, called USDC.',
    icon: 'arrow-left-right',
    difficulty: 2,
  },
  {
    id: 'stake',
    title: 'Stake your SOL',
    blurb: 'Put your SOL to work helping the network, and earn a little extra over time.',
    icon: 'layers',
    difficulty: 2,
  },
  {
    id: 'memecoin',
    title: 'Create your own memecoin',
    blurb: 'Make your very own coin from scratch — just for fun, and just for practice.',
    icon: 'sparkles',
    difficulty: 3,
  },
]

const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'A bit adventurous',
}

export function difficultyLabel(difficulty: 1 | 2 | 3): string {
  return DIFFICULTY_LABELS[difficulty]
}
