import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import AboutPage from './pages/AboutPage'
import SuggestPage from './pages/SuggestPage'
import ParkingVotePage from './pages/ParkingVotePage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OnboardingGoalPage from './pages/OnboardingGoalPage'
import ProfilePage from './pages/ProfilePage'
import { ParkletExplainer } from './components/ParkletExplainer'

const PRE_AUTH_ROUTES = ['/', '/login', '/signup', '/onboarding/goal', '/intro']

const navLinks = [
  // { to: '/home', label: 'Home' },
  { to: '/parking-vote', label: 'Vote on Parking' },
  // { to: '/suggest', label: 'Suggest a Location' },
  { to: '/intro', label: 'Intro' },
  { to: '/about', label: 'About' },
  { to: '/profile', label: 'Profile' },
]

function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  if (PRE_AUTH_ROUTES.includes(location.pathname)) return null

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="bg-primary-900 border-b border-primary-800">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/home" className="text-lg font-semibold text-white tracking-tight">
          Tiny Home Parklet Siting Tool
        </Link>
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-primary-800'
                    : 'text-primary-100 hover:text-white hover:bg-primary-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleSignOut}
            className="ml-3 px-3 py-1.5 rounded-md text-sm font-medium text-primary-300 hover:text-white hover:bg-primary-800 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  )
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
      <NavBar />
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
