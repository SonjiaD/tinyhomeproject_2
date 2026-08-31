import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useParkingCount } from '../lib/useParkingCount'
import { supabase } from '../lib/supabase'

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCounter(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) { setValue(0); return }
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(ease * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return value
}

// ── SVG illustrations ─────────────────────────────────────────────────────────
function ParkingIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none">
      {/* Asphalt background */}
      <rect width="96" height="96" rx="16" fill="#4a5568" />
      <rect width="96" height="96" rx="16" fill="url(#asphalt)" opacity="0.4" />
      {/* Lane lines */}
      <rect x="4" y="44" width="88" height="4" rx="2" fill="#f6e05e" opacity="0.7" />
      {/* Parking space outlines */}
      <rect x="6" y="10" width="26" height="36" rx="3" fill="white" opacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="35" y="10" width="26" height="36" rx="3" fill="white" opacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="64" y="10" width="26" height="36" rx="3" fill="white" opacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="6" y="52" width="26" height="36" rx="3" fill="white" opacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="35" y="52" width="26" height="36" rx="3" fill="white" opacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="64" y="52" width="26" height="36" rx="3" fill="white" opacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Car in middle spot (top row) */}
      <rect x="39" y="14" width="18" height="28" rx="4" fill="#2d9d8f" opacity="0.9" />
      <rect x="41" y="17" width="14" height="8" rx="2" fill="#b2f0ea" opacity="0.6" />
      <rect x="41" y="34" width="14" height="5" rx="1" fill="#b2f0ea" opacity="0.3" />
      <circle cx="42" cy="41" r="2.5" fill="#1a1a2e" />
      <circle cx="54" cy="41" r="2.5" fill="#1a1a2e" />
      {/* P sign badge */}
      <circle cx="76" cy="76" r="12" fill="#2b6cb0" />
      <text x="76" y="81" textAnchor="middle" fontSize="13" fill="white" fontWeight="800" fontFamily="sans-serif">P</text>
      <defs>
        <pattern id="asphalt" patternUnits="userSpaceOnUse" width="4" height="4">
          <circle cx="1" cy="1" r="0.6" fill="white" opacity="0.05" />
        </pattern>
      </defs>
    </svg>
  )
}

function TinyHomeIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none">
      {/* Sky background */}
      <rect width="96" height="96" rx="16" fill="#e8f4f0" />
      {/* Ground */}
      <rect x="0" y="72" width="96" height="24" rx="0" fill="#a8d5a2" opacity="0.5" />
      <rect x="0" y="80" width="96" height="16" rx="0" fill="#7ec87a" opacity="0.4" />
      {/* Trailer base / chassis */}
      <rect x="12" y="58" width="72" height="18" rx="3" fill="#e8d5c4" stroke="#c4a882" strokeWidth="1.5" />
      {/* Body */}
      <rect x="14" y="34" width="68" height="26" rx="4" fill="#f5ede3" stroke="#c4a882" strokeWidth="1.5" />
      {/* Roof */}
      <path d="M10 36 L48 16 L86 36" fill="#c96d4f" stroke="#9a4a2f" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Roof ridge cap */}
      <rect x="44" y="14" width="8" height="4" rx="2" fill="#9a4a2f" opacity="0.6" />
      {/* Left window */}
      <rect x="19" y="39" width="16" height="12" rx="2" fill="#b2e4f5" stroke="#8cc5d8" strokeWidth="1" />
      <line x1="27" y1="39" x2="27" y2="51" stroke="#8cc5d8" strokeWidth="0.8" />
      <line x1="19" y1="45" x2="35" y2="45" stroke="#8cc5d8" strokeWidth="0.8" />
      {/* Right window */}
      <rect x="61" y="39" width="16" height="12" rx="2" fill="#b2e4f5" stroke="#8cc5d8" strokeWidth="1" />
      <line x1="69" y1="39" x2="69" y2="51" stroke="#8cc5d8" strokeWidth="0.8" />
      <line x1="61" y1="45" x2="77" y2="45" stroke="#8cc5d8" strokeWidth="0.8" />
      {/* Door */}
      <rect x="40" y="41" width="16" height="17" rx="2" fill="#c4a882" stroke="#a0855a" strokeWidth="1" />
      <circle cx="52" cy="50" r="1.5" fill="#7a5c3a" />
      {/* Steps */}
      <rect x="42" y="58" width="12" height="3" rx="1" fill="#b8967a" />
      <rect x="44" y="61" width="8" height="3" rx="1" fill="#b8967a" />
      {/* Wheels */}
      <circle cx="26" cy="76" r="6" fill="#2d3748" stroke="#4a5568" strokeWidth="1.5" />
      <circle cx="26" cy="76" r="2.5" fill="#718096" />
      <circle cx="70" cy="76" r="6" fill="#2d3748" stroke="#4a5568" strokeWidth="1.5" />
      <circle cx="70" cy="76" r="2.5" fill="#718096" />
      {/* Hitch */}
      <rect x="82" y="63" width="8" height="3" rx="1.5" fill="#718096" />
      {/* Small plants */}
      <circle cx="8" cy="74" r="5" fill="#5a9e5a" />
      <circle cx="88" cy="74" r="4" fill="#5a9e5a" />
    </svg>
  )
}

// ── Slide direction variants ──────────────────────────────────────────────────
function slideVariants(direction: number) {
  return {
    enter: { x: direction > 0 ? '100%' : '-100%', opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: direction > 0 ? '-100%' : '100%', opacity: 0 },
  }
}

const TRANSITION: Transition = { type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.55 }

// ── Progress dots ─────────────────────────────────────────────────────────────
function Dots({ total, current, onGo, isDark }: { total: number; current: number; onGo: (i: number) => void; isDark: boolean }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onGo(i)}
          className={`rounded-full transition-all duration-300 ${
            isDark
              ? i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              : i === current ? 'w-6 h-2 bg-gray-700' : 'w-2 h-2 bg-gray-300 hover:bg-gray-500'
          }`}
        />
      ))}
    </div>
  )
}

// ── Nav arrow buttons ─────────────────────────────────────────────────────────
function NavArrows({ onPrev, onNext, hasPrev, hasNext, isDark }: {
  onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean; isDark: boolean
}) {
  const base = 'fixed top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none shadow-md'
  const theme = isDark
    ? 'bg-white/15 border border-white/25 text-white hover:bg-white/25'
    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
  return (
    <>
      <button onClick={onPrev} disabled={!hasPrev} className={`${base} ${theme} left-6`}>
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <button onClick={onNext} disabled={!hasNext} className={`${base} ${theme} right-6`}>
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </>
  )
}

// ── Slide 1: Hero ─────────────────────────────────────────────────────────────
function SlideHero({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ background: '#0d2626' }}>
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/tinyHomeParklet.webp')" }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0d2626 60%, #1a3a3a 100%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-6">Oakland, California</p>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
            We have decided that the surface of our city should store{' '}
            <span className="text-teal-300">cars</span>{' '}
            instead of housing{' '}
            <span className="text-orange-300">people.</span>
          </h1>
          <p className="text-lg text-teal-200 mb-10 leading-relaxed">
            That decision is reversible. Here's the math on what reversing it looks like.
          </p>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold px-7 py-3 rounded-full transition-all duration-200 shadow-lg shadow-teal-900/40"
          >
            See the numbers
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
      </div>
    </div>
  )
}

// ── Slide 2: What Is a Tiny Home Parklet? ─────────────────────────────────────
function SlideConcept() {
  return (
    <div className="w-full h-full flex items-center" style={{ background: '#f8f7f5' }}>
      <div className="max-w-5xl w-full mx-auto px-10 flex flex-col md:flex-row gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-600 mb-3">The Concept</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What is a Tiny Home Parklet?</h2>
          <p className="text-gray-500 leading-relaxed">
            Permitted factory-built Park Models (also known as Tiny Homes on Wheels): fully
            code-compliant homes with kitchens and bathrooms, installed legally through an
            approval process on Oakland parking spaces, connected to utilities, and rented or
            owned by everyday people.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex-1 rounded-2xl overflow-hidden shadow-lg border border-gray-100"
        >
          <img
            src="/tinyHomeParklet.webp"
            alt="A tiny yellow home with a white picket fence on an Oakland parking space"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </div>
    </div>
  )
}

// ── Slide 3: Stats ────────────────────────────────────────────────────────────
function StatCard({ value, label, sub, active, delay = 0 }: {
  value: number; label: string; sub: string; active: boolean; delay?: number
}) {
  const count = useCounter(value, active)
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-1"
    >
      <p className="text-4xl font-bold text-teal-800 tabular-nums">
        {count.toLocaleString()}
      </p>
      <p className="font-semibold text-gray-800 text-sm leading-snug">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </motion.div>
  )
}

function SlideStats({ active, parkingCount }: { active: boolean; parkingCount: number }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#f8f7f5' }}>
      <div className="max-w-4xl w-full mx-auto px-10">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-600 mb-3">Two facts about Oakland</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">The surface of a city is a choice.</h2>
          <p className="text-gray-500 mt-2">Oakland chose parking.</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-10">
          <StatCard value={parkingCount} label="On-street parking spaces" sub="estimated, in Oakland" active={active} delay={0.1} />
          <StatCard value={26251} label="New homes required" sub="by state mandate, by 2031" active={active} delay={0.2} />
          <StatCard value={3614} label="Homes permitted" sub="through 2025" active={active} delay={0.3} />
          <StatCard value={17000} label="Units short" sub="at current pace" active={active} delay={0.4} />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex items-center justify-center gap-10"
        >
          <div className="flex flex-col items-center gap-2">
            <ParkingIcon className="w-24 h-24" />
            <p className="text-xs text-gray-400 font-medium">~{parkingCount.toLocaleString()} estimated parking spots</p>
          </div>
          <svg viewBox="0 0 56 20" className="w-14 h-5 text-teal-500 shrink-0" fill="none">
            <path d="M0 10h48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M44 3l8 7-8 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex flex-col items-center gap-2">
            <TinyHomeIcon className="w-24 h-24" />
            <p className="text-xs text-gray-400 font-medium">could be tiny homes</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Slide 4: Three Visions ────────────────────────────────────────────────────
const visions = [
  {
    units: '6,000',
    pct: 14,
    label: 'Prove the Concept',
    tag: 'STARTER',
    desc: 'More units than any single recent year of Oakland construction. A quarter of the RHNA gap closed.',
    color: 'from-teal-700 to-teal-600',
    bar: 'bg-teal-400',
  },
  {
    units: '18,000',
    pct: 40,
    label: 'Meet the State Obligation',
    tag: 'REQUIRED',
    desc: 'The full projected RHNA shortfall closed. Oakland meets its legal housing obligation.',
    color: 'from-teal-800 to-teal-700',
    bar: 'bg-teal-300',
  },
  {
    units: '30,000',
    pct: 65,
    label: 'End the Affordability Crisis',
    tag: 'TRANSFORMATIVE',
    desc: 'Enough supply to push Oakland\'s vacancy rate to 6-7%, the level at which rents actually fall.',
    color: 'from-teal-900 to-teal-800',
    bar: 'bg-orange-300',
  },
]

function SlideVisions() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f2a2a' }}>
      <div className="max-w-5xl w-full mx-auto px-10">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-2">Three Visions</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Help us collectively decide where these Tiny Home Parklets could go.
          </h2>
          <p className="text-teal-200 mt-2 text-base font-medium">Pick your ambition.</p>
          <p className="text-teal-300 text-sm">You'll choose one of these when you sign up.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visions.map((v, i) => (
            <motion.div
              key={v.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.12, duration: 0.5 }}
              className={`bg-gradient-to-br ${v.color} rounded-2xl p-6 flex flex-col gap-4`}
            >
              <div>
                <span className="text-xs font-bold tracking-widest text-teal-300/70">{v.tag}</span>
                <p className="text-4xl font-bold text-white mt-1">{v.units}</p>
                <p className="text-sm font-semibold text-teal-200 mt-0.5">units</p>
              </div>
              <div>
                <div className="flex justify-between text-xs text-teal-300/70 mb-1">
                  <span>Parking spaces converted</span>
                  <span>{v.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${v.bar} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${v.pct}%` }}
                    transition={{ delay: 0.4 + i * 0.12, duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <p className="text-sm text-teal-100/80 leading-relaxed">{v.desc}</p>
              <p className="text-lg font-bold text-white">{v.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Slide 5: How to Help ──────────────────────────────────────────────────────
const steps = [
  {
    num: '01',
    title: 'Pick your number',
    desc: 'Choose your goal: 6,000, 18,000, or 30,000 homes. Commit to a vision for Oakland.',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
        <circle cx="20" cy="20" r="18" stroke="#2d6363" strokeWidth="2" />
        <circle cx="20" cy="20" r="6" fill="#2d6363" />
        <circle cx="20" cy="20" r="12" stroke="#2d6363" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Pick your spots',
    desc: 'Click parking spaces on the Oakland map, or draw a circle or rectangle to vote on a whole area at once.',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
        <path d="M20 4C13.37 4 8 9.37 8 16c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#c96d4f" opacity="0.3" stroke="#9a4a2f" strokeWidth="2" />
        <circle cx="20" cy="16" r="4" fill="#9a4a2f" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Build your map',
    desc: 'When you\'ve hit your number, save your map. We\'re looking for the spots Oaklanders converge on.',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
        <rect x="4" y="8" width="32" height="24" rx="3" stroke="#2d6363" strokeWidth="2" />
        <path d="M4 14h32" stroke="#2d6363" strokeWidth="1.5" />
        <circle cx="12" cy="22" r="3" fill="#2d6363" opacity="0.5" />
        <circle cx="28" cy="18" r="3" fill="#9a4a2f" opacity="0.5" />
        <path d="M12 22 L28 18" stroke="#2d6363" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    ),
  },
]

function SlideHow() {
  return (
    <div className="w-full h-full flex items-center" style={{ background: '#f1efec' }}>
      <div className="max-w-5xl w-full mx-auto px-10 flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-600 mb-3">How to help</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Three steps. Ten minutes.</h2>
            <p className="text-gray-500 leading-relaxed">
              No expertise required. Just your opinion about your neighborhood, and where you'd be okay seeing a tiny home instead of an empty parking space.
            </p>
          </motion.div>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.15, duration: 0.5 }}
              className="flex items-start gap-5 bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
            >
              <div className="shrink-0">{s.icon}</div>
              <div>
                <p className="text-xs font-bold text-gray-300 tracking-widest mb-0.5">{s.num}</p>
                <p className="font-bold text-gray-900 mb-1">{s.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Slide 6: CTA ──────────────────────────────────────────────────────────────
function SlideCTA() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ background: '#0d2626' }}>
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/tinyHomeParklet.webp')" }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0d2626cc, #0d2626ee)' }} />

      <div className="relative z-10 max-w-2xl mx-auto px-10 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-4">Ready?</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Help Oakland solve its housing crisis.
          </h2>
          <p className="text-teal-200 text-lg mb-10 leading-relaxed">
            Every parking space you vote on is a data point. When enough Oaklanders converge on the same spots, that's where the ordinance starts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="bg-teal-500 hover:bg-teal-400 text-white font-bold px-8 py-4 rounded-full text-lg transition-all duration-200 shadow-xl shadow-teal-900/50"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-4 rounded-full text-lg transition-all duration-200 backdrop-blur-sm"
            >
              Log In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Main LandingPage ──────────────────────────────────────────────────────────
const SLIDE_COUNT = 6
const SLIDE_IS_DARK = [true, false, false, true, false, true]

export default function LandingPage({ standalone = false }: { standalone?: boolean }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [[current, direction], setCurrent] = useState([0, 0])
  const wheelLocked = useRef(false)
  const parkingCount = useParkingCount()

  // Auto-redirect authenticated users away from the landing page. First-timers who
  // haven't set a goal yet (e.g. arriving via the email-confirmation link) go to the
  // onboarding survey; everyone else goes to the map. Query the goal directly rather
  // than relying on the async-loading AuthContext profile to avoid a misroute race.
  useEffect(() => {
    if (standalone || loading || !user) return
    let cancelled = false
    ;(async () => {
      const { data: prof } = await supabase
        .from('profiles').select('goal').eq('id', user.id).maybeSingle()
      if (cancelled) return
      navigate(prof?.goal ? '/parking-vote' : '/onboarding/goal', { replace: true })
    })()
    return () => { cancelled = true }
  }, [standalone, user, loading, navigate])

  const go = useCallback((next: number, dir?: number) => {
    if (next < 0 || next >= SLIDE_COUNT) return
    setCurrent([next, dir ?? (next > current ? 1 : -1)])
  }, [current])

  const goNext = useCallback(() => go(current + 1, 1), [current, go])
  const goPrev = useCallback(() => go(current - 1, -1), [current, go])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  // Mouse-wheel navigation (one tick = one slide)
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (wheelLocked.current) return
      wheelLocked.current = true
      if (e.deltaY > 0) goNext()
      else goPrev()
      setTimeout(() => { wheelLocked.current = false }, 800)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [goNext, goPrev])

  const isDark = SLIDE_IS_DARK[current]
  const variants = slideVariants(direction)

  const slides = [
    <SlideHero onNext={goNext} />,
    <SlideConcept />,
    <SlideStats active={current === 2} parkingCount={parkingCount} />,
    <SlideVisions />,
    <SlideHow />,
    <SlideCTA />,
  ]

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Persistent top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <span className={`text-sm font-semibold tracking-tight transition-colors ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
          Tiny Home Parklet Siting Tool
        </span>
        {/* People can arrive at this link cold (e.g. from Reddit) with no context for the
            slides' pace. Keep a way out of the slideshow on every slide, not just the last
            one, so someone frustrated with it can go read About or jump straight to the map. */}
        <div className="flex items-center gap-4">
          <Link
            to="/about"
            className={`text-sm font-medium transition-colors ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            About
          </Link>
          {current < SLIDE_COUNT - 1 && (
            <button
              onClick={() => go(SLIDE_COUNT - 1, 1)}
              className={`text-sm font-medium transition-colors ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Skip intro →
            </button>
          )}
          {standalone ? (
            <Link
              to="/parking-vote"
              className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-all backdrop-blur-sm ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                  : 'bg-gray-900/8 hover:bg-gray-900/15 border border-gray-400 text-gray-700'
              }`}
            >
              ← Back to map
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={`text-sm font-medium transition-colors ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-all backdrop-blur-sm ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                    : 'bg-gray-900/8 hover:bg-gray-900/15 border border-gray-400 text-gray-700'
                }`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={TRANSITION}
          className="absolute inset-0"
        >
          {slides[current]}
        </motion.div>
      </AnimatePresence>

      <NavArrows onPrev={goPrev} onNext={goNext} hasPrev={current > 0} hasNext={current < SLIDE_COUNT - 1} isDark={isDark} />
      <Dots total={SLIDE_COUNT} current={current} onGo={(i) => go(i)} isDark={isDark} />
    </div>
  )
}
