import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * The site header, everywhere.
 *
 * The rule this enforces: signed out looks the same on every page, signed in looks the same on
 * every page. Before this there were four different headers — the slideshow had its own, the
 * auth pages had none, and the app pages had a third that keyed off the route rather than the
 * session (which is how a signed-out visitor to /about ended up seeing Profile and Log out).
 *
 * So the items come from auth state and nothing else. Only the *styling* varies, because the
 * landing slideshow flips between light and dark slides and a solid dark bar would sit badly on
 * a light one.
 */

interface NavItem {
  to: string
  label: string
  /** Extra paths that should also mark this item active. */
  matchPaths?: string[]
}

// "/" and "/intro" render the same LandingPage, so Intro has to read as active on both. That
// is why active state is computed here instead of using NavLink's isActive, which can only
// match the single path it links to.
const LOGGED_OUT_ITEMS: NavItem[] = [
  { to: '/intro', label: 'Intro', matchPaths: ['/'] },
  { to: '/about', label: 'About' },
]

const LOGGED_IN_ITEMS: NavItem[] = [
  { to: '/parking-vote', label: 'Vote on Parking' },
  { to: '/intro', label: 'Intro', matchPaths: ['/'] },
  { to: '/about', label: 'About' },
  { to: '/profile', label: 'Profile' },
]

type Variant = 'solid' | 'overlay'

interface SiteNavProps {
  variant?: Variant
  /** Overlay only: which way the slide underneath is themed. */
  isDark?: boolean
}

export function SiteNav({ variant = 'solid', isDark = true }: SiteNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading, signOut } = useAuth()

  // Render nothing until the session is known, otherwise loading or signing out flashes one
  // header before swapping to the other.
  if (loading) return null

  const items = user ? LOGGED_IN_ITEMS : LOGGED_OUT_ITEMS

  function isActive(item: NavItem) {
    return item.to === location.pathname || !!item.matchPaths?.includes(location.pathname)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  // The overlay sits on top of a slide that may be light or dark, so every colour has to be
  // resolved against `isDark` rather than assuming the solid bar's dark background.
  const overlay = variant === 'overlay'
  const light = overlay && !isDark

  const wrapper = overlay
    ? 'absolute top-0 left-0 right-0 z-50'
    : 'bg-primary-900 border-b border-primary-800'

  const brand = light ? 'text-gray-800' : 'text-white'
  const idle = light
    ? 'text-gray-600 hover:text-gray-900'
    : overlay ? 'text-white/70 hover:text-white' : 'text-primary-100 hover:text-white'
  const active = light ? 'text-gray-900' : 'text-white'

  // Underline rather than a filled pill: the pill needs a background that contrasts with the
  // bar, which the transparent overlay does not have.
  const activeMark = light ? 'bg-gray-900' : 'bg-white'

  const pill = light
    ? 'bg-gray-900/8 hover:bg-gray-900/15 border border-gray-400 text-gray-700'
    : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'

  return (
    <nav className={wrapper}>
      <div className={`max-w-6xl mx-auto px-6 flex items-center justify-between ${overlay ? 'py-4' : 'py-3'}`}>
        <Link to={user ? '/parking-vote' : '/'} className={`text-sm font-semibold tracking-tight transition-colors ${brand}`}>
          Tiny Home Parklet Siting Tool
        </Link>

        <div className="flex items-center gap-1">
          {items.map(item => {
            const current = isActive(item)
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={current ? 'page' : undefined}
                className={`relative px-3 py-1.5 text-sm transition-colors ${
                  current ? `font-semibold ${active}` : `font-medium ${idle}`
                }`}
              >
                {item.label}
                {current && (
                  <span className={`absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full ${activeMark}`} />
                )}
              </Link>
            )
          })}

          {user ? (
            <button
              onClick={handleSignOut}
              className={`ml-3 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${idle}`}
            >
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              className={`ml-3 text-sm font-semibold px-4 py-1.5 rounded-full transition-all backdrop-blur-sm ${pill}`}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
