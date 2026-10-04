import { describe, expect, it } from 'vitest'
import {
  initialProgress,
  loadProgress,
  markChallengeDone,
  markLessonDone,
  saveProgress,
  saveQuizScore,
  PROGRESS_STORAGE_KEY,
  type ChallengeId,
  type ProgressState,
} from '../../utils/progress'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

describe('initialProgress', () => {
  it('returns an empty state', () => {
    expect(initialProgress()).toEqual({
      lessonsDone: [],
      challengesDone: [],
      quiz: {},
    })
  })

  it('returns a fresh object on every call', () => {
    const a = initialProgress()
    const b = initialProgress()
    expect(a).not.toBe(b)
    expect(a.lessonsDone).not.toBe(b.lessonsDone)
    a.lessonsDone.push('x')
    expect(b.lessonsDone).toEqual([])
  })
})

describe('markLessonDone', () => {
  it('adds a slug', () => {
    const next = markLessonDone(initialProgress(), 'what-is-solana')
    expect(next.lessonsDone).toEqual(['what-is-solana'])
  })

  it('is idempotent for the same slug', () => {
    const once = markLessonDone(initialProgress(), 'what-is-solana')
    const twice = markLessonDone(once, 'what-is-solana')
    expect(twice.lessonsDone).toEqual(['what-is-solana'])
  })

  it('keeps distinct slugs in order', () => {
    let s = initialProgress()
    s = markLessonDone(s, 'a')
    s = markLessonDone(s, 'b')
    s = markLessonDone(s, 'a')
    expect(s.lessonsDone).toEqual(['a', 'b'])
  })

  it('does not mutate the input state', () => {
    const before = initialProgress()
    markLessonDone(before, 'a')
    expect(before.lessonsDone).toEqual([])
  })
})

describe('markChallengeDone', () => {
  it('accepts every id in the union', () => {
    const ids: ChallengeId[] = ['transfer', 'swap', 'stake', 'memecoin']
    let s = initialProgress()
    for (const id of ids) s = markChallengeDone(s, id)
    expect(s.challengesDone).toEqual(ids)
  })

  it('is idempotent for the same id', () => {
    const once = markChallengeDone(initialProgress(), 'swap')
    const twice = markChallengeDone(once, 'swap')
    expect(twice.challengesDone).toEqual(['swap'])
  })

  it('rejects ids outside the union', () => {
    const s = initialProgress()
    expect(() => markChallengeDone(s, 'bogus' as ChallengeId)).toThrow()
    expect(s.challengesDone).toEqual([])
  })
})

describe('saveQuizScore', () => {
  it('records score and total per lesson slug', () => {
    const s = saveQuizScore(initialProgress(), 'what-is-solana', 4, 5)
    expect(s.quiz).toEqual({ 'what-is-solana': { score: 4, total: 5 } })
  })

  it('overwrites a previous score for the same slug', () => {
    let s = saveQuizScore(initialProgress(), 'what-is-solana', 2, 5)
    s = saveQuizScore(s, 'what-is-solana', 5, 5)
    expect(s.quiz['what-is-solana']).toEqual({ score: 5, total: 5 })
  })
})

describe('loadProgress', () => {
  it('returns the initial state when nothing is stored', () => {
    expect(loadProgress(fakeStorage())).toEqual(initialProgress())
  })

  it('returns the initial state for corrupted JSON', () => {
    const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: 'not-json{{' })
    expect(loadProgress(storage)).toEqual(initialProgress())
  })

  it('returns the initial state for valid JSON of the wrong shape', () => {
    for (const raw of ['null', '42', '"text"', '[1,2]']) {
      const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: raw })
      expect(loadProgress(storage)).toEqual(initialProgress())
    }
  })

  it('drops malformed entries from a partially valid document', () => {
    const storage = fakeStorage({
      [PROGRESS_STORAGE_KEY]: JSON.stringify({
        lessonsDone: ['a', 7, null, 'b'],
        challengesDone: ['swap', 'bogus', 'stake'],
        quiz: {
          good: { score: 3, total: 5 },
          bad: { score: '3', total: 5 },
          worse: 'nope',
        },
        cluster: 'devnet',
        lastWallet: 'Phantom',
      }),
    })
    expect(loadProgress(storage)).toEqual({
      lessonsDone: ['a', 'b'],
      challengesDone: ['swap', 'stake'],
      quiz: { good: { score: 3, total: 5 } },
      cluster: 'devnet',
      lastWallet: 'Phantom',
    } satisfies ProgressState)
  })

  it('drops an unknown cluster value', () => {
    const storage = fakeStorage({
      [PROGRESS_STORAGE_KEY]: JSON.stringify({ ...initialProgress(), cluster: 'testnet' }),
    })
    expect(loadProgress(storage).cluster).toBeUndefined()
  })
})

describe('save/load round-trip', () => {
  it('persists and restores the full state under the st: prefix', () => {
    const storage = fakeStorage()
    let s = initialProgress()
    s = markLessonDone(s, 'what-is-solana')
    s = markChallengeDone(s, 'transfer')
    s = saveQuizScore(s, 'what-is-solana', 5, 5)
    s = { ...s, cluster: 'devnet', lastWallet: 'Phantom' }

    saveProgress(storage, s)

    expect([...storage.data.keys()].every((k) => k.startsWith('st:'))).toBe(true)
    expect(loadProgress(storage)).toEqual(s)
  })
})
