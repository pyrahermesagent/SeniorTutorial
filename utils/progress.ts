/*
 * Progress persistence — pure functions over an injected storage.
 * `Cluster` is defined in utils/cluster.ts and re-exported here so existing
 * imports keep working.
 */

import type { Cluster } from './cluster'

export type { Cluster } from './cluster'

export type ChallengeId = 'transfer' | 'swap' | 'stake' | 'memecoin'

export interface QuizScore {
  score: number
  total: number
}

export interface ProgressState {
  lessonsDone: string[]
  challengesDone: ChallengeId[]
  quiz: Record<string, QuizScore>
  cluster?: Cluster
  lastWallet?: string
}

export interface ProgressStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const PROGRESS_STORAGE_KEY = 'st:progress'

const CHALLENGE_IDS: readonly ChallengeId[] = ['transfer', 'swap', 'stake', 'memecoin']
const CLUSTERS: readonly Cluster[] = ['mainnet-beta', 'devnet']

export function isChallengeId(value: unknown): value is ChallengeId {
  return typeof value === 'string' && (CHALLENGE_IDS as readonly string[]).includes(value)
}

export function initialProgress(): ProgressState {
  return { lessonsDone: [], challengesDone: [], quiz: {} }
}

function normalize(parsed: unknown): ProgressState {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return initialProgress()
  }
  const raw = parsed as Record<string, unknown>
  const state = initialProgress()

  if (Array.isArray(raw.lessonsDone)) {
    state.lessonsDone = raw.lessonsDone.filter(
      (slug): slug is string => typeof slug === 'string',
    )
  }
  if (Array.isArray(raw.challengesDone)) {
    state.challengesDone = raw.challengesDone.filter(isChallengeId)
  }
  if (typeof raw.quiz === 'object' && raw.quiz !== null && !Array.isArray(raw.quiz)) {
    for (const [slug, entry] of Object.entries(raw.quiz as Record<string, unknown>)) {
      if (typeof entry !== 'object' || entry === null) continue
      const { score, total } = entry as Record<string, unknown>
      if (typeof score === 'number' && typeof total === 'number') {
        state.quiz[slug] = { score, total }
      }
    }
  }
  if (typeof raw.cluster === 'string' && (CLUSTERS as readonly string[]).includes(raw.cluster)) {
    state.cluster = raw.cluster as Cluster
  }
  if (typeof raw.lastWallet === 'string') {
    state.lastWallet = raw.lastWallet
  }
  return state
}

export function loadProgress(storage: ProgressStorage): ProgressState {
  const raw = storage.getItem(PROGRESS_STORAGE_KEY)
  if (raw === null) return initialProgress()
  try {
    return normalize(JSON.parse(raw))
  } catch {
    return initialProgress()
  }
}

export function saveProgress(storage: ProgressStorage, state: ProgressState): void {
  storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state))
}

export function markLessonDone(state: ProgressState, slug: string): ProgressState {
  if (state.lessonsDone.includes(slug)) return state
  return { ...state, lessonsDone: [...state.lessonsDone, slug] }
}

export function markChallengeDone(state: ProgressState, id: ChallengeId): ProgressState {
  if (!isChallengeId(id)) {
    throw new TypeError(`Unknown challenge id: ${String(id)}`)
  }
  if (state.challengesDone.includes(id)) return state
  return { ...state, challengesDone: [...state.challengesDone, id] }
}

export function saveQuizScore(
  state: ProgressState,
  slug: string,
  score: number,
  total: number,
): ProgressState {
  return { ...state, quiz: { ...state.quiz, [slug]: { score, total } } }
}
