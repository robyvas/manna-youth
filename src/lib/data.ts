import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, ensureSignedIn } from './firebase'
import {
  DEFAULT_EVENT,
  cleanName,
  computeSizes,
  generateAssignments,
  nameKey,
  pickLeast,
  placeUnassigned,
  randomId,
} from './logic'
import type { ActiveLeader, Attendee, EventDoc, Staff } from './types'

// A single rolling event: the permanent QR code always points at it.
export const eventRef = doc(db, 'events', 'current')
export const attendeesCol = collection(db, 'events', 'current', 'attendees')
export const namesCol = collection(db, 'events', 'current', 'names')
export const staffCol = collection(db, 'staff')

export const DEVICE_KEY = 'manna.attendeeId'

export function withDefaults(data: Partial<EventDoc> | undefined): EventDoc {
  return { ...DEFAULT_EVENT, ...(data ?? {}) }
}

// ---------- participant ----------

export async function isNameTaken(raw: string): Promise<boolean> {
  const key = nameKey(raw)
  if (!key) return false
  await ensureSignedIn()
  const snap = await getDoc(doc(namesCol, key))
  return snap.exists()
}

export class NameTakenError extends Error {}

/** Registers the participant and places them in the least-filled group, atomically. */
export async function joinEvent(raw: string): Promise<string> {
  const user = await ensureSignedIn()
  const name = cleanName(raw)
  const key = nameKey(name)
  const attRef = doc(attendeesCol)
  await runTransaction(db, async (tx) => {
    const evSnap = await tx.get(eventRef)
    if (!evSnap.exists()) throw new Error('no-event')
    const nameSnap = await tx.get(doc(namesCol, key))
    if (nameSnap.exists()) throw new NameTakenError()
    const ev = withDefaults(evSnap.data() as Partial<EventDoc>)
    const pid = pickLeast(ev.active, ev.sizes)
    tx.set(attRef, { name, key, uid: user.uid, leaderId: pid, createdAt: Date.now() })
    tx.set(doc(namesCol, key), { attendeeId: attRef.id, uid: user.uid })
    tx.update(eventRef, {
      count: ev.count + 1,
      sizes: pid ? { ...ev.sizes, [pid]: (ev.sizes[pid] ?? 0) + 1 } : ev.sizes,
    })
  })
  try {
    localStorage.setItem(DEVICE_KEY, attRef.id)
  } catch {
    // Private mode: the session simply won't survive a reload.
  }
  return attRef.id
}

// ---------- staff: event ----------

export async function ensureEvent() {
  const snap = await getDoc(eventRef)
  if (!snap.exists()) await setDoc(eventRef, DEFAULT_EVENT)
}

export function updateEvent(patch: Partial<EventDoc>) {
  return updateDoc(eventRef, patch)
}

async function loadAttendees(): Promise<Attendee[]> {
  const snap = await getDocs(attendeesCol)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Attendee, 'id'>) }))
}

async function commitAssignments(attendees: Attendee[], changes: Map<string, string | null>, active: ActiveLeader[], extra: Partial<EventDoc> = {}) {
  const batch = writeBatch(db)
  const next = attendees.map((a) => (changes.has(a.id) ? { ...a, leaderId: changes.get(a.id) ?? null } : a))
  for (const [id, leaderId] of changes) batch.update(doc(attendeesCol, id), { leaderId })
  batch.update(eventRef, { active, sizes: computeSizes(next, active), count: next.length, ...extra })
  await batch.commit()
}

/** Leaders shown as groups, in team-list order. */
export function activeFrom(staff: Staff[], present: Set<string>): ActiveLeader[] {
  return staff.filter((s) => present.has(s.pid)).map((s) => ({ pid: s.pid, name: s.name }))
}

/**
 * Check-in opens a group and fills it only with people still waiting.
 * Check-out dissolves the group; its members are re-placed in the others.
 */
export async function setCheckIn(staff: Staff[], ev: EventDoc, leader: Staff, on: boolean) {
  const present = new Set(ev.active.map((l) => l.pid))
  if (on) present.add(leader.pid)
  else present.delete(leader.pid)
  const active = activeFrom(staff, present)
  const attendees = await loadAttendees()
  const changes = placeUnassigned(attendees, active)
  await commitAssignments(attendees, changes, active)
}

export async function generateGroups(ev: EventDoc) {
  const attendees = await loadAttendees()
  const changes = generateAssignments(attendees, ev.active)
  await commitAssignments(attendees, changes, ev.active)
}

export async function moveAttendee(attendees: Attendee[], ev: EventDoc, id: string, pid: string) {
  await commitAssignments(attendees, new Map([[id, pid]]), ev.active)
}

export function setReleased(released: boolean) {
  return updateDoc(eventRef, { released })
}

/** Clears participants, names and leader check-ins; keeps settings and attendance history. */
export async function resetEvent(ev: EventDoc) {
  const [att, names] = await Promise.all([getDocs(attendeesCol), getDocs(namesCol)])
  const refs = [...att.docs, ...names.docs].map((d) => d.ref)
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db)
    refs.slice(i, i + 400).forEach((r) => batch.delete(r))
    await batch.commit()
  }
  const history = ev.count > 0 ? [...ev.history, ev.count].slice(-4) : ev.history
  await updateDoc(eventRef, { released: false, active: [], sizes: {}, count: 0, history })
}

// ---------- staff: team ----------

export async function getStaff(email: string): Promise<Staff | null> {
  try {
    const snap = await getDoc(doc(staffCol, email.toLowerCase()))
    return snap.exists() ? (snap.data() as Staff) : null
  } catch {
    // Rules deny reads to anyone who is not on the team.
    return null
  }
}

export async function addStaff(input: { name: string; email: string; isLeader: boolean; isAdmin: boolean }, order: number) {
  const email = input.email.trim().toLowerCase()
  const ref = doc(staffCol, email)
  if ((await getDoc(ref)).exists()) throw new Error('exists')
  const member: Staff = { email, name: cleanName(input.name), pid: randomId(), isLeader: input.isLeader, isAdmin: input.isAdmin, order }
  await setDoc(ref, member)
}

export function updateStaff(email: string, patch: Partial<Pick<Staff, 'name' | 'isAdmin' | 'isLeader'>>) {
  return updateDoc(doc(staffCol, email), patch)
}

/** Removing a member also takes them off tonight's leader list. */
export async function removeStaff(staff: Staff[], ev: EventDoc, member: Staff) {
  if (ev.active.some((l) => l.pid === member.pid)) {
    await setCheckIn(staff.filter((s) => s.email !== member.email), ev, member, false)
  }
  await deleteDoc(doc(staffCol, member.email))
}
