import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// getAuthHeaders() lived here to attach a Bearer token to backend API calls, so Flask could
// verify the JWT and derive the voter's identity from it. supabase-js now sends that token on
// every request itself, and Row Level Security derives the identity via auth.uid(), so there
// is nothing left to attach by hand.
