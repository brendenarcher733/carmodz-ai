import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authApi } from '../services/api'
import { AuthCard } from '../components/layout/AuthCard'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState(token ? 'verifying' : 'missing') // verifying | success | error | missing
  const [error,  setError]  = useState(null)

  useEffect(() => {
    if (!token) return
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => { setError(err.message); setStatus('error') })
  }, [token])

  return (
    <AuthCard className="text-center">
      {status === 'verifying' && (
        <>
          <div className="flex justify-center mb-6"><Spinner size="lg" /></div>
          <p className="text-body text-sm">Verifying your email…</p>
        </>
      )}

      {status === 'success' && (
        <>
          <h1 className="font-display font-black text-white text-2xl tracking-tight mb-2">Email verified</h1>
          <p className="text-body text-sm mb-8">Your email address has been confirmed.</p>
          <Button to="/builds" size="xl" fullWidth>
            Continue to CarMods AI
          </Button>
        </>
      )}

      {(status === 'error' || status === 'missing') && (
        <>
          <h1 className="font-display font-black text-white text-2xl tracking-tight mb-2">Verification failed</h1>
          <p className="text-body text-sm mb-8">
            {status === 'missing'
              ? 'This link is missing its verification token.'
              : (error || 'This link is invalid or has expired.')}
          </p>
          <Button to="/builds" variant="secondary" size="xl" fullWidth>
            Go to CarMods AI
          </Button>
        </>
      )}
    </AuthCard>
  )
}
