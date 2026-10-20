import { useState } from 'react'
import { guidesApi } from '../../services/api'
import { Spinner } from './Spinner'
import { Alert } from './Alert'

/* ─── On-demand install guide for one recommendation ───
   Generated lazily, only once this panel is first expanded — never as part
   of the initial plan response. Stateless on the backend (no build/
   recommendation ID needed), so this works identically for a saved build's
   mod and a never-saved anonymous preview mod. See routers/guides.py. */
export function InstallGuidePanel({ mod, vehicle }) {
  const [open, setOpen]       = useState(false)
  const [guide, setGuide]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await guidesApi.generate({
        name: mod.name,
        category: mod.category,
        difficulty: mod.difficulty,
        suggested_search_terms: mod.suggested_search_terms || [],
        year: vehicle?.year,
        make: vehicle?.make,
        model: vehicle?.model,
      })
      setGuide(data)
    } catch {
      // Deliberately not showing the caught error's own message — this is a
      // short, fixed, user-facing line regardless of what actually failed
      // underneath (network, rate limit, an unexpected bug).
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && !guide && !loading && !error) load()
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="focus-ring-ai rounded-md w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          {/* `text-ai` — this content is AI-assisted, same color convention
              ModCard already uses for AI-sourced signals. */}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-ai">
            <path d="M8.5 2.5l2 2-5.5 5.5-2.5.5.5-2.5 5.5-5.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-xs uppercase tracking-wider text-muted group-hover:text-body transition-colors">
            Install Guide
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="mt-3 animate-fade-in">
          {loading && (
            <div className="flex items-center gap-2.5 text-muted text-xs py-2">
              <Spinner size="sm" variant="ai" />
              Generating install guide…
            </div>
          )}

          {!loading && error && (
            <div className="space-y-2">
              <Alert variant="error">
                <span className="text-xs">Couldn't load an install guide right now.</span>
              </Alert>
              <button
                type="button"
                onClick={load}
                className="focus-ring-ai rounded-md font-mono text-xs text-ai hover:underline underline-offset-2"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && guide && (
            <div className="space-y-3">
              {guide.estimated_time && (
                <div className="font-mono text-xs text-muted">
                  Est. time: <span className="text-body">{guide.estimated_time}</span>
                </div>
              )}

              {guide.tools.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-wider mb-1">Tools needed</p>
                  <p className="text-xs text-body leading-relaxed">{guide.tools.join(' · ')}</p>
                </div>
              )}

              {guide.parts_to_confirm.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-wider mb-1">Confirm before buying</p>
                  <ul className="text-xs text-body leading-relaxed space-y-0.5 list-disc list-inside">
                    {guide.parts_to_confirm.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {guide.steps.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-wider mb-1">General steps</p>
                  <ol className="text-xs text-body leading-relaxed space-y-0.5 list-decimal list-inside">
                    {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              )}

              {guide.safety_note && (
                <Alert variant="warning" className="!rounded-lg !py-2">
                  <span className="text-xs leading-snug">{guide.safety_note}</span>
                </Alert>
              )}

              {/* `text-accent`, not `text-ai` — these three are deterministic
                  search-query links this app builds itself, not AI-generated
                  content (see services/guide_service.py::build_search_links).
                  Cyan stays reserved for the guide content above. */}
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                <a
                  href={guide.parts_search_url} target="_blank" rel="noopener noreferrer"
                  className="focus-ring rounded-md font-mono text-xs text-accent hover:underline underline-offset-2"
                >
                  Search for parts →
                </a>
                <a
                  href={guide.video_search_url} target="_blank" rel="noopener noreferrer"
                  className="focus-ring rounded-md font-mono text-xs text-accent hover:underline underline-offset-2"
                >
                  Search install videos →
                </a>
                <a
                  href={guide.docs_search_url} target="_blank" rel="noopener noreferrer"
                  className="focus-ring rounded-md font-mono text-xs text-accent hover:underline underline-offset-2"
                >
                  Search documentation / forums →
                </a>
              </div>

              <p className="font-mono text-[10px] text-muted leading-relaxed pt-1">
                General guidance only — confirm exact parts, torque specs, and procedures with the
                manufacturer or a qualified installer.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
