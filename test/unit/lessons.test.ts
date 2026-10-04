// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LESSONS } from '../../content/lessons'
import { iconMap } from '../../utils/icons'

const EXPECTED_SLUGS = [
  'what-is-money',
  'shared-notebook',
  'whos-in-charge',
  'why-solana',
  'wallets-and-keys',
  'staying-safe',
]

describe('LESSONS content model', () => {
  it('contains exactly six lessons', () => {
    expect(LESSONS).toHaveLength(6)
  })

  it('lists the exact spec slugs in order', () => {
    expect(LESSONS.map((lesson) => lesson.slug)).toEqual(EXPECTED_SLUGS)
  })

  it('has unique slugs', () => {
    const slugs = LESSONS.map((lesson) => lesson.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every lesson a title, tagline, positive minute estimate, and icon', () => {
    for (const lesson of LESSONS) {
      expect(lesson.title.trim().length).toBeGreaterThan(0)
      expect(lesson.tagline.trim().length).toBeGreaterThan(0)
      expect(Number.isInteger(lesson.minutes)).toBe(true)
      expect(lesson.minutes).toBeGreaterThan(0)
      expect(lesson.icon.trim().length).toBeGreaterThan(0)
    }
  })

  it('only references icons registered in the curated icon map', () => {
    for (const lesson of LESSONS) {
      expect(iconMap[lesson.icon], `missing icon for "${lesson.icon}"`).toBeDefined()
    }
  })
})
