import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Admin from './Admin'
import Leader from './Leader'
import Poster from './Poster'
import { StaffDataProvider } from './StaffData'
import StaffGate from './StaffGate'
import Team from './Team'
import Verify from './Verify'

function Staff({ scope, children }: { scope: 'leader' | 'admin'; children: ReactNode }) {
  return <StaffGate scope={scope}>{(me) => <StaffDataProvider me={me}>{children}</StaffDataProvider>}</StaffGate>
}

/** Everything behind Google sign-in. Loaded separately so the participant page stays light. */
export default function StaffRoutes() {
  return (
    <Routes>
      <Route path="/lider" element={<Staff scope="leader"><Leader /></Staff>} />
      <Route path="/lider/verificare" element={<Staff scope="leader"><Verify /></Staff>} />
      <Route path="/admin" element={<Staff scope="admin"><Admin /></Staff>} />
      <Route path="/admin/verificare" element={<Staff scope="admin"><Verify /></Staff>} />
      <Route path="/admin/echipa" element={<Staff scope="admin"><Team /></Staff>} />
      <Route path="/admin/afis" element={<Staff scope="admin"><Poster /></Staff>} />
      <Route path="*" element={<Navigate to="/in" replace />} />
    </Routes>
  )
}
