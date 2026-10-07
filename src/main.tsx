import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './styles.css'
import Participant from './screens/Participant'
import { Spinner } from './ui/kit'

const StaffRoutes = lazy(() => import('./screens/StaffRoutes'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/in" element={<Participant />} />
          <Route path="*" element={<StaffRoutes />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
