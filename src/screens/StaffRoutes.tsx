import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Admin from './Admin'
import Leader from './Leader'
import Poster from './Poster'
import { StaffDataProvider } from './StaffData'
import StaffGate from './StaffGate'
import { TabBar } from './StaffHeader'
import Team from './Team'
import Verify from './Verify'

/**
 * One sign-in, one live data connection and one tab bar for all staff screens,
 * so switching tabs doesn't reload anything.
 */
function StaffShell() {
  const { pathname } = useLocation()
  // "/Admin/" and "/admin" should behave the same (tabs and scope compare exact paths).
  const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (normalized !== pathname) return <Navigate to={normalized} replace />
  const scope = pathname.startsWith('/admin') ? 'admin' : 'leader'
  const showTabs = pathname !== '/admin/afis'
  return (
    <StaffGate scope={scope}>
      {(me) => (
        <StaffDataProvider me={me}>
          <div className={showTabs ? 'with-tabbar' : ''}>
            <Outlet />
          </div>
          {showTabs && <TabBar />}
        </StaffDataProvider>
      )}
    </StaffGate>
  )
}

/**
 * Unknown addresses go to the closest section, so typos like /in/lider, /lideri
 * or /admin/ still land somewhere sensible instead of the participant page.
 */
function GuessRoute() {
  const path = useLocation().pathname.toLowerCase()
  const to = path.includes('admin') ? '/admin' : /lider|leader/.test(path) ? '/lider' : '/in'
  return <Navigate to={to} replace />
}

/** Everything behind Google sign-in. Loaded separately so the participant page stays light. */
export default function StaffRoutes() {
  return (
    <Routes>
      <Route element={<StaffShell />}>
        <Route path="/lider" element={<Leader />} />
        <Route path="/lider/verificare" element={<Verify />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/verificare" element={<Verify />} />
        <Route path="/admin/echipa" element={<Team />} />
        <Route path="/admin/afis" element={<Poster />} />
      </Route>
      <Route path="*" element={<GuessRoute />} />
    </Routes>
  )
}
