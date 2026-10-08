import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { signOutUser } from '../lib/firebase'
import { KINDS } from '../lib/logic'
import { Icon, ScopeLabel, UserChip, colorFor, type IconName } from '../ui/kit'
import { useStaffData } from './StaffData'

/** Top row of every staff screen: section and who is signed in. */
export default function StaffHeader() {
  const { me } = useStaffData()
  return (
    <div className="flex items-center justify-between gap-2">
      <ScopeLabel>{me.role === 'admin' ? 'ADMIN' : 'LIDERI'}</ScopeLabel>
      <SyncBadge />
      <UserChip name={me.displayName} color={colorFor(me.user.email ?? '')} onClick={() => signOutUser()} />
    </div>
  )
}

/** Shows up only when what's on screen may not match the server (offline or still sending). */
function SyncBadge() {
  const { synced } = useStaffData()
  const [online, setOnline] = useState(navigator.onLine)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  // Short blips are normal; only flag it if it lasts.
  useEffect(() => {
    if (synced && online) return setShow(false)
    const t = setTimeout(() => setShow(true), 1200)
    return () => clearTimeout(t)
  }, [synced, online])
  if (!show) return <div className="flex-1" />
  return (
    <div className="flex flex-1 justify-center">
      <div className="anim-in flex items-center gap-1.5 rounded-full bg-warn px-2.5 py-1 text-[11px] font-bold text-ink">
        <span className="anim-pulse-fast inline-block h-1.5 w-1.5 rounded-full bg-ink" />
        {online ? 'Se sincronizează…' : 'Fără internet'}
      </div>
    </div>
  )
}

interface Tab {
  path: string
  label: string
  icon: IconName
  badge?: number
}

/** Floating glass tab bar, iOS style. Stays mounted between screens so the pill can slide. */
export function TabBar() {
  const { me, ev, attendees, staff } = useStaffData()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAdmin = me.role === 'admin'
  const unit = KINDS[ev.kind].unitPl

  const tabs: Tab[] = [
    ...(isAdmin ? [{ path: '/admin', label: 'Setări', icon: 'sliders' as const }] : []),
    { path: '/lider', label: 'Lideri', icon: 'check', badge: ev.active.length },
    { path: isAdmin ? '/admin/verificare' : '/lider/verificare', label: unit[0].toUpperCase() + unit.slice(1), icon: 'grid', badge: attendees.length },
    ...(isAdmin ? [{ path: '/admin/echipa', label: 'Echipa', icon: 'users' as const, badge: staff.length }] : []),
  ]
  const index = tabs.findIndex((t) => pathname === t.path || (t.path.endsWith('verificare') && pathname.endsWith('verificare')))

  function go(path: string, on: boolean) {
    if (on) return
    if ('vibrate' in navigator) navigator.vibrate?.(8)
    navigate(path)
  }

  return (
    <nav className="tabbar no-print" aria-label="Navigare">
      <div className="glass relative flex rounded-[30px] p-1.5">
        {index >= 0 && (
          <div
            aria-hidden
            style={{ width: `calc((100% - 12px) / ${tabs.length})`, transform: `translateX(${index * 100}%)` }}
            className="tab-pill absolute bottom-1.5 left-1.5 top-1.5 rounded-[24px]"
          />
        )}
        {tabs.map((t, i) => {
          const on = i === index
          return (
            <button
              key={t.path}
              onClick={() => go(t.path, on)}
              aria-current={on ? 'page' : undefined}
              className={`press relative z-10 flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[24px] px-1 pb-1.5 pt-2 text-[11px] font-bold transition-colors duration-300 ${
                on ? 'text-ink' : 'text-cream/85'
              }`}
            >
              <Icon name={t.icon} size={22} className={`transition-transform duration-300 ${on ? 'scale-110' : ''}`} />
              <span className="truncate">{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  key={t.badge}
                  className={`anim-bump absolute right-[calc(50%-22px)] top-1 min-w-[17px] rounded-full px-1 text-center text-[10px] leading-[17px] ${
                    on ? 'bg-manna text-cream' : 'bg-cream text-ink'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
