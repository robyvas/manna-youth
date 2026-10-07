import { useEffect, useState } from 'react'
import { DEVICE_KEY, NameTakenError, isNameTaken, joinEvent } from '../lib/data'
import { ensureSignedIn } from '../lib/firebase'
import { useEvent, useMyAttendee } from '../lib/hooks'
import { COLORS, KINDS, cleanName, firstName, fmtDate, initials, todayISO } from '../lib/logic'
import type { EventDoc } from '../lib/types'
import { BackPill, Button, Chip, Icon, Logo, Notice, Spinner, Star } from '../ui/kit'

function readDevice(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY)
  } catch {
    return null
  }
}

function forgetDevice() {
  try {
    localStorage.removeItem(DEVICE_KEY)
  } catch {
    // ignore
  }
}

export default function Participant() {
  const [signedIn, setSignedIn] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [myId, setMyId] = useState<string | null>(readDevice)
  const [step, setStep] = useState<'landing' | 'name'>('landing')

  useEffect(() => {
    ensureSignedIn()
      .then(() => setSignedIn(true))
      .catch(() => setAuthError(true))
  }, [])

  const { ev, exists } = useEvent(signedIn)
  const { loading, me } = useMyAttendee(signedIn ? myId : null)

  // The admin reset the event: this device starts over.
  useEffect(() => {
    if (myId && signedIn && !loading && !me) {
      forgetDevice()
      setMyId(null)
      setStep('landing')
    }
  }, [myId, signedIn, loading, me])

  if (authError) return <Unavailable text="Nu ne-am putut conecta. Verifică internetul și reîncarcă pagina." />
  if (!signedIn || exists === null || (myId && loading)) return <Spinner />
  if (!ev) return <Unavailable text="Nu e nicio întâlnire programată acum." />

  if (me) {
    const idx = ev.active.findIndex((l) => l.pid === me.leaderId)
    if (ev.released && idx >= 0) return <Reveal ev={ev} name={me.name} index={idx} />
    return <Waiting ev={ev} name={me.name} />
  }

  if (step === 'name') return <NameStep ev={ev} onBack={() => setStep('landing')} onJoined={setMyId} />
  return <Landing ev={ev} onNext={() => setStep('name')} />
}

function Unavailable({ text }: { text: string }) {
  return (
    <div className="screen anim-in items-center justify-center text-center">
      <Logo width={160} />
      <div className="mt-6 max-w-[300px] text-[15px] leading-[1.45] opacity-90">{text}</div>
    </div>
  )
}

function Landing({ ev, onNext }: { ev: EventDoc; onNext: () => void }) {
  const k = KINDS[ev.kind]
  const isToday = ev.day === todayISO()
  return (
    <div className="screen anim-in">
      <div className="flex justify-end text-[11px] font-bold tracking-[.14em] opacity-85">
        <span>{fmtDate(ev.day, ev.time)}</span>
      </div>
      <div className="my-auto flex flex-col items-center text-center">
        <Logo width={200} className="anim-float" />
        <div className="mt-[26px]">
          <Chip>{k.label}</Chip>
        </div>
        {isToday ? (
          <>
            <div className="mt-3.5 text-[15px] leading-[1.45] opacity-90">
              Spune-ne cum te cheamă și îți găsim {k.unitAcc} pentru seara asta.
            </div>
            <Button className="anim-in mt-7 text-base shadow-[0_8px_24px_rgba(0,0,0,.18)]" style={{ animationDelay: '150ms' }} onClick={onNext}>
              Intru <Icon name="arrow" />
            </Button>
          </>
        ) : (
          <div className="mt-3.5 text-[15px] leading-[1.45] opacity-90">
            Check-in-ul se deschide în ziua întâlnirii. Ne vedem atunci!
          </div>
        )}
      </div>
    </div>
  )
}

function NameStep({ ev, onBack, onJoined }: { ev: EventDoc; onBack: () => void; onJoined: (id: string) => void }) {
  const k = KINDS[ev.kind]
  const [name, setName] = useState('')
  const [taken, setTaken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const typed = cleanName(name)
  const isTaken = taken !== null && taken === typed.toLowerCase()

  useEffect(() => {
    if (typed.length < 2) return
    const t = setTimeout(() => {
      isNameTaken(typed)
        .then((yes) => setTaken(yes ? typed.toLowerCase() : null))
        .catch(() => {})
    }, 350)
    return () => clearTimeout(t)
  }, [typed])

  const canSubmit = typed.length >= 2 && !isTaken && !busy

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      onJoined(await joinEvent(typed))
    } catch (e) {
      if (e instanceof NameTakenError) setTaken(typed.toLowerCase())
      else setError('Nu am reușit să te înscriem. Mai încearcă o dată.')
      setBusy(false)
    }
  }

  return (
    <div className="screen anim-in relative overflow-hidden">
      <div className="flex items-center justify-between">
        <BackPill onClick={onBack}>← înapoi</BackPill>
        <Star size={18} />
      </div>
      <form
        className="my-auto flex flex-col items-start"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Chip>{k.label}</Chip>
        <div className="mt-3.5 font-display text-[34px] leading-none tracking-[-.02em]">Cum te cheamă?</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prenumele tău"
          autoFocus
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={40}
          enterKeyHint="go"
          className="mt-7 w-full border-0 border-b-[3px] border-cream/60 bg-transparent py-2.5 text-[30px] font-bold tracking-[-.01em] text-cream outline-none transition-colors duration-300 focus:border-cream"
        />
        {isTaken && (
          <div className="anim-shake mt-2.5 text-[13px] opacity-85">
            Mai e un {typed} aici. Adaugă inițiala numelui (ex. „{typed} P.”).
          </div>
        )}
        {error && <div className="mt-2.5 text-[13px] opacity-85">{error}</div>}
        <div className="mt-7 flex w-full flex-col gap-2.5">
          {ev.released && ev.active.length === 0 && (
            <Notice>Niciun lider nu a dat check-in încă. Repartizarea nu poate fi trimisă.</Notice>
          )}
          <Button type="submit" variant={canSubmit ? 'cream' : 'muted'} disabled={!canSubmit} className="text-base">
            {busy ? (
              <>
                <Star size={18} className="anim-spin" /> Te înscriem…
              </>
            ) : (
              <>
                Găsește-mi {k.unitAcc} <Icon name="arrow" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Waiting({ ev, name }: { ev: EventDoc; name: string }) {
  const copy = ev.released
    ? 'Liderii încă se organizează. Ecranul se actualizează singur.'
    : 'Repartizarea se trimite când toți au ajuns. Ecranul se actualizează singur.'
  return (
    <div className="screen anim-in">
      <Star />
      <div className="my-auto text-center">
        <Star size={72} className="anim-pulse mx-auto" />
        <div className="mt-3 font-display text-[30px] leading-none">
          Ești pe listă,
          <br />
          {firstName(name)}.
        </div>
        <div className="mt-3 text-sm leading-normal text-cream/80">{copy}</div>
        <div className="mt-[22px] inline-flex items-center gap-2 rounded-full bg-black/22 px-3.5 py-2 text-xs text-cream/70">
          <span className="anim-pulse-fast inline-block h-[7px] w-[7px] rounded-full bg-[#c9865f]" />
          {ev.count} înscriși până acum
        </div>
      </div>
      <div className="text-center text-xs opacity-70">Poți închide pagina. La revenire te recunoaștem.</div>
    </div>
  )
}

function Reveal({ ev, name, index }: { ev: EventDoc; name: string; index: number }) {
  const k = KINDS[ev.kind]
  const leader = ev.active[index]
  const n = index + 1
  const color = COLORS[index % COLORS.length]
  const count = ev.sizes[leader.pid] ?? 0

  useEffect(() => {
    document.body.style.background = color
    // A short buzz on Android when the group appears.
    if ('vibrate' in navigator) navigator.vibrate?.([40, 60, 40])
    return () => {
      document.body.style.background = ''
    }
  }, [color])

  return (
    <div className="relative min-h-dvh overflow-hidden bg-manna">
      <div key={leader.pid} style={{ background: color }} className="anim-wipe absolute inset-0" />
      <div
        aria-hidden
        key={`n-${leader.pid}`}
        style={{ animationDelay: '350ms' }}
        className="anim-in pointer-events-none absolute -right-10 top-[120px] select-none font-display text-[300px] leading-none tracking-[-.06em] text-white/8"
      >
        {n}
      </div>
      <div className="screen relative">
        <div className="flex items-center justify-between text-[11px] font-bold tracking-[.14em] opacity-80">
          <Star />
          <span>{fmtDate(ev.day, ev.time)}</span>
        </div>
        <div key={`${leader.pid}`} style={{ animationDelay: '250ms' }} className="anim-pop relative mt-auto">
          <div className="text-[15px] opacity-85">
            Salut, <b>{firstName(name)}</b>. Ești în
          </div>
          <div className="mt-1.5 whitespace-nowrap font-display text-[64px] leading-[.9] tracking-[-.04em]">
            {k.unit} {n}
          </div>
          <div className="mt-[26px] flex items-center gap-3.5 rounded-[18px] bg-black/22 p-3.5 backdrop-blur-[6px]">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-cream text-xl font-black text-ink">
              {initials(leader.name)}
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold tracking-[.12em] opacity-75">LIDERUL TĂU</div>
              <div className="text-lg font-bold">{leader.name}</div>
            </div>
          </div>
          <div className="mt-3.5 text-[13px] opacity-85">
            Sunteți {count}. Mergi la {firstName(leader.name)}.
          </div>
          <div className="mt-[22px] text-center text-xs opacity-70">Ecranul rămâne salvat pe telefonul tău.</div>
        </div>
      </div>
    </div>
  )
}
