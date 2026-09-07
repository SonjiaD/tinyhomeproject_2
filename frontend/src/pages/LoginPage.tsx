import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PasswordInput, Button } from '../components/ui'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Invalid email or password. Please try again.')
    } else {
      // Route to onboarding if they haven't set a goal yet (goal now lives in the
      // profiles table, not auth metadata).
      const { data: { user } } = await supabase.auth.getUser()
      let hasGoal = false
      if (user) {
        const { data: prof } = await supabase
          .from('profiles').select('goal').eq('id', user.id).maybeSingle()
        hasGoal = !!prof?.goal
      }
      navigate(hasGoal ? '/parking-vote' : '/onboarding/goal')
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm mb-10 transition-colors">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-teal-300 mb-8">Log in to continue building your map.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-teal-200 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-teal-200 mb-1.5">Password</label>
              <PasswordInput
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              {loading ? 'Signing in…' : 'Log In'}
            </Button>
          </form>

          <p className="text-teal-300/60 text-sm text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
