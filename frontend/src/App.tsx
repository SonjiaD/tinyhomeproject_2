import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { SiteNav } from './components/SiteNav'
import AboutPage from './pages/AboutPage'
import SuggestPage from './pages/SuggestPage'
import ParkingVotePage from './pages/ParkingVotePage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
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
const ROUTES_WITHOUT_NAV = ['/login', '/signup', '/onboarding/goal', '/', '/intro']

function AppNav() {
  const location = useLocation()
  if (ROUTES_WITHOUT_NAV.includes(location.pathname)) return null
  return <SiteNav variant="solid" />
}

function MobileBanner() {
  return (
    <div className="md:hidden fixed inset-0 z-[99999] bg-primary-900 flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-5">🖥️</div>
      <h2 className="text-white text-xl font-bold mb-3">Best Experienced on Desktop</h2>
      <p className="text-primary-200 text-sm leading-relaxed max-w-xs">
        This mapping tool is designed for desktop browsers. Please open it on a laptop or computer for the full experience.
      </p>
    </div>
  )
}

function AppShell() {
  return (
    <div className="h-screen bg-surface-page flex flex-col overflow-hidden">
      <MobileBanner />
      <AppNav />
      <div id="main-scroll" className="flex-1 min-h-0 flex flex-col overflow-auto">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/intro" element={<LandingPage standalone />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Onboarding (requires auth) */}
        <Route path="/onboarding/goal" element={<AuthGuard><OnboardingGoalPage /></AuthGuard>} />

        {/* Authenticated app routes */}
        <Route path="/home" element={<Navigate to="/parking-vote" replace />} />
        <Route path="/suggest" element={<AuthGuard><SuggestPage /></AuthGuard>} />
        <Route path="/parking-vote" element={<AuthGuard><ParkingVotePage /></AuthGuard>} />
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
