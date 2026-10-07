import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateGroups, moveAttendee, setReleased } from '../lib/data'
import { KINDS, buildGroups, effectiveSize } from '../lib/logic'
import { BackPill, Button, Notice, Star } from '../ui/kit'
import { useStaffData } from './StaffData'

export default function Verify({ base }: { base: '/lider' | '/admin' }) {
  const { ev, attendees } = useStaffData()
  const navigate = useNavigate()
  const [moving, setMoving] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const k = KINDS[ev.kind]
  const size = effectiveSize(ev)

  const groups = buildGroups(ev.active, attendees)
  const activePids = new Set(ev.active.map((l) => l.pid))
  const waiting = attendees.filter((a) => !a.leaderId || !activePids.has(a.leaderId)).length
  const movingPerson = attendees.find((a) => a.id === moving)
  const avg = groups.length ? attendees.length / groups.length : 0
  const tooSmall = groups.length > 1 && attendees.length > 0 && avg < size * 0.6

  async function run(fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch {
      setError('Nu s-a salvat. Verifică internetul și mai încearcă.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen screen-dense anim-in pb-0!">
      <div className="flex items-center justify-between">
        <BackPill onClick={() => navigate(base)}>{base === '/admin' ? '← Setări' : '← Lideri'}</BackPill>
        <div className="flex items-center gap-2">
          <Star />
          <span className="text-[13px] font-bold tracking-[.1em]">VERIFICARE</span>
        </div>
      </div>
      <div className="mt-[18px] font-display text-[30px] leading-none tracking-[-.02em]">Propunerea de {k.unitPl}.</div>
      <div className="mt-2 text-[13px] text-cream/80">
        {attendees.length} participanți în {groups.length} {k.unitPl} · țintă {size}/{k.unitAcc}
      </div>

      {movingPerson && (
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[14px] bg-cream px-3.5 py-3 text-[13px] text-ink">
          <span className="flex-1">
            <b>{movingPerson.name}</b>: alege {k.unitAcc} nouă
          </span>
          <button onClick={() => setMoving(null)} className="rounded-full border-0 bg-black/8 px-3 py-1.5 text-xs font-bold text-ink">
            Anulează
          </button>
        </div>
      )}

      {tooSmall && (
        <div className="mt-3.5">
          <Notice strong>
            {k.unitPl[0].toUpperCase() + k.unitPl.slice(1)} ies mici (~{Math.round(avg)} pers.). Poți da check-out unor lideri și apoi „Generează din nou”.
          </Notice>
        </div>
      )}

      <div className="mt-3.5 flex flex-col gap-3">
        {groups.length === 0 && <Notice>Niciun lider nu a dat check-in încă.</Notice>}
        {groups.map((g) => (
          <div
            key={g.pid}
            className={`overflow-hidden rounded-2xl border-2 bg-black/22 ${moving ? 'border-cream/50' : 'border-transparent'}`}
          >
            <div style={{ background: g.color }} className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="font-display text-lg">
                {k.unit} {g.n}
              </div>
              <div className="min-w-0 flex-1 truncate text-xs opacity-90">{g.leader}</div>
              <div className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold">
                {g.members.length}/{size}
              </div>
              {movingPerson && movingPerson.leaderId !== g.pid && (
                <button
                  onClick={() =>
                    run(async () => {
                      await moveAttendee(attendees, ev, movingPerson.id, g.pid)
                      setMoving(null)
                    })
                  }
                  className="rounded-full border-0 bg-cream px-3 py-1.5 text-xs font-bold text-ink"
                >
                  Mută aici
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5 pt-2">
              {g.members.map((m) => {
                const sel = moving === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMoving(sel ? null : m.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-[11px] py-[7px] text-[13px] font-medium ${
                      sel ? 'border-cream bg-cream text-ink' : 'border-cream/20 bg-white/10 text-cream'
                    }`}
                  >
                    {m.name}
                    <span className="text-[11px] opacity-55">↔</span>
                  </button>
                )
              })}
              {g.members.length === 0 && <span className="px-1 py-[7px] text-xs italic text-cream/60">încă nimeni</span>}
            </div>
          </div>
        ))}
      </div>

      {waiting > 0 && (
        <div className="mt-3">
          <Notice strong>
            <b>{waiting} în așteptare</b> fără lider. Dă check-in unui lider sau mută-i manual.
          </Notice>
        </div>
      )}

      <Button
        height={48}
        variant="outline"
        className="mt-3.5 text-sm"
        disabled={busy}
        onClick={() =>
          run(async () => {
            setMoving(null)
            await generateGroups(ev)
          })
        }
      >
        Generează din nou
      </Button>

      <div className="sticky-footer mt-auto pt-6">
        {error && <div className="text-center text-[13px]">{error}</div>}
        <Button
          height={64}
          variant={ev.released ? 'ink' : 'cream'}
          className="text-lg shadow-[0_8px_24px_rgba(0,0,0,.25)]"
          disabled={busy}
          onClick={() => run(() => setReleased(!ev.released))}
        >
          {ev.released ? 'Publicat · retrage →' : 'Publică →'}
        </Button>
        <div className="text-center text-xs text-cream/75">
          {ev.released
            ? `Publicat. Participanții văd ${k.unitPl}. Modificările se propagă instant.`
            : 'Nimeni nu vede nimic până nu publici.'}
        </div>
      </div>
    </div>
  )
}
