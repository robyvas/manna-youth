import { describe, expect, it } from 'vitest'
import {
  activeFromPresent,
  buildGroups,
  computeSizes,
  effectiveSize,
  generateAssignments,
  leadersNeeded,
  nameKey,
  pickLeast,
  placeUnassigned,
  previewDistribution,
} from './logic'
import type { ActiveLeader, Attendee } from './types'

const leaders: ActiveLeader[] = [
  { pid: 'a', name: 'Ana Pop' },
  { pid: 'b', name: 'Paul Oltean' },
  { pid: 'c', name: 'Maria Rus' },
]

const person = (id: string, leaderId: string | null, createdAt = 0): Attendee => ({
  id, name: id, key: id, uid: 'u', leaderId, createdAt,
})

describe('leaders math', () => {
  it('size mode rounds up', () => {
    expect(leadersNeeded({ mode: 'size', expected: 70, size: 8, groups: 0 })).toBe(9)
    expect(effectiveSize({ mode: 'size', expected: 70, size: 8, groups: 0 })).toBe(8)
  })
  it('count mode derives size', () => {
    expect(leadersNeeded({ mode: 'count', expected: 70, size: 8, groups: 6 })).toBe(6)
    expect(effectiveSize({ mode: 'count', expected: 70, size: 8, groups: 6 })).toBe(12)
  })
  it('preview spreads remainder over first groups', () => {
    expect(previewDistribution(70, 9)).toEqual([8, 8, 8, 8, 8, 8, 8, 7, 7])
  })
})

describe('nameKey', () => {
  it('ignores case, spaces and diacritics', () => {
    expect(nameKey('  Ștefan  ')).toBe('stefan')
    expect(nameKey('Ioana P.')).toBe(nameKey('ioana   p.'))
    expect(nameKey('Bianca/Ana')).not.toContain('/')
  })
})

describe('assignment', () => {
  it('picks least filled, ties to first', () => {
    expect(pickLeast(leaders, {})).toBe('a')
    expect(pickLeast(leaders, { a: 2, b: 1, c: 1 })).toBe('b')
    expect(pickLeast([], {})).toBeNull()
  })

  it('places only unassigned people and keeps existing groups', () => {
    const list = [person('x', 'a', 1), person('y', null, 2), person('z', 'gone', 3)]
    const changes = placeUnassigned(list, leaders)
    expect(changes.has('x')).toBe(false)
    expect(changes.get('y')).toBe('b')
    expect(changes.get('z')).toBe('c')
  })

  it('generate balances groups within one person', () => {
    const list = Array.from({ length: 23 }, (_, i) => person(`p${i}`, null, i))
    const result = generateAssignments(list, leaders)
    const assigned = list.map((p) => ({ ...p, leaderId: result.get(p.id) ?? null }))
    const sizes = Object.values(computeSizes(assigned, leaders))
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    expect(sizes.reduce((s, n) => s + n, 0)).toBe(23)
  })

  it('generate with no leaders leaves everyone waiting', () => {
    const result = generateAssignments([person('x', 'a')], [])
    expect(result.get('x')).toBeNull()
  })

  it('groups are numbered by leader position', () => {
    const groups = buildGroups(leaders, [person('x', 'c')])
    expect(groups.map((g) => g.n)).toEqual([1, 2, 3])
    expect(groups[2].members).toHaveLength(1)
  })
})

describe('check-ins', () => {
  it('orders present leaders by team order, then by check-in time', () => {
    const active = activeFromPresent({
      z: { name: 'Zoe', order: 2, at: 1 },
      a: { name: 'Ana', order: 1, at: 9 },
      b: { name: 'Bogdan', order: 1, at: 3 },
    })
    expect(active.map((l) => l.pid)).toEqual(['b', 'a', 'z'])
  })
})
