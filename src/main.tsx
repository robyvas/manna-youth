import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './styles.css'
import Admin from './screens/Admin'
import Leader from './screens/Leader'
import Participant from './screens/Participant'
import Poster from './screens/Poster'
import { StaffDataProvider } from './screens/StaffData'
import StaffGate from './screens/StaffGate'
import Team from './screens/Team'
import Verify from './screens/Verify'

function Staff({ scope, children }: { scope: 'leader' | 'admin'; children: ReactNode }) {
  return <StaffGate scope={scope}>{(me) => <StaffDataProvider me={me}>{children}</StaffDataProvider>}</StaffGate>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/in" element={<Participant />} />
        <Route path="/lider" element={<Staff scope="leader"><Leader /></Staff>} />
        <Route path="/lider/verificare" element={<Staff scope="leader"><Verify base="/lider" /></Staff>} />
        <Route path="/admin" element={<Staff scope="admin"><Admin /></Staff>} />
        <Route path="/admin/verificare" element={<Staff scope="admin"><Verify base="/admin" /></Staff>} />
        <Route path="/admin/echipa" element={<Staff scope="admin"><Team /></Staff>} />
        <Route path="/admin/afis" element={<Staff scope="admin"><Poster /></Staff>} />
        <Route path="*" element={<Navigate to="/in" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
