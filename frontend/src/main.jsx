import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar }      from './components/layout/Navbar'
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
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
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
                <Routes>
                  <Route path="/"           element={<Landing />}     />
                  <Route path="/planner"    element={<ProtectedRoute><Planner /></ProtectedRoute>}     />
                  <Route path="/builds"     element={<ProtectedRoute><Builds /></ProtectedRoute>}      />
                  <Route path="/builds/:id" element={<ProtectedRoute><BuildDetail /></ProtectedRoute>} />
                  <Route path="/advisor"       element={<Advisor />}      />
                  <Route path="/example-build"  element={<ExampleBuild />}  />
                  <Route path="/configurator"   element={<ProtectedRoute><Configurator /></ProtectedRoute>}  />
                </Routes>
              </>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
