export type Kind = 'serie' | 'jocuri' | 'special'
export type Mode = 'size' | 'count'

/** A checked-in leader as participants see it (no email). */
export interface ActiveLeader {
  pid: string
  name: string
}

export interface EventDoc {
  day: string // YYYY-MM-DD
  time: string // HH:mm
  expected: number
  mode: Mode
  size: number
  groups: number
  kind: Kind
  released: boolean
  /** Checked-in leaders, in team-list order. Position = group number. */
  active: ActiveLeader[]
  /** Members per leader pid. Kept in sync by staff screens. */
  sizes: Record<string, number>
  count: number
  /** Attendance of the last few events, newest last. */
  history: number[]
}

export interface Staff {
  email: string // also the document id, lowercase
  name: string
  pid: string // public id used for groups
  isAdmin: boolean
  isLeader: boolean
  order: number
}

export interface Attendee {
  id: string
  name: string
  key: string
  uid: string
  leaderId: string | null
  createdAt: number
}

export interface Group {
  n: number
  pid: string
  leader: string
  color: string
  members: Attendee[]
}

export type Role = 'admin' | 'leader' | 'none'
