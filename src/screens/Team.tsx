import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addStaff, removeStaff, updateStaff } from '../lib/data'
import { initials } from '../lib/logic'
import type { Staff } from '../lib/types'
import { BackPill, Button, Notice, Star } from '../ui/kit'
import { useStaffData } from './StaffData'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Team() {
  const { me, ev, staff } = useStaffData()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)

  const myEmail = me.user.email?.toLowerCase()
  const admins = staff.filter((s) => s.isAdmin).length

  async function run(fn: () => Promise<unknown>, fail = 'Nu s-a salvat. Mai încearcă.') {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message === 'exists' ? 'Adresa asta e deja în echipă.' : fail)
    } finally {
      setBusy(false)
    }
  }

  function add() {
    const cleanEmail = email.trim().toLowerCase()
    if (name.trim().length < 2) return setError('Scrie numele liderului.')
    if (!EMAIL_RE.test(cleanEmail)) return setError('Adresa de email nu pare corectă.')
    run(async () => {
      const order = staff.reduce((m, s) => Math.max(m, s.order), 0) + 1
      await addStaff({ name, email: cleanEmail, isLeader: true, isAdmin: false }, order)
      setName('')
      setEmail('')
    })
  }

  function remove(s: Staff) {
    if (confirm !== s.email) {
      setConfirm(s.email)
      setTimeout(() => setConfirm((c) => (c === s.email ? null : c)), 4000)
      return
    }
    setConfirm(null)
    run(() => removeStaff(staff, ev, s))
  }

  return (
    <div className="screen screen-dense anim-in">
      <div className="flex items-center justify-between">
        <BackPill onClick={() => navigate('/admin')}>← Setări</BackPill>
        <div className="flex items-center gap-2">
          <Star />
          <span className="text-[13px] font-bold tracking-[.1em]">ECHIPA</span>
        </div>
      </div>
      <div className="mt-[18px] font-display text-[30px] leading-none tracking-[-.02em]">Echipa Manna.</div>
      <div className="mt-2 text-[13px] text-cream/80">
        Liderii apar în lista de check-in. Adminii pot schimba setările și echipa. Fiecare intră cu adresa Google de aici.
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {staff.map((s) => {
          const self = s.email === myEmail
          const lastAdmin = s.isAdmin && admins <= 1
          return (
            <div key={s.email} className="rounded-2xl border border-cream/8 bg-black/18 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15 text-sm font-black">
                  {initials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">
                    {s.name}
                    {self && <span className="ml-1.5 text-[11px]">· tu</span>}
                  </div>
                  <div className="truncate text-xs text-cream/75">{s.email}</div>
                </div>
                {!self && (
                  <button
                    onClick={() => remove(s)}
                    disabled={busy}
                    className="rounded-full border border-cream/25 px-3 py-1.5 text-xs font-bold text-cream"
                  >
                    {confirm === s.email ? 'Sigur?' : 'Scoate'}
                  </button>
                )}
              </div>
              <div className="mt-2.5 flex gap-2 pl-[52px]">
                <Toggle on={s.isLeader} disabled={busy} onClick={() => run(() => updateStaff(s.email, { isLeader: !s.isLeader }))}>
                  Lider
                </Toggle>
                <Toggle
                  on={s.isAdmin}
                  disabled={busy || (s.isAdmin && (self || lastAdmin))}
                  onClick={() => run(() => updateStaff(s.email, { isAdmin: !s.isAdmin }))}
                >
                  Admin
                </Toggle>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-[18px] bg-black/22 p-4">
        <div className="text-xs font-bold tracking-[.08em] text-cream/80">ADAUGĂ LIDER</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nume și prenume"
          maxLength={50}
          className="mt-3 w-full rounded-xl border-0 bg-black/22 px-3.5 py-3 text-[15px] font-bold text-cream outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adresa@gmail.com"
          type="email"
          autoCapitalize="off"
          autoCorrect="off"
          className="mt-2 w-full rounded-xl border-0 bg-black/22 px-3.5 py-3 text-[15px] font-bold text-cream outline-none"
        />
        <Button height={48} className="mt-3 text-sm" onClick={add} disabled={busy}>
          Adaugă în echipă
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Notice strong>{error}</Notice>
        </div>
      )}
      <div className="mt-4 text-center text-xs text-cream/70">
        Nu îți poți scoate singur rolul de admin. Asta poate face doar alt admin.
      </div>
    </div>
  )
}

function Toggle({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
        on ? 'bg-cream text-ink' : 'border border-cream/25 bg-transparent text-cream/75'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {on ? '✓ ' : ''}
      {children}
    </button>
  )
}
