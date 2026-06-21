import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarScene }    from '../components/configurator/CarScene'
import { ConfigPanel } from '../components/configurator/ConfigPanel'
import { BuildSummary } from '../components/configurator/BuildSummary'
import { useCarConfig } from '../hooks/useCarConfig'
import { classifyVehicle } from '../lib/vehicleUtils'

export default function Configurator() {
  const [searchParams] = useSearchParams()
  const make  = searchParams.get('make')  ?? ''
  const model = searchParams.get('model') ?? ''
  const year  = searchParams.get('year')  ?? ''
  // Fallback display name from legacy ?vehicle= param
  const legacyName  = searchParams.get('vehicle') ?? ''
  const vehicleName = (make && model)
    ? `${year} ${make} ${model}`.trim()
    : legacyName || 'Ford Mustang Shelby GT500'

  const vehicleClass = classifyVehicle(make || legacyName, model, year)

  const { config, setSingle, toggleMulti, setCustomColor, summary } = useCarConfig()

  const [panelOpen, setPanelOpen] = useState(null) // null | 'config' | 'summary' (mobile)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',  /* offset for Navbar */
        background: '#0c0d10',
        overflow: 'hidden',
      }}
    >
      {/* ── Vehicle title bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(12,13,16,0.95)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/builds"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Garage
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>/</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display, sans-serif)' }}>
            {vehicleName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#ff8c00' }}>
            {summary.items.length} mod{summary.items.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>·</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'white', fontWeight: 700 }}>
            ${summary.total.toLocaleString()}
          </span>

          {/* Mobile panel toggles */}
          <button
            onClick={() => setPanelOpen(p => p === 'config' ? null : 'config')}
            style={{
              display: 'none', // shown via media query not possible inline — handled with class below
              padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#9ca3af', fontSize: 12, cursor: 'pointer',
            }}
            className="md:hidden"
          >
            Options
          </button>
        </div>
      </div>

      {/* ── Three-panel layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left — Config panel */}
        <div style={{ width: 272, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ConfigPanel
            config={config}
            setSingle={setSingle}
            toggleMulti={toggleMulti}
            setCustomColor={setCustomColor}
          />
        </div>

        {/* Center — 3D viewer */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <CarScene config={config} make={make || legacyName} model={model} year={year} />

          {/* Floating controls hint */}
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,9,11,0.75)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            padding: '5px 12px', pointerEvents: 'none',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>
              drag to orbit · scroll to zoom
            </span>
          </div>

          {/* Vehicle class badge */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(8,9,15,0.72)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,140,0,0.22)',
            borderRadius: 20, padding: '5px 14px',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff8c00', flexShrink: 0, boxShadow: '0 0 6px #ff8c00' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#ff8c00', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {vehicleClass.label}
            </span>
          </div>
        </div>

        {/* Right — Build summary */}
        <div style={{ width: 280, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <BuildSummary summary={summary} vehicleName={vehicleName} />
        </div>
      </div>
    </div>
  )
}
