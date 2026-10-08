import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { ensureEvent } from '../lib/data'
import { signOutUser } from '../lib/firebase'
import { useAttendees, useEvent, useHealCounters, useStaffList } from '../lib/hooks'
import type { Attendee, EventDoc, Staff } from '../lib/types'
import { Button, Logo, Spinner } from '../ui/kit'
import type { StaffUser } from './StaffGate'

interface StaffData {
  me: StaffUser
  ev: EventDoc
  attendees: Attendee[]
  staff: Staff[]
  synced: boolean
}

const Ctx = createContext<StaffData | null>(null)

export function useStaffData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStaffData outside provider')
  return v
}

/** Live event, participants and team for every staff screen. */
export function StaffDataProvider({ me, children }: { me: StaffUser; children: ReactNode }) {
  const { ev, exists, synced } = useEvent()
  const attendees = useAttendees()
  const staff = useStaffList()
  useHealCounters(ev, attendees)

  useEffect(() => {
    if (exists === false && me.role === 'admin') ensureEvent().catch(() => {})
  }, [exists, me.role])

  if (exists === false && me.role !== 'admin') {
    return (
      <div className="screen anim-in items-center justify-center text-center">
        <Logo width={160} />
        <div className="mt-6 max-w-[300px] text-[15px] leading-[1.45] opacity-90">
          Evenimentul nu a fost configurat încă. Cere unui admin să-l pregătească.
        </div>
        <Button variant="outline" height={48} className="mt-6 max-w-[240px] text-sm" onClick={() => signOutUser()}>
          Ieși
        </Button>
      </div>
    )
  }
  if (!ev || !attendees || !staff) return <Spinner />
  return <Ctx.Provider value={{ me, ev, attendees, staff, synced }}>{children}</Ctx.Provider>
}
