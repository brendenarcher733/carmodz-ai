import { useState, useRef } from 'react'
import { useChat } from '../hooks/useChat'
import { Spinner } from '../components/ui/Spinner'
import clsx from 'clsx'

const QUICK_STARTERS = [
  "Where do I start with a $3k budget?",
  "Is a tune worth it before hardware?",
  "Coilovers vs lowering springs?",
  "What kills power on a stock turbo?",
  "Best bang-for-buck mods under $500?",
]

const TOPICS = [
  'Forced Induction', 'ECU Tuning', 'Suspension & Handling', 'Brakes',
  'Intakes & Exhausts', 'Wheels & Tires', 'Fueling & Injectors', 'Track Prep',
]

/* ─── Message bubble ──────────────────────────────────── */

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar — advisor only */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-accent/[0.12] border border-accent/25 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-accent">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M4 6.5c0-1.38 1.12-2.5 2.5-2.5S9 5.12 9 6.5 7.88 9 6.5 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            <circle cx="6.5" cy="6.5" r="1" fill="currentColor"/>
          </svg>
        </div>
      )}

      <div className={clsx(
        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-accent/[0.12] border border-accent/25 text-white rounded-tr-sm'
          : 'bg-surface border border-white/[0.07] text-body rounded-tl-sm',
      )}>
        {msg.content}

        {/* Suggestion chips */}
        {msg.suggestions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {msg.suggestions.map(sug => (
              <button
                key={sug}
                data-sug={sug}
                className="text-xs font-mono text-accent border border-accent/25 bg-accent/[0.06] px-3 py-1.5 rounded-lg hover:bg-accent/[0.12] transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-body">
            <circle cx="6.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M1.5 11.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}

/* ─── Typing indicator ────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-7 h-7 rounded-lg bg-accent/[0.12] border border-accent/25 flex items-center justify-center flex-shrink-0">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-accent">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
          <circle cx="6.5" cy="6.5" r="1" fill="currentColor"/>
        </svg>
      </div>
      <div className="bg-surface border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted"
            style={{ animation: `pulseDot 1.3s ease-in-out ${i * 0.18}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Main Advisor ────────────────────────────────────── */

export default function Advisor() {
  const { messages, loading, sendMessage, updateVehicle, vehicle, bottomRef } = useChat()
  const [input,    setInput]    = useState('')
  const [carYear,  setCarYear]  = useState('')
  const [carMake,  setCarMake]  = useState('')
  const [carModel, setCarModel] = useState('')
  const inputRef = useRef(null)

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    sendMessage(text)
    inputRef.current?.focus()
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleClick = e => {
    const sug = e.target.dataset.sug
    if (sug) sendMessage(sug)
  }

  const handleSetVehicle = e => {
    e.preventDefault()
    if (!carYear && !carMake && !carModel) return
    const v = { year: carYear, make: carMake, model: carModel }
    updateVehicle(v)
    sendMessage(`I'm working on a ${[carYear, carMake, carModel].filter(Boolean).join(' ')}.`)
  }

  const hasVehicle = vehicle && (vehicle.make || vehicle.model)

  return (
    <div className="page-shell relative">
      {/* Atmospheric background — cockpit/interior */}
      <div
        className="absolute top-0 inset-x-0 h-56 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to bottom,
              rgba(8,9,11,0.6)  0%,
              rgba(8,9,11,0.88) 55%,
              rgba(8,9,11,1)    100%
            ),
            url('https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1920&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
        }}
      />
      <div className="container-content py-10 h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-5 relative z-10">

        {/* ── Sidebar ── */}
        <aside className="lg:w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">

          {/* Advisor identity */}
          <div className="bg-surface border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/[0.12] border border-accent/25 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-accent">
                  <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M6 9c0-1.65 1.35-3 3-3s3 1.35 3 3-1.35 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <circle cx="9" cy="9" r="1.25" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="font-display font-bold text-white text-sm">Performance Advisor</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-stage-1 animate-pulse-dot" />
                  <span className="font-mono text-xs text-muted">Ready</span>
                </div>
              </div>
            </div>
            <p className="text-body text-xs leading-relaxed">
              Expert build guidance — mod order, budget allocation, platform-specific
              picks, and what to skip spending money on.
            </p>
          </div>

          {/* Vehicle context */}
          <div className="bg-surface border border-white/[0.07] rounded-2xl p-5">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-3">Your Vehicle</p>
            {hasVehicle ? (
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                </span>
                <button
                  className="text-accent text-xs font-mono hover:underline"
                  onClick={() => { updateVehicle(null); setCarYear(''); setCarMake(''); setCarModel('') }}
                >
                  Change
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetVehicle} className="space-y-2">
                {[
                  { val: carYear,  set: setCarYear,  ph: 'Year (2020)' },
                  { val: carMake,  set: setCarMake,  ph: 'Make (Toyota)' },
                  { val: carModel, set: setCarModel, ph: 'Model (Supra)' },
                ].map(({ val, set: setter, ph }) => (
                  <input
                    key={ph}
                    className="w-full bg-elevated border border-white/[0.07] rounded-xl px-3 py-2 text-white text-xs placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors"
                    placeholder={ph}
                    value={val}
                    onChange={e => setter(e.target.value)}
                  />
                ))}
                <button
                  type="submit"
                  disabled={!carYear && !carMake && !carModel}
                  className="w-full bg-accent/[0.1] border border-accent/25 text-accent text-xs font-display font-semibold py-2 rounded-xl hover:bg-accent/[0.18] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Set My Car
                </button>
              </form>
            )}
          </div>

          {/* Quick starters */}
          <div className="bg-surface border border-white/[0.07] rounded-2xl p-5">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-3">Quick Questions</p>
            <div className="space-y-1.5">
              {QUICK_STARTERS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="w-full text-left text-body text-xs px-3 py-2.5 rounded-lg hover:bg-elevated hover:text-white transition-all duration-150 disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="bg-surface border border-white/[0.07] rounded-2xl p-5">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-3">Topics I Cover</p>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map(t => (
                <span key={t} className="bg-white/[0.05] text-muted text-xs font-mono px-2.5 py-1 rounded-lg">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Chat panel ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface border border-white/[0.07] rounded-2xl overflow-hidden">

          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="w-2 h-2 rounded-full bg-stage-1 animate-pulse-dot" />
            <div>
              <div className="font-display font-semibold text-white text-sm">Performance Advisor</div>
              <div className="text-muted text-xs font-mono">
                {hasVehicle
                  ? `Advising: ${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}`
                  : 'Powered by CarMods AI'}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0"
            onClick={handleClick}
          >
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div
            className="flex items-end gap-3 p-4 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask about mods, budget, your car…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              className="flex-1 bg-elevated border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted resize-none focus:outline-none focus:border-accent/40 transition-colors leading-relaxed"
              style={{ minHeight: '46px', maxHeight: '140px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-accent text-obsidian flex items-center justify-center flex-shrink-0 hover:bg-accent-bright transition-all duration-150 shadow-glow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <Spinner size="sm" className="border-t-obsidian border-obsidian/25" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
