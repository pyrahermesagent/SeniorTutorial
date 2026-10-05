// @vitest-environment node
/*
 * Glossary consistency guard. Two sources of truth name glossary slugs:
 *  1. the `terms: string[]` pinned in every content/lessons/*.ts file
 *  2. every <GlossaryTerm term="…"> usage across the repo's .vue files
 * Each referenced slug links to /glossary#<slug>, so each one must exist
 * in GLOSSARY (content/glossary.ts) with a plain, emoji-free definition.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GLOSSARY } from '../../content/glossary'

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))

/* The plan's required terms, as slugs (plan task 22). */
const REQUIRED_SLUGS = [
  'wallet',
  'recovery-phrase',
  'public-key',
  'blockchain',
  'validator',
  'decentralized',
  'transaction',
  'fee',
  'sol',
  'lamport',
  'stablecoin',
  'usdc',
  'staking',
  'memecoin',
  'explorer',
]

/* Standard emoji blocks, regional flags, misc symbols and the variation
   selector — plain body text never contains these. */
const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{203C}\u{2049}]/u

const glossarySlugs = GLOSSARY.map((entry) => entry.slug)

async function loadLessonTerms(): Promise<{ file: string; terms: unknown }[]> {
  const dir = path.join(REPO_ROOT, 'content', 'lessons')
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .sort()
  return Promise.all(
    files.map(async (file) => ({
      file,
      terms: (await import(pathToFileURL(path.join(dir, file)).href)).terms,
    })),
  )
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.nuxt',
  '.output',
  '.vite-temp',
  'dist',
  'test',
  'docs',
  '.superpowers',
])

function collectVueFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectVueFiles(full))
    } else if (entry.endsWith('.vue')) {
      files.push(full)
    }
  }
  return files
}

/* All slugs handed to <GlossaryTerm term="…"> in one .vue source file. */
function extractGlossaryTermSlugs(source: string): string[] {
  const slugs: string[] = []
  for (const match of source.matchAll(/<GlossaryTerm\b[^>]*?\bterm="([^"]+)"/g)) {
    slugs.push(match[1]!)
  }
  return slugs
}

describe('GLOSSARY content model', () => {
  it('has at least 14 entries', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(14)
  })

  it('has unique slugs', () => {
    expect(new Set(glossarySlugs).size).toBe(glossarySlugs.length)
  })

  it('covers every term required by the plan', () => {
    for (const slug of REQUIRED_SLUGS) {
      expect(glossarySlugs, `missing glossary entry for "${slug}"`).toContain(slug)
    }
  })

  it('gives every entry a non-empty term, a kebab-case slug, and a non-empty definition', () => {
    for (const entry of GLOSSARY) {
      expect(entry.term.trim().length, `empty term on slug "${entry.slug}"`).toBeGreaterThan(0)
      expect(entry.slug, `slug "${entry.slug}" is not kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(entry.definition.trim().length, `empty definition for "${entry.slug}"`).toBeGreaterThan(0)
    }
  })

  it('keeps every definition short and free of emoji', () => {
    for (const entry of GLOSSARY) {
      expect(entry.definition.length, `definition for "${entry.slug}" is too long`).toBeLessThanOrEqual(400)
      expect(EMOJI_PATTERN.test(entry.definition), `emoji in definition for "${entry.slug}"`).toBe(false)
    }
  })

  it('every lesson content file pins a terms list, and every pinned term exists in the glossary', async () => {
    const lessons = await loadLessonTerms()
    expect(lessons.length).toBeGreaterThan(0)
    for (const { file, terms } of lessons) {
      expect(Array.isArray(terms), `content/lessons/${file} must export a terms: string[]`).toBe(true)
      expect((terms as string[]).length, `content/lessons/${file} pins no glossary terms`).toBeGreaterThan(0)
      for (const term of terms as string[]) {
        expect(glossarySlugs, `content/lessons/${file} uses "${term}" with no glossary entry`).toContain(term)
      }
    }
  })

  it('every <GlossaryTerm term="…"> in the repo exists in the glossary', () => {
    const vueFiles = collectVueFiles(REPO_ROOT)
    expect(vueFiles.length).toBeGreaterThan(0)
    for (const file of vueFiles) {
      const slugs = extractGlossaryTermSlugs(readFileSync(file, 'utf8'))
      for (const slug of slugs) {
        expect(glossarySlugs, `${file} links to /glossary#${slug} with no glossary entry`).toContain(slug)
      }
    }
  })
})
