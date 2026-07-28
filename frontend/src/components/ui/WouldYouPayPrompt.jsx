import { useEffect, useState } from 'react'
import { billingApi } from '../../services/api'
import { Alert } from './Alert'
import { Button } from './Button'
import * as analytics from '../../services/analytics'

/* Soft-launch companion to the (currently disabled) free-tier caps —
   services/billing_service.py stopped blocking anyone at 1 saved build /
   15 chat messages a day, but /api/billing/usage still reports those free
   plan limits regardless, so this reads the exact same numbers to detect
   "you'd have hit the old cap here" and asks the one question that
   actually matters instead: would you pay for more of this. Real interest
   signal beats a guessed cap. */

const COPY = {
  builds: "You've saved more builds than the free plan technically allows right now — we're not limiting it while we figure out the right cap. Would you pay for unlimited builds?",
  chat: "You've sent more advisor messages today than the free plan technically allows — same deal, not capping it yet. Would you pay for unlimited chat?",
}

export function WouldYouPayPrompt({ feature }) {
  const [usage, setUsage] = useState(null)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(`would-pay-dismissed-${feature}`) === '1',
  )
  const [answered, setAnswered] = useState(false)

  useEffect(() => {
    billingApi.usage().then(setUsage).catch(() => {})
  }, [])

  if (dismissed || !usage || usage.plan === 'pro') return null

  const overCap = feature === 'builds'
    ? usage.builds_limit != null && usage.builds_used >= usage.builds_limit
    : usage.chat_messages_limit != null && usage.chat_messages_used_today >= usage.chat_messages_limit

  if (!overCap) return null

  const dismiss = () => {
    sessionStorage.setItem(`would-pay-dismissed-${feature}`, '1')
    setDismissed(true)
  }

  const handleYes = () => {
    analytics.capture('would_pay_prompt_yes', {
      feature,
      builds_used: usage.builds_used,
      chat_messages_used_today: usage.chat_messages_used_today,
    })
    setAnswered(true)
  }

  return (
    <Alert variant="info" className="mb-5">
      {answered ? (
        <span>Thanks — genuinely useful to know.</span>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <span>{COPY[feature]}</span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button size="sm" onClick={handleYes}>Yes, I'd pay</Button>
            <button
              onClick={dismiss}
              className="text-muted text-xs hover:text-body transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </Alert>
  )
}
