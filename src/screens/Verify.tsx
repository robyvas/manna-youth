import { useState } from 'react'
import { NameTakenError, generateGroups, joinEvent, moveAttendee, setReleased } from '../lib/data'
import { KINDS, buildGroups, cleanName, effectiveSize, firstName } from '../lib/logic'
import { Button, Icon, Notice, useToast } from '../ui/kit'
import StaffHeader from './StaffHeader'
import { useStaffData } from './StaffData'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Verify() {
  const { ev, attendees } = useStaffData()
  const toast = useToast()
  const [moving, setMoving] = useState<string | null>(null)
  const [busy, setBusy] = useState<'regen' | 'publish' | 'move' | 'add' | null>(null)
  const [error, setError] = useState('')
  // Bumped on every regenerate so the member chips replay their entrance.
  const [round, setRound] = useState(0)
  const k = KINDS[ev.kind]
  const size = effectiveSize(ev)

  const groups = buildGroups(ev.active, attendees)
  const activePids = new Set(ev.active.map((l) => l.pid))
  const waiting = attendees.filter((a) => !a.leaderId || !activePids.has(a.leaderId)).length
  const movingPerson = attendees.find((a) => a.id === moving)
  const avg = groups.length ? attendees.length / groups.length : 0
  const tooSmall = groups.length > 1 && attendees.length > 0 && avg < size * 0.6

  async function run(kind: NonNullable<typeof busy>, fn: () => Promise<unknown>) {
    if (busy) return false
    setBusy(kind)
    setError('')
    try {
      await fn()
      return true
    } catch {
      setError('Nu s-a salvat. Verifică internetul și mai încearcă.')
      return false
    } finally {
      setBusy(null)
    }
  }

  async function regenerate() {
    setMoving(null)
    // Keep the shuffle visible for a moment even when Firestore answers instantly.
    const ok = await run('regen', () => Promise.all([generateGroups(ev), wait(700)]))
    if (ok) {
      setRound((r) => r + 1)
      toast.show(`Propunere nouă de ${k.unitPl}`)
    }
  }

  async function moveTo(pid: string, n: number) {
    if (!movingPerson) return
    const name = movingPerson.name
    const ok = await run('move', () => moveAttendee(attendees, ev, movingPerson.id, pid))
    if (ok) {
      setMoving(null)
      toast.show(`${firstName(name)} e acum în ${k.unitAcc} ${n}`)
    }
  }

  async function togglePublish() {
    const next = !ev.released
    const ok = await run('publish', () => setReleased(next))
    if (ok) {
      if (next && 'vibrate' in navigator) navigator.vibrate?.(30)
      toast.show(next ? 'Publicat. Toți își văd grupa.' : 'Publicarea a fost retrasă.')
    }
  }

  return (
    <div className="screen screen-dense anim-in pb-0!">
      {toast.node}
      <StaffHeader />
      <div className="mt-[22px] font-display text-[30px] leading-none tracking-[-.02em]">Propunerea de {k.unitPl}.</div>
      <div className="mt-2 text-[13px] text-cream/80">
        {attendees.length} participanți în {groups.length} {k.unitPl} · țintă {size}/{k.unitAcc}
      </div>

      {movingPerson ? (
        <div className="anim-in sticky top-2 z-10 mt-3.5 flex items-center gap-2.5 rounded-[14px] bg-cream px-3.5 py-3 text-[13px] text-ink shadow-[0_8px_24px_rgba(0,0,0,.25)]">
          <Icon name="arrow" size={16} />
          <span className="flex-1">
            <b>{movingPerson.name}</b>: atinge „Mută aici” la {k.unitAcc} nouă
          </span>
          <button onClick={() => setMoving(null)} className="press rounded-full border-0 bg-black/8 px-3 py-1.5 text-xs font-bold text-ink">
            Anulează
          </button>
        </div>
      ) : (
        groups.length > 0 &&
        attendees.length > 0 && <div className="mt-3 text-xs text-cream/65">Atinge un nume ca să-l muți în altă {k.unitAcc}.</div>
      )}

      {tooSmall && (
        <div className="mt-3.5">
          <Notice strong>
            {k.unitPl[0].toUpperCase() + k.unitPl.slice(1)} ies mici (~{Math.round(avg)} pers.). Poți da check-out unor lideri și apoi „Generează din nou”.
          </Notice>
        </div>
      )}

      <div className={`mt-3.5 flex flex-col gap-3 transition-opacity duration-300 ${busy === 'regen' ? 'opacity-50' : ''}`}>
        {groups.length === 0 && <Notice>Niciun lider nu a dat check-in încă. Mergi la tab-ul Lideri.</Notice>}
        {groups.map((g, gi) => {
          const target = movingPerson && movingPerson.leaderId !== g.pid
          return (
            <div
              key={g.pid}
              style={{ animationDelay: `${gi * 50}ms` }}
              className={`anim-in overflow-hidden rounded-2xl border-2 bg-black/22 transition-colors ${
                target ? 'anim-glow border-cream/60' : moving ? 'border-cream/20' : 'border-transparent'
              }`}
            >
              <div style={{ background: g.color }} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="font-display text-lg">
                  {k.unit} {g.n}
                </div>
                <div className="min-w-0 flex-1 truncate text-xs opacity-90">{g.leader}</div>
                <div key={g.members.length} className="anim-bump rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold">
                  {g.members.length}/{size}
                </div>
                {target && (
                  <button
                    onClick={() => moveTo(g.pid, g.n)}
                    disabled={busy !== null}
                    className="press anim-pop flex items-center gap-1 rounded-full border-0 bg-cream px-3 py-1.5 text-xs font-bold text-ink"
                  >
                    <Icon name="plus" size={12} /> Mută aici
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5 pt-2">
                {g.members.map((m, mi) => {
                  const sel = moving === m.id
                  return (
                    <button
                      key={`${m.id}-${round}`}
                      onClick={() => setMoving(sel ? null : m.id)}
                      style={{ animationDelay: `${gi * 60 + mi * 35}ms` }}
                      className={`press anim-chip flex items-center gap-1.5 rounded-full border px-[11px] py-[7px] text-[13px] font-medium ${
                        sel
                          ? 'scale-105 border-cream bg-cream text-ink shadow-[0_6px_16px_rgba(0,0,0,.3)]'
                          : 'border-cream/20 bg-white/10 text-cream hover:bg-white/15'
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
          )
        })}
      </div>

      {waiting > 0 && (
        <div className="mt-3">
          <Notice strong>
            <b>{waiting} în așteptare</b> fără lider. Dă check-in unui lider sau mută-i manual.
          </Notice>
        </div>
      )}

      <AddPerson
        unit={k.unitAcc}
        disabled={busy !== null}
        onAdded={(name) => toast.show(`${firstName(name)} a fost adăugat`)}
        setBusy={(b) => setBusy(b ? 'add' : null)}
      />

      <Button height={48} variant="outline" className="mt-2.5 text-sm" disabled={busy !== null} onClick={regenerate}>
        <Icon name="shuffle" size={16} className={busy === 'regen' ? 'anim-spin' : ''} />
        {busy === 'regen' ? 'Se amestecă…' : 'Generează din nou'}
      </Button>

      <div className="sticky-footer mt-auto pt-6">
        {error && <div className="anim-shake text-center text-[13px]">{error}</div>}
        <Button
          height={64}
          variant={ev.released ? 'ink' : 'cream'}
          className="text-lg shadow-[0_8px_24px_rgba(0,0,0,.25)]"
          disabled={busy !== null}
          onClick={togglePublish}
        >
          {busy === 'publish' ? (
            <Icon name="shuffle" className="anim-spin" />
          ) : ev.released ? (
            <>
              <Icon name="check" /> Publicat · retrage
            </>
          ) : (
            <>
              Publică <Icon name="arrow" />
            </>
          )}
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

/** For people without a phone: staff type the name and they join the least-filled group. */
function AddPerson({
  unit,
  disabled,
  onAdded,
  setBusy,
}: {
  unit: string
  disabled: boolean
  onAdded: (name: string) => void
  setBusy: (b: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const typed = cleanName(name)

  async function add() {
    if (typed.length < 2) return
    setBusy(true)
    setError('')
    try {
      await joinEvent(typed, false)
      onAdded(typed)
      setName('')
      setOpen(false)
    } catch (e) {
      setError(e instanceof NameTakenError ? `Mai e un ${typed}. Adaugă inițiala (ex. „${typed} P.”).` : 'Nu s-a salvat. Mai încearcă.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button height={48} variant="outline" className="mt-3.5 text-sm" disabled={disabled} onClick={() => setOpen(true)}>
        <Icon name="plus" size={16} /> Adaugă pe cineva fără telefon
      </Button>
    )
  }
  return (
    <form
      className="anim-in mt-3.5 rounded-2xl bg-black/22 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        add()
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold tracking-[.08em] text-cream/80">ADAUGĂ MANUAL</div>
        <button type="button" onClick={() => setOpen(false)} className="press rounded-full p-1 text-cream/70" aria-label="Închide">
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prenume"
          autoFocus
          maxLength={40}
          className="min-w-0 flex-1 rounded-xl border-0 bg-black/22 px-3.5 py-3 text-[15px] font-bold text-cream outline-none focus:ring-2 focus:ring-cream/40"
        />
        <button
          type="submit"
          disabled={disabled || typed.length < 2}
          className="press rounded-xl bg-cream px-4 text-sm font-bold text-ink disabled:opacity-40"
        >
          Adaugă
        </button>
      </div>
      <div className="mt-2 text-[11px] text-cream/65">Intră automat în {unit} cu cei mai puțini oameni. Apoi îl poți muta.</div>
      {error && <div className="anim-shake mt-2 text-[13px]">{error}</div>}
    </form>
  )
}
