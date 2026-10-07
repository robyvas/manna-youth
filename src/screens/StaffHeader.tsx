import { useLocation, useNavigate } from 'react-router-dom'
import { signOutUser } from '../lib/firebase'
import { KINDS } from '../lib/logic'
import { Icon, ScopeLabel, UserChip, colorFor, type IconName } from '../ui/kit'
import { useStaffData } from './StaffData'

interface Tab {
  path: string
  label: string
  icon: IconName
  badge?: number
}

/** Top bar for every staff screen: who is signed in, plus tabs between sections. */
export default function StaffHeader() {
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
  const active = (p: string) => pathname === p || (p.endsWith('verificare') && pathname.endsWith('verificare'))

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <ScopeLabel>{isAdmin ? 'ADMIN' : 'LIDERI'}</ScopeLabel>
        <UserChip name={me.displayName} color={colorFor(me.user.email ?? '')} onClick={() => signOutUser()} />
      </div>
      <nav className="flex gap-1 rounded-2xl bg-black/22 p-1">
        {tabs.map((t) => {
          const on = active(t.path)
          return (
            <button
              key={t.path}
              onClick={() => !on && navigate(t.path)}
              aria-current={on ? 'page' : undefined}
              className={`press relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-bold ${
                on ? 'bg-cream text-ink shadow-[0_2px_8px_rgba(0,0,0,.18)]' : 'text-cream/80 hover:bg-white/8'
              }`}
            >
              <Icon name={t.icon} size={18} />
              <span className="truncate">{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  key={t.badge}
                  className={`anim-bump absolute right-1.5 top-1 min-w-[18px] rounded-full px-1 text-[10px] leading-[18px] ${
                    on ? 'bg-manna text-cream' : 'bg-cream text-ink'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
