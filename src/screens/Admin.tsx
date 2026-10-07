import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateGroups, resetEvent, updateEvent } from '../lib/data'
import { signOutUser } from '../lib/firebase'
import { KINDS, effectiveSize, leadersNeeded, previewDistribution } from '../lib/logic'
import type { EventDoc } from '../lib/types'
import { Button, ScopeLabel, UserChip, colorFor } from '../ui/kit'
import { useStaffData } from './StaffData'

type Settings = Pick<EventDoc, 'day' | 'time' | 'expected' | 'mode' | 'size' | 'groups'>

const pick = (ev: EventDoc): Settings => ({
  day: ev.day,
  time: ev.time,
  expected: ev.expected,
  mode: ev.mode,
  size: ev.size,
  groups: ev.groups,
})

export default function Admin() {
  const { me, ev, attendees } = useStaffData()
  const navigate = useNavigate()
  const k = KINDS[ev.kind]

  // Local draft so sliders stay smooth; saved shortly after the last change.
  const [draft, setDraft] = useState<Settings>(() => pick(ev))
  const dirty = useRef(false)
  useEffect(() => {
    if (!dirty.current) setDraft(pick(ev))
  }, [ev])
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => {
      dirty.current = false
      updateEvent(draft).catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [draft])
  const set = (patch: Partial<Settings>) => {
    dirty.current = true
    setDraft((d) => ({ ...d, ...patch }))
  }

  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [error, setError] = useState('')

  const needed = leadersNeeded(draft)
  const size = effectiveSize(draft)
  const dist = previewDistribution(draft.expected, needed)
  const minG = Math.min(...dist)
  const maxG = Math.max(...dist)
  const present = ev.active.length
  const short = present < needed
  const avg = ev.history.length ? Math.round(ev.history.reduce((s, n) => s + n, 0) / ev.history.length) : null

  async function primary() {
    if (busy) return
    if (!ev.released) {
      setBusy(true)
      try {
        await generateGroups(ev)
      } catch {
        setError('Nu am putut genera. Mai încearcă.')
        setBusy(false)
        return
      }
      setBusy(false)
    }
    navigate('/admin/verificare')
  }

  async function reset() {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 4000)
      return
    }
    setBusy(true)
    setConfirmReset(false)
    try {
      await resetEvent(ev)
    } catch {
      setError('Resetarea nu a mers. Mai încearcă.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen screen-dense anim-in pb-0!">
      <div className="flex items-center justify-between">
        <ScopeLabel>ADMIN</ScopeLabel>
        <UserChip name={me.displayName} color={colorFor(me.user.email ?? '')} onClick={() => signOutUser()} />
      </div>

      <div className="mt-5 text-[11px] font-bold tracking-[.14em]">EVENIMENT</div>
      <div className="mt-2 flex gap-2">
        <input
          type="date"
          value={draft.day}
          onChange={(e) => e.target.value && set({ day: e.target.value })}
          className="min-w-0 flex-1 rounded-xl border-0 bg-black/22 px-3.5 py-3 text-base font-bold text-cream outline-none [color-scheme:dark]"
        />
        <input
          type="time"
          value={draft.time}
          onChange={(e) => e.target.value && set({ time: e.target.value })}
          className="w-[120px] rounded-xl border-0 bg-black/22 px-3.5 py-3 text-base font-bold text-cream outline-none [color-scheme:dark]"
        />
      </div>

      <div className="mt-[22px] flex gap-1 rounded-full bg-black/22 p-1">
        {(['size', 'count'] as const).map((m) => (
          <button
            key={m}
            onClick={() => set({ mode: m })}
            className={`flex-1 rounded-full border-0 p-[9px] text-[13px] font-semibold ${
              draft.mode === m ? 'bg-cream text-ink' : 'bg-transparent text-cream/80'
            }`}
          >
            {m === 'size' ? 'Mărime' : 'Număr'}
          </button>
        ))}
      </div>

      <SliderCard
        label="PARTICIPANȚI AȘTEPTAȚI"
        value={draft.expected}
        min={10}
        max={150}
        step={5}
        onChange={(v) => set({ expected: v })}
        helper={
          avg === null
            ? undefined
            : ev.history.length === 1
              ? `ultima întâlnire: ${avg}`
              : `media ultimelor ${ev.history.length} întâlniri: ${avg}`
        }
        className="mt-5"
      />
      {draft.mode === 'size' ? (
        <SliderCard label="MĂRIME ȚINTĂ" value={draft.size} min={3} max={15} onChange={(v) => set({ size: v })} className="mt-2.5" />
      ) : (
        <SliderCard
          label={`NUMĂR DE ${k.unitPl.toUpperCase()}`}
          value={draft.groups}
          min={2}
          max={20}
          onChange={(v) => set({ groups: v })}
          className="mt-2.5"
        />
      )}

      <div className="mt-3.5 rounded-[18px] bg-ink p-[18px] text-cream">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[.12em] opacity-80">
              {draft.mode === 'size' ? 'LIDERI NECESARI' : 'MĂRIME REZULTATĂ'}
            </div>
            <div className="mt-1 font-display text-[56px] leading-[.9]">{draft.mode === 'size' ? needed : size}</div>
          </div>
          <div className="whitespace-pre-line text-right text-[13px] leading-[1.4] opacity-90">
            {draft.mode === 'size'
              ? `${draft.expected} ÷ ${draft.size}\n→ ${needed} ${k.unitPl}`
              : `${draft.expected} ÷ ${draft.groups}\n→ ${needed} lideri`}
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-[3px]">
          {dist.map((n, i) => (
            <div key={i} className="relative flex h-[34px] min-w-7 flex-1 items-center justify-center overflow-hidden rounded-md bg-white/18 text-xs font-bold">
              <div style={{ width: `${Math.min(100, Math.round((n / size) * 100))}%` }} className="absolute inset-y-0 left-0 bg-white/30" />
              <span className="relative">{n}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs opacity-85">
          {minG === maxG ? `${needed} ${k.unitPl} a câte ${minG}` : `${needed} ${k.unitPl} între ${minG} și ${maxG} persoane`}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between rounded-2xl bg-black/22 px-4 py-3.5">
        <div>
          <div className="text-sm font-bold">Lideri cu check-in</div>
          <div className="text-xs text-cream/75">{short ? `mai cheamă ${needed - present}` : 'complet'}</div>
        </div>
        <div className={`text-[22px] font-black ${short ? 'text-warn' : ''}`}>
          {present}/{needed}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <SmallLink onClick={() => navigate('/lider')}>Check-in lideri</SmallLink>
        <SmallLink onClick={() => navigate('/admin/echipa')}>Echipa</SmallLink>
        <SmallLink onClick={() => navigate('/admin/afis')}>Afiș QR</SmallLink>
      </div>

      <Button height={48} variant="outline" className="mt-3.5 border-cream/20 text-sm" onClick={reset} disabled={busy}>
        {confirmReset ? 'Apasă din nou ca să confirmi' : 'Resetează participanții'}
      </Button>

      <div className="sticky-footer mt-auto pt-6">
        {error && <div className="text-center text-[13px]">{error}</div>}
        <Button
          height={64}
          variant={ev.released ? 'ink' : 'cream'}
          className="text-lg shadow-[0_8px_24px_rgba(0,0,0,.25)]"
          onClick={primary}
          disabled={busy}
        >
          {ev.released ? `Vezi ${k.unitPl} publicate →` : `Generează ${k.unitPl} →`}
        </Button>
        <div className="text-center text-xs text-cream/75">
          {ev.released ? `Participanții își văd acum ${k.unitAcc}.` : `${attendees.length} în așteptare · ${present} lideri prezenți`}
        </div>
      </div>
    </div>
  )
}

function SliderCard(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  helper?: string
  className?: string
  onChange: (v: number) => void
}) {
  return (
    <div className={`rounded-[18px] bg-black/22 p-4 ${props.className ?? ''}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-bold tracking-[.08em] text-cream/80">{props.label}</div>
        <div className="text-[28px] font-black">{props.value}</div>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="mt-2 w-full"
      />
      {props.helper && <div className="mt-0.5 text-[11px] text-cream/70">{props.helper}</div>}
    </div>
  )
}

function SmallLink({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-11 rounded-full border border-cream/25 bg-black/10 px-2 text-[13px] font-bold text-cream">
      {children}
    </button>
  )
}
