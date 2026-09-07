import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Mirrors the public.profiles table in Supabase.
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  occupation: string | null
  age_range: string | null
  household_type: string | null
  income_range: string | null
  goal: number | null
  neighborhood: string | null
  roles: string[] | null
  ownership_model: string | null
  ownership_other: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile((data as Profile) ?? null)
  }

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
        await loadProfile(session?.user?.id)
      })
      .catch(async (err) => {
        // A stale/invalid refresh token (e.g. the account was deleted) rejects here.
        // Purge the dead session so it stops erroring on every load, and fall through
        // to a clean logged-out state (AuthGuard then routes to login).
        console.warn('Auth session invalid, signing out:', err?.message ?? err)
        try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* already gone */ }
        if (!mounted) return
        setSession(null); setUser(null); setProfile(null)
      })
      .finally(() => { if (mounted) setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  async function refreshProfile() {
    await loadProfile(user?.id)
  }

  /**
   * Start the Google sign-in redirect.
   *
   * There is no separate signup: OAuth creates the account on first use, so one button covers
   * both. That is also why the password flows this replaced are gone — with no password there
   * is nothing to forget, so no reset flow and no outbound email. Supabase's built-in mailer
   * only delivers to project team addresses, so a reset flow would have required third-party
   * SMTP and an ongoing email-deliverability problem to go with it.
   *
   * Supabase sends the user to Google, then back to /auth/callback with the session in the
   * URL, which supabase-js consumes automatically. This promise resolves when the browser
   * starts navigating away, not when sign-in completes.
   */
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
