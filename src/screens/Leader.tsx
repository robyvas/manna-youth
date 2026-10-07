import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateGroups, setCheckIn } from '../lib/data'
import { signOutUser } from '../lib/firebase'
import { COLORS, KINDS, effectiveSize, initials, leadersNeeded } from '../lib/logic'
import type { Staff } from '../lib/types'
import { BackPill, Button, ScopeLabel, UserChip, colorFor } from '../ui/kit'
import { useStaffData } from './StaffData'

export default function Leader() {
  const { me, ev, staff } = useStaffData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const k = KINDS[ev.kind]

  const leaders = staff.filter((s) => s.isLeader)
  const present = new Map(ev.active.map((l, i) => [l.pid, i]))
  const needed = leadersNeeded(ev)
  const short = ev.active.length < needed
  const mine = me.member && leaders.some((l) => l.email === me.member!.email) ? me.member : null

  const intro = mine
    ? present.has(mine.pid)
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
    navigate('/lider/verificare')
  }

  return (
    <div className="screen screen-dense anim-in">
      <div className="flex items-center justify-between">
        <ScopeLabel>LIDERI</ScopeLabel>
        <div className="flex items-center gap-2">
          {me.role === 'admin' && <BackPill onClick={() => navigate('/admin')}>Setări</BackPill>}
          <UserChip name={me.displayName} color={colorFor(me.user.email ?? '')} onClick={() => signOutUser()} />
        </div>
      </div>
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

      <div className="mt-4 flex flex-1 flex-col gap-2">
        {leaders.length === 0 && (
          <div className="rounded-2xl bg-black/18 p-4 text-[13px] text-cream/80">
            Nu e niciun lider în echipă încă. Un admin îi poate adăuga din Setări → Echipa.
          </div>
        )}
        {leaders.map((l) => {
          const idx = present.get(l.pid)
          const on = idx !== undefined
          const color = on ? COLORS[idx % COLORS.length] : 'rgba(255,255,255,.15)'
          return (
            <button
              key={l.email}
              onClick={() => toggle(l)}
              disabled={busy !== null}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-cream transition-all duration-200 ${
                on ? 'border-cream/60 bg-black/35' : 'border-cream/8 bg-black/18'
              } ${busy === l.pid ? 'opacity-60' : ''}`}
            >
              <div
                style={{ background: color }}
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-black ${on ? 'text-cream' : 'text-cream/75'}`}
              >
                {initials(l.name)}
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
              <div className={`text-xs font-bold tracking-[.08em] ${on ? 'text-cream' : 'text-cream/45'}`}>
                {on ? 'PREZENT' : 'CHECK-IN'}
              </div>
            </button>
          )
        })}
      </div>

      {error && <div className="mt-3 text-center text-[13px]">{error}</div>}
      <Button
        height={52}
        variant={ev.released ? 'ink' : 'cream'}
        className="mt-3 flex-none text-[15px]"
        onClick={primary}
        disabled={busy !== null}
      >
        {busy === 'generate' ? 'Se generează…' : ev.released ? `Vezi ${k.unitPl} publicate →` : `Generează ${k.unitPl} →`}
      </Button>
    </div>
  )
}

function Tile({ label, value, warn = false, suffix }: { label: string; value: number; warn?: boolean; suffix?: string }) {
  return (
    <div className="flex-1 rounded-[14px] bg-black/22 p-3">
      <div className="text-[11px] font-bold tracking-[.1em] text-cream/75">{label}</div>
      <div className={`mt-0.5 text-[26px] font-black ${warn ? 'text-warn' : ''}`}>
        {value}
        {suffix && <span className="text-[13px] text-cream/75">{suffix}</span>}
      </div>
    </div>
  )
}
