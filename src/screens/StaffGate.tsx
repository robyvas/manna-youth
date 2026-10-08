import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOutUser } from '../lib/firebase'
import { signInWithGoogle } from '../lib/googleSignIn'
import { useStaffSession } from '../lib/hooks'
import type { Role, Staff } from '../lib/types'
import { Button, GoogleG, Logo, ScopeLabel, Spinner, colorFor } from '../ui/kit'
import type { User } from 'firebase/auth'

export interface StaffUser {
  user: User
  member: Staff | null
  role: Exclude<Role, 'none'>
  displayName: string
}

/** Google sign-in plus role check for /lider and /admin. */
export default function StaffGate({ scope, children }: { scope: 'leader' | 'admin'; children: (u: StaffUser) => ReactNode }) {
  const session = useStaffSession()
  if (session.status === 'loading') return <Spinner />
  if (session.status === 'signedOut') return <Login scope={scope} />

  const { user, member, role } = session
  if (role === 'none') return <Denied scope={scope} user={user} kind="unknown" />
  if (scope === 'admin' && role !== 'admin') return <Denied scope={scope} user={user} kind="leader" />
  const displayName = member?.name || user.displayName || user.email || ''
  return <>{children({ user, member, role, displayName })}</>
}

function Login({ scope }: { scope: 'leader' | 'admin' }) {
  const [error, setError] = useState('')
  async function go() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      if (code.includes('popup-closed') || code.includes('cancelled-popup')) return
      if (code.includes('popup-blocked')) setError('Browserul a blocat fereastra Google. Permite pop-up-urile pentru acest site și apasă din nou.')
      else if (code.includes('network')) setError('Nu e conexiune la internet. Verifică și mai încearcă.')
      else setError('Conectarea nu a mers. Mai încearcă o dată.')
    }
  }
  return (
    <div className="screen anim-in">
      <ScopeLabel>{scope === 'admin' ? 'ADMIN' : 'LIDERI'}</ScopeLabel>
      <div className="flex flex-1 flex-col">
        <div className="mt-auto">
          <Logo width={180} />
        </div>
        <div className="mt-[22px] font-display text-[34px] leading-none tracking-[-.02em]">
          Intră ca
          <br />
          {scope === 'admin' ? 'admin' : 'lider'}.
        </div>
        <div className="mt-3 text-sm leading-normal text-cream/80">
          Doar conturile Google din lista echipei Manna au acces. Fără parole noi.
        </div>
        <Button className="mt-[30px] text-[15px]" onClick={go}>
          <GoogleG />
          Continuă cu Google
        </Button>
        {error && <div className="mt-3 text-center text-[13px]">{error}</div>}
        <div className="mt-3.5 text-center text-xs text-cream/70">Participanții nu au nevoie de cont, doar scanează QR-ul.</div>
      </div>
    </div>
  )
}

function Denied({ scope, user, kind }: { scope: 'leader' | 'admin'; user: User; kind: 'unknown' | 'leader' }) {
  const navigate = useNavigate()
  const name = user.displayName || user.email || ''
  return (
    <div className="screen anim-in">
      <ScopeLabel>{scope === 'admin' ? 'ADMIN' : 'LIDERI'}</ScopeLabel>
      <div className="flex flex-1 flex-col">
        <div className="mt-auto flex items-center gap-3">
          <div style={{ background: colorFor(user.email ?? name) }} className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-[15px] font-bold">{name}</div>
            <div className="text-xs text-cream/75">{user.email}</div>
          </div>
        </div>
        <div className="mt-[22px] font-display text-[32px] leading-none tracking-[-.02em]">
          {kind === 'leader' ? 'Contul tău e de lider, nu de admin.' : 'Contul ăsta nu e pe lista echipei.'}
        </div>
        <div className="mt-3 text-sm leading-normal text-cream/80">
          {kind === 'leader'
            ? 'Setările evenimentului sunt doar pentru admini. Check-in-ul și trimiterea repartizării le ai în Lideri.'
            : 'Dacă ești lider, cere unui admin să-ți adauge adresa Google. Dacă ești participant, scanează QR-ul de la intrare.'}
        </div>
        {kind === 'leader' && (
          <Button height={52} className="mt-7 text-[15px]" onClick={() => navigate('/lider')}>
            Înapoi la Lideri
          </Button>
        )}
        <Button height={52} variant="outline" className={`${kind === 'leader' ? 'mt-2.5' : 'mt-7'} text-[15px]`} onClick={() => signOutUser()}>
          Alt cont
        </Button>
      </div>
    </div>
  )
}
