/*
 * Ledger state for the lesson-2 "shared notebook" simulation.
 * Pure functions over immutable state — the Vue component is a thin wrapper
 * and tests drive these directly.
 */

export interface NotebookCopy {
  entries: string[]
  status: 'ok' | 'tampered' | 'rejected'
}

export const VALIDATOR_COUNT = 4

export function createLedger(): NotebookCopy[] {
  return Array.from({ length: VALIDATOR_COUNT }, () => ({ entries: [], status: 'ok' }))
}

/** Writes the line into every copy; a freshly shared line clears any old rejected mark. */
export function addEntry(copies: NotebookCopy[], entry: string): NotebookCopy[] {
  const text = entry.trim()
  if (text === '') {
    return copies
  }
  return copies.map((copy) => ({ entries: [...copy.entries, text], status: 'ok' }))
}

/** Rewrites the newest line of one copy — the "cheat" the user tries out. */
export function tamper(copies: NotebookCopy[], index: number, newText: string): NotebookCopy[] {
  const target = copies[index]
  if (!target || target.entries.length === 0) {
    return copies
  }
  return copies.map((copy, copyIndex) => {
    if (copyIndex !== index) {
      return copy
    }
    const entries = [...copy.entries]
    entries[entries.length - 1] = newText
    return { entries, status: 'tampered' }
  })
}

/*
 * The cheat-check: copies compare notes and the majority version wins.
 * Copies already matching the majority are accepted ('ok'); any odd one out is
 * marked 'rejected' and snapped back to the shared value.
 */
export function resolveLedger(copies: NotebookCopy[]): NotebookCopy[] {
  const majorityEntries = majoritySnapshot(copies)
  return copies.map((copy) => {
    const agrees = sameEntries(copy.entries, majorityEntries)
    return {
      entries: agrees ? copy.entries : [...majorityEntries],
      status: agrees ? 'ok' : 'rejected',
    }
  })
}

function snapshotKey(entries: string[]): string {
  return JSON.stringify(entries)
}

function sameEntries(a: string[], b: string[]): boolean {
  return snapshotKey(a) === snapshotKey(b)
}

function majoritySnapshot(copies: NotebookCopy[]): string[] {
  const buckets = new Map<string, { count: number; entries: string[] }>()
  for (const copy of copies) {
    const key = snapshotKey(copy.entries)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count += 1
    } else {
      buckets.set(key, { count: 1, entries: copy.entries })
    }
  }
  let winner: { count: number; entries: string[] } | null = null
  for (const bucket of buckets.values()) {
    if (!winner || bucket.count > winner.count) {
      winner = bucket
    }
  }
  return winner ? winner.entries : []
}
