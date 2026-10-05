import { useState } from '#imports'
import {
  initialProgress,
  loadProgress,
  markChallengeDone as applyChallengeDone,
  markLessonDone as applyLessonDone,
  saveProgress,
  saveQuizScore as applyQuizScore,
  type ChallengeId,
  type Cluster,
  type ProgressState,
} from '~/utils/progress'

export function useProgress() {
  const state = useState<ProgressState>('progress', () => initialProgress())
  const loaded = useState<boolean>('progress-loaded', () => false)

  if (import.meta.client && !loaded.value) {
    state.value = loadProgress(window.localStorage)
    loaded.value = true
  }

  function persist() {
    if (import.meta.client) {
      saveProgress(window.localStorage, state.value)
    }
  }

  function markLessonDone(slug: string) {
    state.value = applyLessonDone(state.value, slug)
    persist()
  }

  function markChallengeDone(id: ChallengeId) {
    state.value = applyChallengeDone(state.value, id)
    persist()
  }

  function isChallengeDone(id: ChallengeId) {
    return state.value.challengesDone.includes(id)
  }

  function saveQuizScore(slug: string, score: number, total: number) {
    state.value = applyQuizScore(state.value, slug, score, total)
    persist()
  }

  function setCluster(cluster: Cluster) {
    state.value = { ...state.value, cluster }
    persist()
  }

  function setLastWallet(name: string | undefined) {
    state.value = { ...state.value, lastWallet: name }
    persist()
  }

  return {
    state,
    markLessonDone,
    markChallengeDone,
    isChallengeDone,
    saveQuizScore,
    setCluster,
    setLastWallet,
  }
}
