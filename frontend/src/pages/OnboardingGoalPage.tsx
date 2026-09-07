import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, SearchableSelect } from '../components/ui'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Key, History, Heart, Briefcase, MapPin, Circle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { NEIGHBORHOODS, NOT_OAKLAND } from '../lib/neighborhoods'
import { SURFACE_DARK } from '../lib/colors'

const AGE_RANGES = ['under_18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'prefer_not_to_say']
const HOUSEHOLD_TYPES = [
  { value: 'lives_alone', label: 'Live alone' },
  { value: 'with_family', label: 'With family' },
  { value: 'with_roommates', label: 'With roommates' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]
const INCOME_RANGES = ['under_25k', '25k-50k', '50k-75k', '75k-100k', '100k-150k', 'over_150k', 'prefer_not_to_say']
const RANGE_LABELS: Record<string, string> = {
  under_18: 'Under 18', '65+': '65+', prefer_not_to_say: 'Prefer not to say',
  under_25k: 'Under $25k', '25k-50k': '$25k–50k', '50k-75k': '$50k–75k',
  '75k-100k': '$75k–100k', '100k-150k': '$100k–150k', over_150k: 'Over $150k',
}
const rangeLabel = (v: string) => RANGE_LABELS[v] ?? v.replace(/-/g, '–')

const GOALS = [
  {
    units: 6000,
    label: 'Prove the Concept',
    tag: 'STARTER',
    pct: 14,
    headline: '6,000 units',
    desc: 'More units than any single recent year of Oakland construction. A quarter of the RHNA gap closed.',
    barColor: 'bg-teal-400',
    border: 'border-teal-500',
    ring: 'ring-teal-500',
  },
  {
    units: 18000,
    label: 'Meet the State Obligation',
    tag: 'REQUIRED',
    pct: 40,
    headline: '18,000 units',
    desc: 'The full projected RHNA shortfall closed. Oakland meets its legal housing obligation by 2031.',
    barColor: 'bg-teal-300',
    border: 'border-teal-400',
    ring: 'ring-teal-400',
  },
  {
    units: 30000,
    label: 'End the Affordability Crisis',
    tag: 'TRANSFORMATIVE',
    pct: 65,
    headline: '30,000 units',
    desc: "Enough supply to push Oakland's vacancy rate to 6–7%, the level at which rents actually start falling.",
    barColor: 'bg-orange-300',
    border: 'border-orange-400',
    ring: 'ring-orange-400',
  },
]

const ROLES = [
  { value: 'renter',        label: 'Renter',                Icon: Home },
  { value: 'homeowner',     label: 'Homeowner',              Icon: Key },
  { value: 'used_to_live',  label: 'Used to live there',     Icon: History },
  { value: 'want_to_move',  label: 'Want to move there',     Icon: Heart },
  { value: 'work_there',    label: 'Work there',             Icon: Briefcase },
  { value: 'oakland_fan',   label: 'Fan / live nearby',      Icon: MapPin },
  { value: 'other',         label: 'Other',                  Icon: Circle },
]

const OWNERSHIP_OPTIONS = [
  { value: 'property_owner',     label: 'Property owner',       subtext: 'The lot owner across the sidewalk' },
  { value: 'city_owned',         label: 'City-owned & rented',  subtext: 'City builds and manages the units' },
  { value: 'private_developer',  label: 'Private developer',    subtext: 'Developer pays city for a concession' },
  { value: 'occupant_lot_lease', label: 'Occupant lot-lease',   subtext: 'Resident owns the home, pays city a fee' },
  { value: 'other',              label: 'Other idea',           subtext: 'Tell us what you\'re thinking' },
]

// Source: City of Oakland Open Data portal — data.oaklandca.gov/resource/gwm6-hyga.geojson

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

export default function OnboardingGoalPage() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (el) el.style.backgroundColor = SURFACE_DARK
    return () => { if (el) el.style.backgroundColor = '' }
  }, [])
  const [step, setStep] = useState(0) // 0..4
  const [dir, setDir] = useState(1)
  const [goal, setGoal] = useState<number | null>(null)
  const [neighborhood, setNeighborhood] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [ownershipModel, setOwnershipModel] = useState<string | null>(null)
  const [ownershipOther, setOwnershipOther] = useState('')
  const [occupation, setOccupation] = useState('')
  const [ageRange, setAgeRange] = useState<string | null>(null)
  const [householdType, setHouseholdType] = useState<string | null>(null)
  const [incomeRange, setIncomeRange] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')


  function toggleRole(value: string) {
    setRoles(prev => prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value])
  }

  function goNext() {
    setDir(1)
    setStep(s => s + 1)
  }

  function goBack() {
    setDir(-1)
    setStep(s => s - 1)
  }

  async function saveProfile() {
    if (goal === null || !user) return { error: new Error('missing') }
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string) ?? null,
      goal,
      neighborhood: neighborhood || null,
      roles,
      ownership_model: ownershipModel || null,
      ownership_other: ownershipModel === 'other' ? ownershipOther || null : null,
      occupation: occupation || null,
      age_range: ageRange || null,
      household_type: householdType || null,
      income_range: incomeRange || null,
    })
    if (!error) await refreshProfile()
    return { error }
  }

  async function handleFinish() {
    if (goal === null) return
    setSaving(true)
    const { error } = await saveProfile()
    setSaving(false)
    if (error) {
      setError('Could not save your profile. Please try again.')
    } else {
      navigate('/parking-vote')
    }
  }


  const steps = [
    // Step 1 — Goal
    <div key="goal" className="w-full max-w-4xl">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-3">Step 1 of 5</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          How much of Oakland's housing crisis do you want to solve?
        </h1>
        <p className="text-teal-300 max-w-xl mx-auto leading-relaxed">
          This sets your personal target on the voting map. You can change it any time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {GOALS.map((g, i) => {
          const isSelected = goal === g.units
          return (
            <motion.button
              key={g.units}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.08, duration: 0.4 }}
              onClick={() => setGoal(g.units)}
              className={`text-left rounded-2xl p-6 border-2 transition-all duration-200 focus:outline-none ${
                isSelected
                  ? `${g.border} bg-white/10 ring-2 ${g.ring} ring-offset-2 ring-offset-transparent`
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="mb-4">
                <span className="text-xs font-bold tracking-widest text-teal-400/70">{g.tag}</span>
                <p className="text-3xl font-bold text-white mt-1">{g.headline}</p>
                <p className="text-sm text-teal-300">{g.pct}% of parking spaces</p>
              </div>
              <div className="mb-4">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${g.barColor} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${g.pct}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <p className="text-lg font-bold text-white mb-2">{g.label}</p>
              <p className="text-sm text-teal-200/70 leading-relaxed">{g.desc}</p>
              {isSelected && (
                <div className="mt-4 flex items-center gap-2 text-teal-400 text-sm font-medium">
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Selected
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
        <Button
          onClick={goNext}
          disabled={goal === null}
          size="lg"
          className="flex-1 py-4 text-base shadow-lg"
        >
          {goal ? 'Continue' : 'Choose a goal to continue'}
        </Button>
      </div>
    </div>,

    // Step 2 — Neighborhood
    <div key="neighborhood" className="w-full max-w-xl">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-3">Step 2 of 5</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Which Oakland neighborhood do you most want to see this happen in?
        </h1>
        <p className="text-teal-300 leading-relaxed">
          Tell us where you'd most like to see tiny home parklets, where you live, work, or see the biggest need.
        </p>
      </div>

      {/* 124 options: a searchable dropdown, not a wall of chips. */}
      <SearchableSelect
        options={NEIGHBORHOODS}
        value={neighborhood === NOT_OAKLAND ? '' : neighborhood}
        onChange={setNeighborhood}
        placeholder="Search neighborhoods…"
        variant="dark"
        disabled={neighborhood === NOT_OAKLAND}
      />

      {/* Deliberately outside the dropdown. Someone who lives elsewhere should not have to
          search a list of Oakland neighbourhoods to say they are not in Oakland. The two are
          mutually exclusive, so each clears the other. */}
      <label className="mt-4 mb-6 flex items-center gap-3 cursor-pointer group w-fit">
        <input
          type="checkbox"
          checked={neighborhood === NOT_OAKLAND}
          onChange={e => setNeighborhood(e.target.checked ? NOT_OAKLAND : '')}
          className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500
            focus:ring-2 focus:ring-teal-400 focus:ring-offset-0 cursor-pointer"
        />
        <span className="text-sm text-teal-200/70 group-hover:text-teal-200 transition-colors">
          I don't live in Oakland
        </span>
      </label>
      <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
        <Button onClick={goBack} variant="subtle" size="lg" className="flex-1 py-4 text-base shadow-lg">
          Back
        </Button>
        <Button
          onClick={goNext}
          disabled={!neighborhood}
          size="lg"
          className="flex-1 py-4 text-base shadow-lg"
        >
          Continue
        </Button>
      </div>
    </div>,

    // Step 3 — Role
    <div key="role" className="w-full max-w-xl">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-3">Step 3 of 5</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          What's your connection to Oakland?
        </h1>
        <p className="text-teal-300 leading-relaxed">Select all that apply.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {ROLES.map((r, i) => {
          const isSelected = roles.includes(r.value)
          return (
            <motion.button
              key={r.value}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.07 }}
              onClick={() => toggleRole(r.value)}
              className={`flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 text-sm font-medium text-center leading-snug transition-all duration-200 focus:outline-none ${
                isSelected
                  ? 'border-teal-400 bg-teal-400/20 text-teal-300 ring-2 ring-teal-400/30'
                  : 'border-white/10 bg-white/5 text-teal-200/70 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <r.Icon className="w-6 h-6" strokeWidth={1.5} />
              {r.label}
            </motion.button>
          )
        })}
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
        <Button onClick={goBack} variant="subtle" size="lg" className="flex-1 py-4 text-base shadow-lg">
          Back
        </Button>
        <Button onClick={goNext} size="lg" className="flex-1 py-4 text-base shadow-lg">
          Continue
        </Button>
      </div>
    </div>,

    // Step 4 — Ownership model
    <div key="ownership" className="w-full max-w-xl">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-3">Step 4 of 5</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Who should build and own these units?
        </h1>
        <p className="text-teal-300 leading-relaxed">
          This helps us understand what kind of ordinance Oakland residents want.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {OWNERSHIP_OPTIONS.map((o, i) => {
          const isSelected = ownershipModel === o.value
          return (
            <motion.button
              key={o.value}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.07 }}
              onClick={() => setOwnershipModel(isSelected ? null : o.value)}
              className={`text-left flex items-start gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200 focus:outline-none ${
                isSelected
                  ? 'border-teal-400 bg-teal-400/20 ring-2 ring-teal-400/30'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                isSelected ? 'border-teal-400 bg-teal-400' : 'border-white/30'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${isSelected ? 'text-teal-300' : 'text-teal-200/80'}`}>{o.label}</p>
                <p className="text-xs text-teal-300/50 mt-0.5">{o.subtext}</p>
              </div>
            </motion.button>
          )
        })}
      </div>

      {ownershipModel === 'other' && (
        <input
          type="text"
          placeholder="Describe your idea…"
          value={ownershipOther}
          onChange={e => setOwnershipOther(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all mb-4 text-sm"
          autoFocus
        />
      )}

      {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
        <Button onClick={goBack} variant="subtle" size="lg" className="flex-1 py-4 text-base shadow-lg">
          Back
        </Button>
        <Button onClick={goNext} size="lg" className="flex-1 py-4 text-base shadow-lg">
          Continue
        </Button>
      </div>
    </div>,

    // Step 5 — About You (demographics)
    <div key="about" className="w-full max-w-xl">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-400 mb-3">Step 5 of 5</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          A little about you
        </h1>
        <p className="text-teal-300 leading-relaxed">
          This helps researchers understand who supports tiny home parklets. All optional, answer only what you're comfortable sharing.
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-teal-200/80 mb-2">Occupation</label>
          <input
            type="text"
            placeholder="e.g. Teacher, Student, Planner…"
            value={occupation}
            onChange={e => setOccupation(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-teal-200/80 mb-2">Age range</label>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGES.map(v => (
              <button
                key={v}
                onClick={() => setAgeRange(ageRange === v ? null : v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none ${
                  ageRange === v
                    ? 'border-teal-400 bg-teal-400/20 text-teal-300'
                    : 'border-white/10 bg-white/5 text-teal-200/60 hover:border-white/20 hover:text-teal-200'
                }`}
              >
                {rangeLabel(v)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-teal-200/80 mb-2">Household</label>
          <div className="flex flex-wrap gap-2">
            {HOUSEHOLD_TYPES.map(h => (
              <button
                key={h.value}
                onClick={() => setHouseholdType(householdType === h.value ? null : h.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none ${
                  householdType === h.value
                    ? 'border-teal-400 bg-teal-400/20 text-teal-300'
                    : 'border-white/10 bg-white/5 text-teal-200/60 hover:border-white/20 hover:text-teal-200'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-teal-200/80 mb-2">Household income</label>
          <div className="flex flex-wrap gap-2">
            {INCOME_RANGES.map(v => (
              <button
                key={v}
                onClick={() => setIncomeRange(incomeRange === v ? null : v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none ${
                  incomeRange === v
                    ? 'border-teal-400 bg-teal-400/20 text-teal-300'
                    : 'border-white/10 bg-white/5 text-teal-200/60 hover:border-white/20 hover:text-teal-200'
                }`}
              >
                {rangeLabel(v)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg px-4 py-2">{error}</p>}

      <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
        <Button onClick={goBack} variant="subtle" size="lg" disabled={saving} className="flex-1 py-4 text-base shadow-lg">
          Back
        </Button>
        <Button
          onClick={handleFinish}
          disabled={saving}
          size="lg"
          className="flex-1 py-4 text-base shadow-lg"
        >
          {saving ? 'Setting up your map…' : 'Start Voting'}
        </Button>
      </div>
    </div>,
  ]

  return (
    <div className="relative min-h-screen shrink-0 flex flex-col items-center justify-center px-6 py-12 bg-surface-dark">
      {/* Persistent concept thumbnail */}
      <div className="hidden sm:flex absolute top-6 right-6 items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 pr-4 max-w-xs">
        <img
          src="/tinyHomeParklet.webp"
          alt="A tiny yellow home with a white picket fence on an Oakland parking space"
          className="w-14 h-14 rounded-lg object-cover shrink-0"
        />
        <p className="text-xs text-teal-200/70 leading-snug">
          Factory-built Park Models, installed on parking spaces, connected to utilities.
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? 'w-6 h-2 bg-teal-400' : i < step ? 'w-2 h-2 bg-teal-600' : 'w-2 h-2 bg-white/20'
            }`}
          />
        ))}
      </div>

      <div className="w-full flex justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.4 }}
            className="flex justify-center w-full"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}