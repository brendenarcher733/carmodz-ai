import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { VehicleVisualConfigurator } from '../components/vehicle-visual/VehicleVisualConfigurator'
import { ConfigPanel } from '../components/configurator/ConfigPanel'
import { BuildSummary } from '../components/configurator/BuildSummary'
import { useCarConfig } from '../hooks/useCarConfig'
import { classifyVehicle } from '../lib/vehicleUtils'
import * as analytics from '../services/analytics'

/* Mobile-only bottom sheet for the Customize / Summary panels. Same visual
   language as components/layout/ProfileSheet.jsx (drag handle, backdrop,
   rounded-top glass panel). */
function MobileSheet({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="md:hidden fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="absolute bottom-0 inset-x-0 rounded-t-3xl overflow-hidden flex flex-col animate-fade-up"
        style={{
          maxHeight: '75dvh',
          background: '#0f1014',
          border: '1px solid rgba(255,255,255,0.09)',
          borderBottom: 'none',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-9 h-1 rounded-full bg-white/[0.15] absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="font-display font-bold text-white text-sm mt-2">{title}</span>
          <button
            onClick={onClose}
            className="tap-target -mr-2 flex items-center justify-center text-muted hover:text-white transition-colors mt-2"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}

function FloatingPill({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="tap-target flex items-center gap-2 px-5 rounded-full font-display font-bold text-sm text-white"
      style={{
        background: 'rgba(19,21,25,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
      }}
    >
      {children}
    </button>
  )
}

export default function Configurator() {
  useEffect(() => { analytics.capture('configurator_used') }, [])

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

  const [panelOpen, setPanelOpen] = useState(null) // null | 'config' | 'summary' (mobile sheet)

  return (
    <div
      className="configurator-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100dvh - 56px - var(--bottom-nav-height, 0px))',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Link
            to="/builds"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, textDecoration: 'none', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">Garage</span>
          </Link>
          <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>/</span>
          <span
            style={{ color: 'white', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display, sans-serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {vehicleName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#FF6B00' }}>
            {summary.items.length} mod{summary.items.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>·</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'white', fontWeight: 700 }}>
            ${summary.total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

        {/* Left — Config panel (desktop only) */}
        <div className="hidden md:flex" style={{ width: 272, flexShrink: 0, overflow: 'hidden', flexDirection: 'column' }}>
          <ConfigPanel
            config={config}
            setSingle={setSingle}
            toggleMulti={toggleMulti}
            setCustomColor={setCustomColor}
          />
        </div>

        {/* Center — 2D visual configurator (single mount, shared by both layouts) */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', padding: 12 }}>
          <VehicleVisualConfigurator make={make || legacyName} model={model} year={year} config={config} />

          {/* Vehicle class badge */}
          <div style={{
            position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(8,9,15,0.72)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '5px 14px',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B00', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {vehicleClass.label}
            </span>
          </div>

          {/* Mobile-only floating action buttons — native-style pill controls
              that open the Customize / Summary sheets below. */}
          <div
            className="md:hidden flex items-center justify-center gap-3 absolute inset-x-0"
            style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
          >
            <FloatingPill onClick={() => setPanelOpen('config')}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2 11L5 5l3 4 2-3 3 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Customize
            </FloatingPill>
            <FloatingPill onClick={() => setPanelOpen('summary')}>
              <span className="text-accent font-mono">{summary.items.length}</span>
              Summary
              <span className="text-muted font-mono">${summary.total.toLocaleString()}</span>
            </FloatingPill>
          </div>
        </div>

        {/* Right — Build summary (desktop only) */}
        <div className="hidden md:flex" style={{ width: 280, flexShrink: 0, overflow: 'hidden', flexDirection: 'column' }}>
          <BuildSummary summary={summary} vehicleName={vehicleName} />
        </div>
      </div>

      {/* ── Mobile sheets ── */}
      <MobileSheet open={panelOpen === 'config'} onClose={() => setPanelOpen(null)} title="Customize">
        <ConfigPanel
          config={config}
          setSingle={setSingle}
          toggleMulti={toggleMulti}
          setCustomColor={setCustomColor}
        />
      </MobileSheet>
      <MobileSheet open={panelOpen === 'summary'} onClose={() => setPanelOpen(null)} title="Build Summary">
        <BuildSummary summary={summary} vehicleName={vehicleName} />
      </MobileSheet>
    </div>
  )
}
