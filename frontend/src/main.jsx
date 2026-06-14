import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Navbar }      from './components/layout/Navbar'
import Landing         from './pages/Landing'
import Planner         from './pages/Planner'
import Builds          from './pages/Builds'
import BuildDetail     from './pages/BuildDetail'
import Advisor         from './pages/Advisor'
import Login           from './pages/Login'
import Signup          from './pages/Signup'
import ExampleBuild    from './pages/ExampleBuild'
import Configurator    from './pages/Configurator'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* Login / Signup render without the Navbar */}
        <Routes>
          <Route path="/login"  element={<Login />}  />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="*"
            element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/"           element={<Landing />}     />
                  <Route path="/planner"    element={<Planner />}     />
                  <Route path="/builds"     element={<Builds />}      />
                  <Route path="/builds/:id" element={<BuildDetail />} />
                  <Route path="/advisor"       element={<Advisor />}      />
                  <Route path="/example-build"  element={<ExampleBuild />}  />
                  <Route path="/configurator"   element={<Configurator />}  />
                </Routes>
              </>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
