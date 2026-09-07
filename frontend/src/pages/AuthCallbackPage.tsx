import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Where Google sends people back to.
 *
 * supabase-js reads the session out of the URL on load, so this page only waits for that and
 * then decides where the person belongs: onboarding if they have not set a goal, the map if
 * they have. That check used to live inside the login form; with OAuth the decision has to
 * happen after the redirect, so it lives here.
 *
 * Redirecting to "/" would also work, since the landing page runs the same check, but the
 * slideshow would paint for a moment before bouncing. A dedicated route keeps the transition
 * quiet and puts the routing rule in one obvious place.
 */
export default function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // Google reports a refusal (cancelled, denied consent) in the hash or query rather than
    // by failing the redirect, so check before waiting on a session that will never arrive.
    const raw = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.search
    const params = new URLSearchParams(raw)
    if (params.get('error') || params.get('error_description')) {
      setFailed(true)
      return
    }

    if (loading) return

    // Auth has settled with no session: the redirect did not carry one through.
    if (!user) {
      setFailed(true)
      return
    }

    let cancelled = false
    ;(async () => {
      // Read the goal straight from the table rather than waiting on the context's profile,
      // which loads separately and would race this decision.
      const { data: profile } = await supabase
        .from('profiles').select('goal').eq('id', user.id).maybeSingle()
      if (cancelled) return
      navigate(profile?.goal ? '/parking-vote' : '/onboarding/goal', { replace: true })
    })()
    return () => { cancelled = true }
  }, [user, loading, navigate])

  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-darkest px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-3">Sign-in didn't finish</h1>
          <p className="text-teal-300/70 text-sm mb-8">
            You may have cancelled, or the link expired before it was used. Nothing was saved,
            so it's safe to try again.
          </p>
          <Link
            to="/login"
            className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-darkest">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-teal-300/70 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
