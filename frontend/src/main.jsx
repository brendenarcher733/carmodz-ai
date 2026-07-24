import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import * as analytics from './services/analytics'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute }  from './components/AdminRoute'
import { Navbar }      from './components/layout/Navbar'
import { BottomNav }   from './components/layout/BottomNav'
import { EmailVerificationBanner } from './components/EmailVerificationBanner'
import Landing         from './pages/Landing'
import Planner         from './pages/Planner'
import Builds          from './pages/Builds'
import BuildDetail     from './pages/BuildDetail'
import Advisor         from './pages/Advisor'
import Login           from './pages/Login'
import Signup          from './pages/Signup'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import VerifyEmail     from './pages/VerifyEmail'
import ExampleBuild    from './pages/ExampleBuild'
import Configurator    from './pages/Configurator'
import Admin           from './pages/Admin'
import './styles/globals.css'

analytics.init()

// SPA route changes don't trigger a real page load, so PostHog's own
// autocapture pageview (which only fires once) can't see them — this
// fires a $pageview on every client-side navigation instead, which is what
// makes page-level drop-off/funnel analysis possible at all.
function RouteTracker() {
  const location = useLocation()
  useEffect(() => {
    analytics.capture('$pageview', { path: location.pathname })
  }, [location.pathname])
  return null
}

// Configurator gets its own immersive full-screen mobile layout with its
// own floating action buttons (see Configurator.jsx) — a persistent tab
// bar would sit on top of that, so it's the one route the bottom nav
// doesn't render on.
function ConditionalBottomNav() {
  const location = useLocation()
  if (location.pathname.startsWith('/configurator')) return null
  return <BottomNav />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RouteTracker />
        {/* Login / Signup render without the Navbar */}
        <Routes>
          <Route path="/login"           element={<Login />}          />
          <Route path="/signup"          element={<Signup />}         />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />}  />
          <Route path="/verify-email"    element={<VerifyEmail />}    />
          <Route
            path="*"
            element={
              <>
                <Navbar />
                <EmailVerificationBanner />
                <ConditionalBottomNav />
                <Routes>
                  <Route path="/"           element={<Landing />}     />
                  <Route path="/planner"    element={<ProtectedRoute><Planner /></ProtectedRoute>}     />
                  <Route path="/builds"     element={<ProtectedRoute><Builds /></ProtectedRoute>}      />
                  <Route path="/builds/:id" element={<ProtectedRoute><BuildDetail /></ProtectedRoute>} />
                  <Route path="/advisor"       element={<Advisor />}      />
                  <Route path="/example-build"  element={<ExampleBuild />}  />
                  <Route path="/configurator"   element={<ProtectedRoute><Configurator /></ProtectedRoute>}  />
                  <Route path="/admin"          element={<AdminRoute><Admin /></AdminRoute>}  />
                </Routes>
              </>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
