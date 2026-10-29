/* ─── Local plan save — frontend-only, single slot ───
   Anonymous preview plans (pages/PlanPreview.jsx) are never persisted
   server-side — that page is only ever reached when `!user` (see
   pages/Planner.jsx's submit()), so there is no account to attach a real
   saved build to without building a signup flow, which is out of scope
   here. This is the lightweight alternative: the most recently saved plan
   lives in this browser's localStorage only, under one key — no account,
   no backend call, no new database table. Good enough to survive a
   refresh or an accidental navigation away; it does not sync across
   devices or browsers, and the UI says so (see PlanPreview.jsx).

   Wrapped in try/catch (unlike services/api.js's direct localStorage
   calls for the session token) because this is an optional nice-to-have,
   not an auth-critical path — private-browsing storage restrictions
   should degrade silently here, not break the page. */

const KEY = 'cm_saved_plan'

export function saveLocalPlan(plan, vehicle) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ plan, vehicle, savedAt: Date.now() }))
    return true
  } catch {
    return false
  }
}

export function getLocalPlan() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.plan) return null
    return parsed
  } catch {
    return null
  }
}
