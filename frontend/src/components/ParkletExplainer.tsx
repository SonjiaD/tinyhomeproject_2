import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const STORAGE_KEY = 'parkletExplainerCollapsed_v1'

// Requested by Adam Garrett-Clark's feedback: the tool layers several unfamiliar ideas at
// once (tiny homes, parking-as-housing, siting-by-map), so the concept needs to stay visible
// while people use the tool, not just on the intro slides they may have skipped past. This
// renders in AppShell (frontend/src/App.tsx) alongside NavBar, so it's mounted on every
// authenticated page — but see the route check below, which hides it where it's redundant
// (the slides already explain the concept) or where there's no room for it.
const HIDDEN_ROUTES = ['/', '/login', '/signup', '/onboarding/goal', '/intro']

export function ParkletExplainer() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })

  if (HIDDEN_ROUTES.includes(location.pathname)) return null

  function setAndPersist(next: boolean) {
    setCollapsed(next)
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch { /* ignore */ }
  }

  return (
    <div className="hidden md:block fixed bottom-4 left-4 z-[1500]">
      {collapsed ? (
        <button
          onClick={() => setAndPersist(false)}
          className="flex items-center gap-1.5 bg-primary-900 text-white text-xs font-medium
            px-3 py-2 rounded-lg shadow-lg border border-primary-700 hover:bg-primary-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 16v-4.5M12 8h.01" />
          </svg>
          What is this?
        </button>
      ) : (
        <div className="flex items-center gap-2.5 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden p-2">
          <img
            src="/tinyHomeParklet.webp"
            alt="A tiny yellow home with a white picket fence on an Oakland parking space"
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 leading-none mb-1">
              Tiny Home Parklet
            </p>
            <p className="text-[11px] text-gray-500 leading-snug">
              A factory-built home, legally permitted onto an Oakland parking space.
            </p>
            <Link to="/about" className="block text-[11px] font-medium text-teal-600 hover:text-teal-500 mt-0.5">
              Learn more ›
            </Link>
          </div>
          <button
            onClick={() => setAndPersist(true)}
            aria-label="Collapse"
            className="text-gray-300 hover:text-gray-500 transition-colors self-start shrink-0 p-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
