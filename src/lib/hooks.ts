import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { attendeesCol, eventRef, staffCol, updateEvent, withDefaults } from './data'
import { auth } from './firebase'
import { computeSizes } from './logic'
import type { Attendee, EventDoc, Role, Staff } from './types'

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [ready, setReady] = useState(false)
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setReady(true)
      }),
    [],
  )
  return { user, ready }
}

export type StaffSession =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'ready'; user: User; member: Staff | null; role: Role }

/**
 * Google session plus the team record that decides the role. The record is watched live,
 * so being added to (or removed from) the team takes effect without signing in again.
 */
export function useStaffSession(): StaffSession {
  const { user, ready } = useAuthUser()
  const [member, setMember] = useState<{ uid: string; staff: Staff | null } | null>(null)

  useEffect(() => {
    if (!user || user.isAnonymous || !user.email) return
    const ref = doc(staffCol, user.email.toLowerCase())
    let unsub: (() => void) | null = null
    let retry: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    const listen = () => {
      unsub = onSnapshot(
        ref,
        (snap) => setMember({ uid: user.uid, staff: snap.exists() ? (snap.data() as Staff) : null }),
        (err) => {
          // Rules hide the team from outsiders, so "not on the list" arrives as permission-denied.
          // Anything else is a connection problem: keep waiting instead of showing "no access".
          if (err.code === 'permission-denied') setMember({ uid: user.uid, staff: null })
          if (!stopped) retry = setTimeout(listen, err.code === 'permission-denied' ? 5000 : 2000)
        },
      )
    }
    listen()
    return () => {
      stopped = true
      unsub?.()
      if (retry) clearTimeout(retry)
    }
  }, [user])

  if (!ready) return { status: 'loading' }
  if (!user || user.isAnonymous) return { status: 'signedOut' }
  if (!member || member.uid !== user.uid) return { status: 'loading' }
  const staff = member.staff
  const role: Role = staff?.isAdmin ? 'admin' : staff?.isLeader ? 'leader' : 'none'
  return { status: 'ready', user, member: staff, role }
}

export function useEvent(enabled = true) {
  const [ev, setEv] = useState<EventDoc | null>(null)
  const [exists, setExists] = useState<boolean | null>(null)
  // False while this device has unsent changes or is showing cached data (no live connection).
  const [synced, setSynced] = useState(true)
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(eventRef, { includeMetadataChanges: true }, (snap) => {
      setExists(snap.exists())
      setEv(snap.exists() ? withDefaults(snap.data() as Partial<EventDoc>) : null)
      setSynced(!snap.metadata.hasPendingWrites && !snap.metadata.fromCache)
    })
  }, [enabled])
  return { ev, exists, synced }
}

export function useAttendees(enabled = true) {
  const [list, setList] = useState<Attendee[] | null>(null)
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(query(attendeesCol, orderBy('createdAt')), (snap) =>
      setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Attendee, 'id'>) }))),
    )
  }, [enabled])
  return list
}

export function useStaffList(enabled = true) {
  const [list, setList] = useState<Staff[] | null>(null)
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(query(staffCol, orderBy('order')), (snap) => setList(snap.docs.map((d) => d.data() as Staff)))
  }, [enabled])
  return list
}

/** Live view of one participant's own record (the only one they may read). */
export function useMyAttendee(id: string | null) {
  const [state, setState] = useState<{ id: string; data: Attendee | null } | null>(null)
  useEffect(() => {
    if (!id) return
    return onSnapshot(
      doc(attendeesCol, id),
      (snap) => setState({ id, data: snap.exists() ? ({ id: snap.id, ...snap.data() } as Attendee) : null }),
      () => setState({ id, data: null }),
    )
  }, [id])
  if (!id) return { loading: false, me: null }
  if (!state || state.id !== id) return { loading: true, me: null }
  return { loading: false, me: state.data }
}

/**
 * Participants bump group counters themselves; staff screens recompute them
 * from the real list and fix any drift (e.g. a join racing a regenerate).
 */
export function useHealCounters(ev: EventDoc | null, attendees: Attendee[] | null) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!ev || !attendees) return
    const sizes = computeSizes(attendees, ev.active)
    const drift = JSON.stringify(sizes) !== JSON.stringify(normalize(ev.sizes, ev)) || ev.count !== attendees.length
    if (!drift) return
    timer.current = setTimeout(() => {
      updateEvent({ sizes, count: attendees.length }).catch(() => {})
    }, 1500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [ev, attendees])
}

function normalize(sizes: Record<string, number>, ev: EventDoc) {
  const out: Record<string, number> = {}
  for (const l of ev.active) out[l.pid] = sizes[l.pid] ?? 0
  return out
}
