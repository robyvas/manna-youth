import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateGroups, setCheckIn } from '../lib/data'
import { COLORS, KINDS, effectiveSize, initials, leadersNeeded } from '../lib/logic'
import type { Staff } from '../lib/types'
import { Button, Icon } from '../ui/kit'
import StaffHeader from './StaffHeader'
import { useStaffData } from './StaffData'

export default function Leader() {
  const { me, ev, staff, attendees } = useStaffData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const k = KINDS[ev.kind]

  const leaders = staff.filter((s) => s.isLeader)
  const present = new Map(ev.active.map((l, i) => [l.pid, i]))
  const needed = leadersNeeded(ev)
  const short = ev.active.length < needed
  const mine = me.member && leaders.some((l) => l.email === me.member!.email) ? me.member : null
  const myIndex = mine ? present.get(mine.pid) : undefined

  const intro = mine
    ? myIndex !== undefined
      ? 'Ești prezent. Poți da check-in și pentru colegii fără telefon.'
      : `Atinge numele tău pentru check-in. Fiecare lider prezent = o ${k.unitAcc}.`
    : 'Ești admin, poți da check-in pentru oricine.'

  async function toggle(l: Staff) {
    if (busy) return
    setBusy(l.pid)
    setError('')
    try {
      await setCheckIn(staff, ev, l, !present.has(l.pid))
    } catch {
      setError('Nu s-a salvat. Verifică internetul și mai încearcă.')
    } finally {
      setBusy(null)
    }
  }

  async function primary() {
    if (busy) return
    if (!ev.released) {
      setBusy('generate')
      try {
        await generateGroups(ev)
      } catch {
        setError('Nu am putut genera. Mai încearcă.')
        setBusy(null)
        return
      }
      setBusy(null)
    }
    navigate(me.role === 'admin' ? '/admin/verificare' : '/lider/verificare')
  }

  return (
    <div className="screen screen-dense anim-in">
      <StaffHeader />
      <div className="mt-[22px] font-display text-[30px] leading-none tracking-[-.02em]">
        Cine e aici
        <br />
        în seara asta?
      </div>
      <div className="mt-2 text-[13px] text-cream/80">{intro}</div>

      <div className="mt-[18px] flex gap-2">
        <Tile label="PREZENȚI" value={ev.active.length} />
        <Tile label="NECESARI" value={needed} warn={short} />
        <Tile label="ȚINTĂ" value={effectiveSize(ev)} suffix="/gr" />
      </div>

      {mine && myIndex !== undefined && (
        <MyGroup
          n={myIndex + 1}
          color={COLORS[myIndex % COLORS.length]}
          unit={k.unit}
          released={ev.released}
          names={attendees.filter((a) => a.leaderId === mine.pid).map((a) => a.name).sort((a, b) => a.localeCompare(b, 'ro'))}
        />
      )}

      <div className="mt-4 flex flex-1 flex-col gap-2">
        {leaders.length === 0 && (
          <div className="rounded-2xl bg-black/18 p-4 text-[13px] text-cream/80">
            Nu e niciun lider în echipă încă. Un admin îi poate adăuga din tab-ul Echipa.
          </div>
        )}
        {leaders.map((l, i) => {
          const idx = present.get(l.pid)
          const on = idx !== undefined
          const color = on ? COLORS[idx % COLORS.length] : 'rgba(255,255,255,.15)'
          const loading = busy === l.pid
          return (
            <button
              key={l.email}
              onClick={() => toggle(l)}
              disabled={busy !== null}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`press anim-in flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-cream ${
                on ? 'border-cream/60 bg-black/35' : 'border-cream/8 bg-black/18'
              }`}
            >
              <div
                key={on ? 'on' : 'off'}
                style={{ background: color }}
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-black ${
                  on ? 'anim-pop text-cream' : 'text-cream/75'
                }`}
              >
                {loading ? <Icon name="shuffle" size={16} className="anim-spin" /> : initials(l.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold">
                  {l.name}
                  {mine?.email === l.email && <span className="ml-1.5 text-[11px]">· tu</span>}
                </div>
                <div className="text-xs text-cream/75">
                  {on ? `${k.unit} ${idx + 1} · ${ev.sizes[l.pid] ?? 0} pers.` : 'Nu a dat check-in'}
                </div>
              </div>
              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[.08em] transition-colors ${
                  on ? 'bg-cream text-ink' : 'border border-cream/20 text-cream/60'
                }`}
              >
                {on && <Icon name="check" size={12} />}
                {on ? 'PREZENT' : 'CHECK-IN'}
              </div>
            </button>
          )
        })}
      </div>

      {error && <div className="anim-shake mt-3 text-center text-[13px]">{error}</div>}
      <Button
        height={56}
        variant={ev.released ? 'ink' : 'cream'}
        className="mt-3 flex-none text-[15px] shadow-[0_8px_24px_rgba(0,0,0,.2)]"
        onClick={primary}
        disabled={busy !== null}
      >
        {busy === 'generate' ? (
          <>
            <Icon name="shuffle" className="anim-spin" /> Se amestecă…
          </>
        ) : ev.released ? (
          <>
            Vezi {k.unitPl} publicate <Icon name="arrow" />
          </>
        ) : (
          <>
            <Icon name="shuffle" /> Generează {k.unitPl}
          </>
        )}
      </Button>
    </div>
  )
}

function Tile({ label, value, warn = false, suffix }: { label: string; value: number; warn?: boolean; suffix?: string }) {
  return (
    <div className="flex-1 rounded-[14px] bg-black/22 p-3">
      <div className="text-[11px] font-bold tracking-[.1em] text-cream/75">{label}</div>
      <div key={value} className={`anim-bump mt-0.5 origin-left text-[26px] font-black ${warn ? 'text-warn' : ''}`}>
        {value}
        {suffix && <span className="text-[13px] text-cream/75">{suffix}</span>}
      </div>
    </div>
  )
}

function MyGroup({ n, color, unit, released, names }: { n: number; color: string; unit: string; released: boolean; names: string[] }) {
  return (
    <div className="anim-in mt-4 overflow-hidden rounded-2xl bg-black/22">
      <div style={{ background: color }} className="flex items-center justify-between px-3.5 py-2.5">
        <div>
          <div className="text-[11px] font-bold tracking-[.12em] opacity-80">{unit.toUpperCase()} TA</div>
          <div className="font-display text-xl leading-tight">
            {unit} {n}
          </div>
        </div>
        <div className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold">
          {names.length} pers. · {released ? 'publicat' : 'propunere'}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2.5">
        {names.length === 0 && <span className="px-1 py-1.5 text-xs italic text-cream/60">încă nimeni</span>}
        {names.map((name, i) => (
          <span
            key={name}
            style={{ animationDelay: `${i * 30}ms` }}
            className="anim-chip rounded-full border border-cream/20 bg-white/10 px-[11px] py-[6px] text-[13px] font-medium"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
