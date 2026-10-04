/*
 * Lesson-specific progress helpers — a thin facade over useProgress that
 * knows the LESSONS index, so pages do not re-derive counts or slug checks.
 */

import { computed } from 'vue'
import { LESSONS } from '~/content/lessons'
import { useProgress } from './useProgress'

export function useLessonProgress() {
  const { state, markLessonDone } = useProgress()

  function isLessonDone(slug: string): boolean {
    return state.value.lessonsDone.includes(slug)
  }

  const doneCount = computed(
    () => LESSONS.filter((lesson) => state.value.lessonsDone.includes(lesson.slug)).length,
  )

  return {
    doneCount,
    totalCount: LESSONS.length,
    isLessonDone,
    markLessonDone,
  }
}
