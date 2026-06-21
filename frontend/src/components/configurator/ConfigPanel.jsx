import { useState } from 'react'
import clsx from 'clsx'
import { MODIFICATIONS } from '../../data/modifications'

const CATEGORY_ORDER = ['paint', 'tint', 'wheels', 'performance', 'suspension', 'brakes', 'exterior', 'interior']

const ICONS = {
  paint:       <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 4.5a3 3 0 1 1 0 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  tint:        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="4" width="11" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M2 7h11" stroke="currentColor" strokeWidth="1.3"/></svg>,
  wheels:      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 2v2M7.5 11v2M2 7.5h2M11 7.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  performance: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 11L5 5l3 4 2-3 3 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  suspension:  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 12V6M12 12V6M3 6l4.5-4 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 12h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  brakes:      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.3"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 2.5v2M7.5 10.5v2M2.5 7.5h2M10.5 7.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  exterior:    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 9l2-4h9l2 4H1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M3 9v2h9V9" stroke="currentColor" strokeWidth="1.3"/><circle cx="4.5" cy="11.5" r="1" fill="currentColor"/><circle cx="10.5" cy="11.5" r="1" fill="currentColor"/></svg>,
  interior:    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="3" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M5 3v3h5V3M2 9h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
}

/* Paint swatch color map */
const SWATCH = {
  oxfordWhite:     '#f4f0eb', glossBlack:    '#0a0a0a', matteBlack:  '#181818',
  satinBlack:      '#141414', rossaCorsa:    '#cc0000', rapidRed:    '#8b1a1a',
  performanceBlue: '#0c2d7c', bielaAvus:     '#e8e4de', magneticGray:'#3a3a42',
  nardoGray:       '#8a8d8f', gialloOrion:   '#d4a017', verdeMantis: '#3a7a25',
  blu:             '#0a3d7a', deepViolet:    '#2e0e4f', carbonWrap:  '#111111',
  satingoldwrap:   '#a07020', chromewrap:    '#b0b8c0', customColor: null,
}

export function ConfigPanel({ config, setSingle, toggleMulti, setCustomColor }) {
  const [activeTab, setActiveTab] = useState('paint')
  const cat = MODIFICATIONS[activeTab]

  function handleOption(id) {
    if (cat.single) setSingle(activeTab, id)
    else toggleMulti(activeTab, id)
  }

  function isSelected(id) {
    if (cat.single) return config[activeTab] === id
    return config[activeTab].includes(id)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0f1014', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Category tabs */}
      <div className="flex-shrink-0 px-3 pt-4 pb-2">
        <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3 px-1">Customize</p>
        <nav className="space-y-0.5">
          {CATEGORY_ORDER.map(key => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                activeTab === key
                  ? 'bg-accent/[0.12] text-accent'
                  : 'text-muted hover:text-body hover:bg-white/[0.04]',
              )}
            >
              <span className="flex-shrink-0">{ICONS[key]}</span>
              <span className="font-display font-semibold text-sm">{MODIFICATIONS[key].label}</span>
              {!cat.single && activeTab !== key && config[key]?.length > 0 && (
                <span className="ml-auto font-mono text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                  {config[key].length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 12px' }} />

      {/* Options list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {cat.options.map(opt => {
          const selected = isSelected(opt.id)
          const swatch = activeTab === 'paint' ? SWATCH[opt.id] : null

          return (
            <button
              key={opt.id}
              onClick={() => handleOption(opt.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150',
                selected
                  ? 'bg-accent/[0.10] border-accent/40 text-white'
                  : 'bg-white/[0.02] border-white/[0.06] text-body hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white',
              )}
            >
              {/* Color swatch for paint */}
              {swatch !== undefined && (
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full border border-white/10 shadow-inner"
                  style={{ background: swatch ?? config.customColor }}
                />
              )}

              {/* Multi-select checkbox */}
              {cat.multi && (
                <span className={clsx(
                  'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all',
                  selected ? 'bg-accent border-accent' : 'border-white/20 bg-transparent',
                )}>
                  {selected && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="#0c0d10" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-sm leading-snug truncate">{opt.label}</div>
                <div className="font-mono text-[11px] text-muted mt-0.5">
                  {opt.price === 0 ? 'Included' : `+$${opt.price.toLocaleString()}`}
                </div>
              </div>

              {selected && !cat.multi && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent flex-shrink-0">
                  <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )
        })}

        {/* Custom color picker for paint */}
        {activeTab === 'paint' && config.paint === 'customColor' && (
          <div className="px-3 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl mt-2">
            <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-2">Hex Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.customColor}
                onChange={e => setCustomColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={config.customColor}
                onChange={e => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setCustomColor(e.target.value)
                }}
                className="flex-1 font-mono text-sm bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
