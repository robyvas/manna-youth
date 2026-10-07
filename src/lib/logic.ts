import type { ActiveLeader, Attendee, EventDoc, Group, Kind } from './types'

export const COLORS = ['#bb2618', '#1f4d8f', '#2e7d4f', '#b8860b', '#6a3d9a', '#0f6f73', '#9c2b5b', '#c0552f']

export const KINDS: Record<Kind, { label: string; unit: string; unitAcc: string; unitPl: string }> = {
  serie: { label: 'Grupe de discuții', unit: 'Grupa', unitAcc: 'grupa', unitPl: 'grupe' },
  jocuri: { label: 'Jocuri în echipe', unit: 'Echipa', unitAcc: 'echipa', unitPl: 'echipe' },
  special: { label: 'Seară specială', unit: 'Masa', unitAcc: 'masa', unitPl: 'mese' },
}

export const DEFAULT_EVENT: EventDoc = {
  day: todayISO(),
  time: '19:00',
  expected: 70,
  mode: 'size',
  size: 8,
  groups: 9,
  kind: 'serie',
  released: false,
  active: [],
  sizes: {},
  count: 0,
  history: [],
}

export function todayISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** "SÂM, 10 OCT · 19:00" */
export function fmtDate(day: string, time: string): string {
  const dt = new Date(`${day}T${time || '00:00'}`)
  if (isNaN(dt.getTime())) return ''
  const s = dt.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
  return `${s} · ${time}`.toUpperCase()
}

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

/** Collapses whitespace; used for display. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

/** Case- and diacritic-insensitive key, safe as a Firestore document id. */
export function nameKey(raw: string): string {
  return cleanName(raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 .-]/g, '')
    .replace(/\s+/g, '-')
}

export function leadersNeeded(ev: Pick<EventDoc, 'mode' | 'expected' | 'size' | 'groups'>): number {
  return ev.mode === 'size' ? Math.max(1, Math.ceil(ev.expected / ev.size)) : ev.groups
}

export function effectiveSize(ev: Pick<EventDoc, 'mode' | 'expected' | 'size' | 'groups'>): number {
  return ev.mode === 'size' ? ev.size : Math.max(1, Math.ceil(ev.expected / ev.groups))
}

/** Expected attendance spread over n groups, larger groups first. */
export function previewDistribution(expected: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.floor(expected / n) + (i < expected % n ? 1 : 0))
}

/** Leader with the fewest members; ties go to the first in list order. */
export function pickLeast(active: ActiveLeader[], sizes: Record<string, number>): string | null {
  let best: ActiveLeader | null = null
  for (const l of active) {
    if (!best || (sizes[l.pid] ?? 0) < (sizes[best.pid] ?? 0)) best = l
  }
  return best ? best.pid : null
}

export function computeSizes(attendees: Attendee[], active: ActiveLeader[]): Record<string, number> {
  const sizes: Record<string, number> = {}
  for (const l of active) sizes[l.pid] = 0
  for (const a of attendees) if (a.leaderId && a.leaderId in sizes) sizes[a.leaderId]++
  return sizes
}

/**
 * Keeps everyone already placed with a present leader, and places the rest
 * (new, or whose leader left) one by one into the least-filled group.
 * Returns only the changed assignments.
 */
export function placeUnassigned(attendees: Attendee[], active: ActiveLeader[]): Map<string, string | null> {
  const sizes = computeSizes(attendees, active)
  const changes = new Map<string, string | null>()
  const sorted = [...attendees].sort((a, b) => a.createdAt - b.createdAt)
  for (const a of sorted) {
    if (a.leaderId && a.leaderId in sizes) continue
    const pid = pickLeast(active, sizes)
    if (pid) sizes[pid]++
    if (pid !== a.leaderId) changes.set(a.id, pid)
  }
  return changes
}

/** Fresh random proposal: shuffle everyone, then fill groups round-robin. */
export function generateAssignments(
  attendees: Attendee[],
  active: ActiveLeader[],
  random: () => number = Math.random,
): Map<string, string | null> {
  const order = [...attendees]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const out = new Map<string, string | null>()
  order.forEach((a, i) => out.set(a.id, active.length ? active[i % active.length].pid : null))
  return out
}

export function buildGroups(active: ActiveLeader[], attendees: Attendee[]): Group[] {
  return active.map((l, i) => ({
    n: i + 1,
    pid: l.pid,
    leader: l.name,
    color: COLORS[i % COLORS.length],
    members: attendees.filter((a) => a.leaderId === l.pid).sort((a, b) => a.name.localeCompare(b.name, 'ro')),
  }))
}

export function randomId(len = 8): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
