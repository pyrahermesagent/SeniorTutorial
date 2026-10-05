// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  BANK_DONE_TICK,
  BANK_RECEIPT,
  SOLANA_RECEIPT,
  bankDay,
  bankDone,
  bankProgress,
  bankReceipt,
  createRaceState,
  raceStep,
  solanaDone,
  solanaProgress,
  solanaReceipt,
  startRace,
  type RaceState,
} from '../../utils/transferRace'

function stepped(count: number): RaceState {
  let state = startRace()
  for (let index = 0; index < count; index += 1) {
    state = raceStep(state)
  }
  return state
}

describe('transfer race state machine', () => {
  it('starts idle with both lanes waiting', () => {
    const state = createRaceState()
    expect(state.status).toBe('idle')
    expect(state.tick).toBe(0)
    expect(solanaDone(state)).toBe(false)
    expect(bankDone(state)).toBe(false)
    expect(solanaReceipt(state)).toBeNull()
    expect(bankReceipt(state)).toBeNull()
  })

  it('finishes Solana on the first tick while the bank is still incomplete', () => {
    const state = stepped(1)
    expect(state.status).toBe('running')
    expect(solanaDone(state)).toBe(true)
    expect(solanaProgress(state)).toBe(1)
    expect(bankDone(state)).toBe(false)
    expect(bankProgress(state)).toBeLessThan(1)
  })

  it('crawls the bank lane through Day 1 to Day 3 before the receipt', () => {
    expect(bankDay(stepped(1))).toBe(1)
    expect(bankDay(stepped(2))).toBe(2)
    expect(bankDay(stepped(3))).toBe(3)
    expect(bankDay(stepped(BANK_DONE_TICK))).toBeNull()
  })

  it('keeps the bank unfinished one tick before the end', () => {
    const state = stepped(BANK_DONE_TICK - 1)
    expect(state.status).toBe('running')
    expect(bankDone(state)).toBe(false)
  })

  it('ends with both fee captions on the receipts', () => {
    const state = stepped(BANK_DONE_TICK)
    expect(state.status).toBe('finished')
    expect(bankReceipt(state)).toBe(BANK_RECEIPT)
    expect(solanaReceipt(state)).toBe(SOLANA_RECEIPT)
    expect(bankReceipt(state)).toContain('$25')
    expect(solanaReceipt(state)).toContain('$0.01')
  })

  it('ignores steps while idle and once finished', () => {
    const idle = createRaceState()
    expect(raceStep(idle)).toBe(idle)
    const finished = stepped(BANK_DONE_TICK)
    expect(raceStep(finished)).toBe(finished)
  })

  it('startRace always begins a fresh race at tick 0', () => {
    const restarted = startRace()
    expect(restarted.status).toBe('running')
    expect(restarted.tick).toBe(0)
  })
})
