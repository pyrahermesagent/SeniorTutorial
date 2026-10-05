import { describe, expect, it } from 'vitest'
import { CHALLENGES, difficultyLabel } from '../../utils/challenges'
import { iconMap } from '../../utils/icons'
import { isChallengeId } from '../../utils/progress'

describe('CHALLENGES', () => {
  it('lists the four challenges in spec order', () => {
    expect(CHALLENGES.map((challenge) => challenge.id)).toEqual([
      'transfer',
      'swap',
      'stake',
      'memecoin',
    ])
  })

  it('uses pinned challenge ids that pass isChallengeId', () => {
    for (const challenge of CHALLENGES) {
      expect(isChallengeId(challenge.id)).toBe(true)
    }
  })

  it('gives every challenge a title, blurb, icon, and difficulty', () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.title.trim().length, `${challenge.id} title`).toBeGreaterThan(0)
      expect(challenge.blurb.trim().length, `${challenge.id} blurb`).toBeGreaterThan(0)
      expect(challenge.icon.trim().length, `${challenge.id} icon`).toBeGreaterThan(0)
      expect([1, 2, 3], `${challenge.id} difficulty`).toContain(challenge.difficulty)
    }
  })

  it('matches the pinned titles, icons, and difficulties', () => {
    expect(CHALLENGES.map(({ id, title, icon, difficulty }) => [id, title, icon, difficulty])).toEqual([
      ['transfer', 'Send SOL to someone', 'send', 1],
      ['swap', 'Swap SOL for USDC', 'arrow-left-right', 2],
      ['stake', 'Stake your SOL', 'layers', 2],
      ['memecoin', 'Create your own memecoin', 'sparkles', 3],
    ])
  })

  it('only uses icons that exist in the curated icon map', () => {
    for (const challenge of CHALLENGES) {
      expect(iconMap[challenge.icon], `icon "${challenge.icon}"`).toBeDefined()
    }
  })
})

describe('difficultyLabel', () => {
  it('renders difficulty as friendly words', () => {
    expect(difficultyLabel(1)).toBe('Easy')
    expect(difficultyLabel(2)).toBe('Medium')
    expect(difficultyLabel(3)).toBe('A bit adventurous')
  })
})
