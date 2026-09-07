import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { SiteNav } from './components/SiteNav'
import AboutPage from './pages/AboutPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import SuggestPage from './pages/SuggestPage'
import ParkingVotePage from './pages/ParkingVotePage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import OnboardingGoalPage from './pages/OnboardingGoalPage'
import ProfilePage from './pages/ProfilePage'
import { ParkletExplainer } from './components/ParkletExplainer'

/**
 * Routes that render no shared header.
 *
 * Login, signup and onboarding are single-purpose flows: the auth pages are full-bleed
 * two-panel layouts with their own Back link, and a nav on onboarding just invites people to
 * wander off half-configured.
 *
 * "/" and "/intro" are here because LandingPage renders its own <SiteNav variant="overlay" />.
 * The slideshow flips between light and dark slides, and keeping that knowledge inside the
 * slideshow is what stops slide-theme state leaking into AppShell.
 */
const ROUTES_WITHOUT_NAV = ['/login', '/signup', '/auth/callback', '/onboarding/goal', '/', '/intro']

function AppNav() {
  const location = useLocation()
  if (ROUTES_WITHOUT_NAV.includes(location.pathname)) return null
  return <SiteNav variant="solid" />
}

/**
 * Desktop-only notice, shown on the voting map alone.
 *
 * This used to cover every page at every route, with no way past it, so anyone opening a
 * shared link on a phone hit a wall and could not read About, sign up, or see the project at
 * all. Most traffic from a shared link is mobile, so that was turning away the majority of
 * visitors before they saw anything.
 *
 * The map genuinely does need a large screen: selecting spots relies on rectangle, circle and
 * freehand paint tools plus a side panel. So the gate stays for /parking-vote and nothing
 * else. Everyone can still read the pitch and create an account on a phone, then vote later.
 */
function MapDesktopNotice() {
  return (
    <div className="md:hidden fixed inset-0 z-[99999] bg-primary-900 flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-5">🖥️</div>
      <h2 className="text-white text-xl font-bold mb-3">The map needs a bigger screen</h2>
      <p className="text-primary-200 text-sm leading-relaxed max-w-xs mb-8">
        Choosing parking spots uses drawing tools that need room to work, so voting is desktop
        only for now. Everything else works here.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/about"
          className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Read about the project
        </Link>
        <Link
          to="/intro"
          className="text-primary-200 hover:text-white text-sm font-medium px-6 py-2 transition-colors"
        >
          Back to the intro
        </Link>
      </div>
    </div>
  )
}

function AppShell() {
  return (
    <div className="h-screen bg-surface-page flex flex-col overflow-hidden">
      <AppNav />
      <div id="main-scroll" className="flex-1 min-h-0 flex flex-col overflow-auto">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/intro" element={<LandingPage standalone />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Signing in and signing up are one action with Google, so /signup is kept only so
            existing links and bookmarks do not 404. */}
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Public and unauthenticated on purpose: Google requires both to be reachable
            without signing in before it will publish the OAuth consent screen. */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Onboarding (requires auth) */}
        <Route path="/onboarding/goal" element={<AuthGuard><OnboardingGoalPage /></AuthGuard>} />

        {/* Authenticated app routes */}
        <Route path="/home" element={<Navigate to="/parking-vote" replace />} />
        <Route path="/suggest" element={<AuthGuard><SuggestPage /></AuthGuard>} />
        <Route path="/parking-vote" element={<AuthGuard><MapDesktopNotice /><ParkingVotePage /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
      </Routes>
      </div>
      <ParkletExplainer />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </Router>
  )
}

export default App
