/*
 * Stepped state machine for the lesson-1 "transfer race" simulation.
 * The component drives it with a timer; tests drive it one step at a time.
 */

export interface RaceState {
  status: 'idle' | 'running' | 'finished'
  tick: number
}

/** The bank lane finishes on this tick; the Solana lane finishes on tick 1. */
export const BANK_DONE_TICK = 40

export const BANK_RECEIPT = 'Arrived after 3 business days · Fee: $25'
export const SOLANA_RECEIPT = 'Arrived in under a second · Fee: less than $0.01'

export function createRaceState(): RaceState {
  return { status: 'idle', tick: 0 }
}

export function startRace(): RaceState {
  return { status: 'running', tick: 0 }
}

export function raceStep(state: RaceState): RaceState {
  if (state.status !== 'running') {
    return state
  }
  const tick = state.tick + 1
  return {
    status: tick >= BANK_DONE_TICK ? 'finished' : 'running',
    tick,
  }
}

export function solanaDone(state: RaceState): boolean {
  return state.tick >= 1
}

export function solanaProgress(state: RaceState): number {
  return solanaDone(state) ? 1 : 0
}

export function solanaReceipt(state: RaceState): string | null {
  return solanaDone(state) ? SOLANA_RECEIPT : null
}

export function bankDone(state: RaceState): boolean {
  return state.status === 'finished'
}

export function bankProgress(state: RaceState): number {
  return Math.min(state.tick / BANK_DONE_TICK, 1)
}

/** Which "business day" the bank transfer is stuck on, while it is still travelling. */
export function bankDay(state: RaceState): number | null {
  if (state.status !== 'running' || state.tick === 0) {
    return null
  }
  return Math.min(state.tick, 3)
}

export function bankReceipt(state: RaceState): string | null {
  return bankDone(state) ? BANK_RECEIPT : null
}
