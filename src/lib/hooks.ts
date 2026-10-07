import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { attendeesCol, eventRef, getStaff, staffCol, updateEvent, withDefaults } from './data'
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

/** Google session plus the team record that decides the role. */
export function useStaffSession(): StaffSession {
  const { user, ready } = useAuthUser()
  const [member, setMember] = useState<{ uid: string; staff: Staff | null } | null>(null)

  useEffect(() => {
    if (!user || user.isAnonymous || !user.email) return
    let alive = true
    getStaff(user.email).then((staff) => alive && setMember({ uid: user.uid, staff }))
    return () => {
      alive = false
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
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(eventRef, (snap) => {
      setExists(snap.exists())
      setEv(snap.exists() ? withDefaults(snap.data() as Partial<EventDoc>) : null)
    })
  }, [enabled])
  return { ev, exists }
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
