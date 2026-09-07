import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * The single auth page. With Google, signing in and creating an account are the same action,
 * so there is no separate signup page; /signup redirects here so older links still work.
 */
export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setError('')
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      // On success the browser is already navigating to Google, so only a failure to *start*
      // the redirect reaches here. Clearing loading matters, or the button stays stuck after
      // a network blip.
      setError('Could not reach Google. Please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-darkest">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-end p-12 relative overflow-hidden bg-surface-dark">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/tinyHomeParklet.webp')" }}
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-3">Oakland, California</p>
          <p className="text-2xl font-bold text-white leading-snug mb-4">
            Every parking space you vote on is a data point.
          </p>
          <p className="text-teal-300 text-sm leading-relaxed">
            When enough Oaklanders converge on the same spots, that's where the ordinance starts.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm mb-10 transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Sign in to vote</h1>
          <p className="text-teal-300 mb-8">
            New here? Signing in creates your account. It takes one tap.
          </p>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2.5 mb-4">{error}</p>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60
              text-gray-700 font-semibold py-3.5 rounded-lg transition-all duration-200"
          >
            {/* Google's mark keeps its own colours; recolouring it breaks their brand terms. */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 010-4.22V7.05H2.18a11 11 0 000 9.9l3.66-2.84z" />
              <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 002.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          <p className="text-teal-300/50 text-xs text-center mt-6 leading-relaxed">
            We only use your name and email to attach your votes to an account, so your choices
            are saved and you can come back to them.
          </p>
        </div>
      </div>
    </div>
  )
}
