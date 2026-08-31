import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useParkingCount } from '../lib/useParkingCount'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const parkingCount = useParkingCount()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { error, session } = await signUp(email, password, name)
    setLoading(false)
    if (error) {
      setError(error.message || 'Something went wrong. Please try again.')
    } else if (session) {
      // Email confirmation is off, so the account is already active and logged in — send
      // them straight into onboarding. Showing "check your email" here would strand them
      // waiting on a mail that is never sent.
      navigate('/onboarding/goal', { replace: true })
    } else {
      // Kept for the case where email confirmation is re-enabled on the project.
      setConfirming(true)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0d2626' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-end p-12 relative overflow-hidden"
        style={{ background: '#0f2a2a' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/Location_map_Oakland_2.svg.png')" }}
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-3">Oakland, California</p>
          <p className="text-2xl font-bold text-white leading-snug mb-4">
            {parkingCount.toLocaleString()} parking spaces.<br />26,251 homes needed.
          </p>
          <p className="text-teal-300 text-sm leading-relaxed">
            The math is simple. The solution needs Oaklanders like you.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm mb-10 transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back
          </Link>

          {confirming ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
              <p className="text-teal-300 mb-2">
                We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
              </p>
              <p className="text-teal-400/60 text-sm mb-8">
                Click the link in that email to activate your account, then come back here to log in.
              </p>
              <Link
                to="/login"
                className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-bold px-8 py-3 rounded-full transition-all duration-200"
              >
                Go to Log In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
              <p className="text-teal-300 mb-8">Join Oaklanders mapping a better city.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-teal-200 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-200 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-200 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-full transition-all duration-200 mt-2"
                >
                  {loading ? 'Creating account…' : 'Create Account →'}
                </button>
              </form>

              <p className="text-teal-300/60 text-sm text-center mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
