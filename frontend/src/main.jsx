import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import Landing     from './pages/Landing'
import Planner     from './pages/Planner'
import Builds      from './pages/Builds'
import BuildDetail from './pages/BuildDetail'
import Advisor     from './pages/Advisor'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"            element={<Landing />}     />
        <Route path="/planner"     element={<Planner />}     />
        <Route path="/builds"      element={<Builds />}      />
        <Route path="/builds/:id"  element={<BuildDetail />} />
        <Route path="/advisor"     element={<Advisor />}     />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
