import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import * as analytics from './services/analytics'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute }  from './components/AdminRoute'
import { Navbar }      from './components/layout/Navbar'
import { BottomNav }   from './components/layout/BottomNav'
import { EmailVerificationBanner } from './components/EmailVerificationBanner'
import Landing         from './pages/Landing'
import Planner         from './pages/Planner'
import PlanPreview     from './pages/PlanPreview'
import Builds          from './pages/Builds'
import BuildDetail     from './pages/BuildDetail'
import Advisor         from './pages/Advisor'
import Login           from './pages/Login'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import VerifyEmail     from './pages/VerifyEmail'
import ExampleBuild    from './pages/ExampleBuild'
import Admin           from './pages/Admin'
import Analytics       from './pages/Analytics'
import Billing         from './pages/Billing'
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RouteTracker />
        {/* Login renders without the Navbar. Registration is closed — /signup
            redirects to login instead of 404ing for anyone with an old link. */}
        <Routes>
          <Route path="/login"           element={<Login />}          />
          <Route path="/signup"          element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />}  />
          <Route path="/verify-email"    element={<VerifyEmail />}    />
          <Route
            path="*"
            element={
              <>
                <Navbar />
                <EmailVerificationBanner />
                <BottomNav />
                <Routes>
                  <Route path="/"           element={<Landing />}     />
                  <Route path="/planner"    element={<Planner />}     />
                  <Route path="/plan/preview" element={<PlanPreview />} />
                  <Route path="/builds"     element={<ProtectedRoute><Builds /></ProtectedRoute>}      />
                  <Route path="/builds/:id" element={<ProtectedRoute><BuildDetail /></ProtectedRoute>} />
                  <Route path="/advisor"       element={<Advisor />}      />
                  <Route path="/example-build"  element={<ExampleBuild />}  />
                  <Route path="/admin"          element={<AdminRoute><Admin /></AdminRoute>}  />
                  <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>}  />
                  <Route path="/billing"        element={<ProtectedRoute><Billing /></ProtectedRoute>}  />
                </Routes>
              </>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
