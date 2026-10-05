// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  VALIDATOR_COUNT,
  addEntry,
  createLedger,
  resolveLedger,
  tamper,
} from '../../utils/ledger'

describe('shared notebook ledger', () => {
  it('starts with four empty, identical, accepted copies', () => {
    const copies = createLedger()
    expect(copies).toHaveLength(VALIDATOR_COUNT)
    expect(VALIDATOR_COUNT).toBe(4)
    for (const copy of copies) {
      expect(copy.entries).toEqual([])
      expect(copy.status).toBe('ok')
    }
  })

  it('appends a new entry to all four copies at once', () => {
    let copies = addEntry(createLedger(), 'Anna pays Marco 2 SOL')
    for (const copy of copies) {
      expect(copy.entries).toEqual(['Anna pays Marco 2 SOL'])
      expect(copy.status).toBe('ok')
    }

    copies = addEntry(copies, 'Marco pays Rosa 1 SOL')
    for (const copy of copies) {
      expect(copy.entries).toEqual(['Anna pays Marco 2 SOL', 'Marco pays Rosa 1 SOL'])
    }
  })

  it('trims the entry and ignores blank ones', () => {
    const empty = createLedger()
    expect(addEntry(empty, '')).toBe(empty)
    expect(addEntry(empty, '   ')).toBe(empty)

    const copies = addEntry(empty, '  Anna pays Marco 2 SOL  ')
    expect(copies[0]?.entries).toEqual(['Anna pays Marco 2 SOL'])
  })

  it('flags a tampered copy and keeps its changed text until the check', () => {
    let copies = addEntry(createLedger(), 'Anna pays Marco 2 SOL')
    copies = tamper(copies, 2, 'Anna pays Marco 200 SOL')

    expect(copies[2]?.status).toBe('tampered')
    expect(copies[2]?.entries).toEqual(['Anna pays Marco 200 SOL'])
    for (const index of [0, 1, 3]) {
      expect(copies[index]?.status).toBe('ok')
      expect(copies[index]?.entries).toEqual(['Anna pays Marco 2 SOL'])
    }
  })

  it('rejects the odd one out on check and restores the shared value', () => {
    let copies = addEntry(createLedger(), 'Anna pays Marco 2 SOL')
    copies = tamper(copies, 2, 'Anna pays Marco 200 SOL')
    copies = resolveLedger(copies)

    expect(copies[2]?.status).toBe('rejected')
    expect(copies[2]?.entries).toEqual(['Anna pays Marco 2 SOL'])
    for (const index of [0, 1, 3]) {
      expect(copies[index]?.status).toBe('ok')
      expect(copies[index]?.entries).toEqual(['Anna pays Marco 2 SOL'])
    }
  })

  it('accepts identical copies on check with nothing rejected', () => {
    let copies = addEntry(createLedger(), 'Anna pays Marco 2 SOL')
    copies = addEntry(copies, 'Marco pays Rosa 1 SOL')
    copies = resolveLedger(copies)

    for (const copy of copies) {
      expect(copy.status).toBe('ok')
      expect(copy.entries).toEqual(['Anna pays Marco 2 SOL', 'Marco pays Rosa 1 SOL'])
    }
  })

  it('treats a "cheat" that changes nothing as honest', () => {
    let copies = addEntry(createLedger(), 'Anna pays Marco 2 SOL')
    copies = tamper(copies, 1, 'Anna pays Marco 2 SOL')
    copies = resolveLedger(copies)

    for (const copy of copies) {
      expect(copy.status).toBe('ok')
      expect(copy.entries).toEqual(['Anna pays Marco 2 SOL'])
    }
  })

  it('clears the rejected mark once a new shared entry is added', () => {
    let copies = addEntry(createLedger(), 'Anna pays Marco 2 SOL')
    copies = tamper(copies, 0, 'Anna pays Marco 200 SOL')
    copies = resolveLedger(copies)
    expect(copies[0]?.status).toBe('rejected')

    copies = addEntry(copies, 'Rosa pays Anna 1 SOL')
    for (const copy of copies) {
      expect(copy.status).toBe('ok')
      expect(copy.entries).toEqual(['Anna pays Marco 2 SOL', 'Rosa pays Anna 1 SOL'])
    }
  })

  it('refuses to tamper an empty notebook or a missing copy', () => {
    const empty = createLedger()
    expect(tamper(empty, 0, 'anything')).toBe(empty)

    const copies = addEntry(createLedger(), 'Anna pays Marco 2 SOL')
    expect(tamper(copies, -1, 'anything')).toBe(copies)
    expect(tamper(copies, VALIDATOR_COUNT, 'anything')).toBe(copies)
  })
})
