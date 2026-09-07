import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Home, Key, History, Heart, Briefcase, MapPin, Circle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { NEIGHBORHOODS, NOT_OAKLAND } from '../lib/neighborhoods'
import { SectionLabel, PageLayout, SearchableSelect } from '../components/ui'

const GOALS = [
  {
    units: 6000,
    label: 'Prove the Concept',
    tag: 'STARTER',
    pct: 14,
    headline: '6,000 units',
    desc: 'A serious demonstration. More units than any single recent year of Oakland construction.',
    barColor: 'bg-teal-400',
    selectedBorder: 'border-teal-500 ring-2 ring-teal-500/30',
  },
  {
    units: 18000,
    label: 'Meet the State Obligation',
    tag: 'REQUIRED',
    pct: 40,
    headline: '18,000 units',
    desc: 'The full projected RHNA shortfall closed. Oakland meets its legal housing obligation by 2031.',
    barColor: 'bg-teal-400',
    selectedBorder: 'border-teal-500 ring-2 ring-teal-500/30',
  },
  {
    units: 30000,
    label: 'End the Affordability Crisis',
    tag: 'TRANSFORMATIVE',
    pct: 65,
    headline: '30,000 units',
    desc: "Enough supply to push Oakland's vacancy rate to 6–7%, the level at which rents actually start falling.",
    barColor: 'bg-orange-400',
    selectedBorder: 'border-orange-400 ring-2 ring-orange-400/30',
  },
]

const ROLES = [
  { value: 'renter',        label: 'Renter',                     Icon: Home },
  { value: 'homeowner',     label: 'Homeowner',                  Icon: Key },
  { value: 'used_to_live',  label: 'Used to live there',         Icon: History },
  { value: 'want_to_move',  label: 'Want to move there',         Icon: Heart },
  { value: 'work_there',    label: 'Work there',                 Icon: Briefcase },
  { value: 'oakland_fan',   label: 'Fan / live nearby',          Icon: MapPin },
  { value: 'other',         label: 'Other',                      Icon: Circle },
]

const OWNERSHIP_OPTIONS = [
  { value: 'property_owner',     label: 'Property owner',       subtext: 'The lot owner across the sidewalk' },
  { value: 'city_owned',         label: 'City-owned & rented',  subtext: 'City builds and manages the units' },
  { value: 'private_developer',  label: 'Private developer',    subtext: 'Developer pays city for a concession' },
  { value: 'occupant_lot_lease', label: 'Occupant lot-lease',   subtext: 'Resident owns the home, pays city a fee' },
  { value: 'other',              label: 'Other idea',           subtext: 'Tell us what you\'re thinking' },
]

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

// Source: City of Oakland Open Data portal — data.oaklandca.gov/resource/gwm6-hyga.geojson

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [goal, setGoal] = useState<number | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [neighborhood, setNeighborhood] = useState('')
  const [ownershipModel, setOwnershipModel] = useState<string | null>(null)
  const [ownershipOther, setOwnershipOther] = useState('')
  const [occupation, setOccupation] = useState('')
  const [ageRange, setAgeRange] = useState<string | null>(null)
  const [householdType, setHouseholdType] = useState<string | null>(null)
  const [incomeRange, setIncomeRange] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const skipNextSave = useRef(true)
  const hasLoadedProfile = useRef(false)
  // Holds the latest not-yet-fired debounced save, so we can flush it if the user
  // navigates away within the debounce window (otherwise the last edit is lost).
  const pendingSaveRef = useRef<null | (() => void)>(null)
  const mountedRef = useRef(true)

  // Only ever pull the server profile into local state once, so our own debounced saves
  // (which call refreshProfile and change the `profile` reference) don't look like edits
  // and retrigger another save.
  useEffect(() => {
    if (hasLoadedProfile.current) return
    if (!profile) return
    hasLoadedProfile.current = true
    if (profile.goal) setGoal(profile.goal)
    if (profile.roles) setRoles(profile.roles)
    if (profile.neighborhood) {
      setNeighborhood(profile.neighborhood)
    }
    if (profile.ownership_model) setOwnershipModel(profile.ownership_model)
    if (profile.ownership_other) setOwnershipOther(profile.ownership_other)
    if (profile.occupation) setOccupation(profile.occupation)
    if (profile.age_range) setAgeRange(profile.age_range)
    if (profile.household_type) setHouseholdType(profile.household_type)
    if (profile.income_range) setIncomeRange(profile.income_range)
    setLoaded(true)
  }, [profile])

  // Autosave: debounce so rapid multi-clicks (e.g. selecting several roles) collapse into one save.
  useEffect(() => {
    if (!loaded) return
    if (skipNextSave.current) { skipNextSave.current = false; return }
    if (!goal || !user) return
    setSaving(true)
    setError('')

    let fired = false
    const doSave = async () => {
      if (fired) return           // guard against double-fire (timeout + unmount flush)
      fired = true
      pendingSaveRef.current = null
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata?.full_name as string) ?? null,
        goal,
        roles,
        neighborhood: neighborhood || null,
        ownership_model: ownershipModel || null,
        ownership_other: ownershipModel === 'other' ? ownershipOther || null : null,
        occupation: occupation || null,
        age_range: ageRange || null,
        household_type: householdType || null,
        income_range: incomeRange || null,
      })
      if (!mountedRef.current) return   // navigated away: save still completes, skip UI updates
      setSaving(false)
      if (error) {
        setError('Could not save your profile. Please try again.')
      } else {
        setSaved(true)
        await refreshProfile()
        setTimeout(() => setSaved(false), 2000)
      }
    }
    pendingSaveRef.current = doSave
    const timeout = setTimeout(doSave, 700)
    return () => clearTimeout(timeout)
  }, [loaded, goal, roles, neighborhood, ownershipModel, ownershipOther, occupation, ageRange, householdType, incomeRange])

  // Flush a pending debounced save on unmount so a quick edit-then-navigate isn't lost.
  useEffect(() => () => { mountedRef.current = false; pendingSaveRef.current?.() }, [])


  function toggleRole(value: string) {
    setRoles(prev => prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value])
  }

  return (
    <PageLayout maxWidth="lg">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">Your Profile</h1>
            <p className="text-gray-500 mt-1">Update your goal and preferences any time.</p>
          </div>
          <div className="shrink-0 pt-1.5 text-sm font-medium">
            {saving ? (
              <span className="text-gray-400 flex items-center gap-1.5">
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </span>
            ) : saved ? (
              <span className="text-teal-600">✓ Saved</span>
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : !goal ? (
              <span className="text-gray-400">Choose a goal below to enable saving</span>
            ) : null}
          </div>
        </div>

        {/* Account (read-only) */}
        <section className="mb-10">
          <SectionLabel className="mb-1">Account</SectionLabel>
          <p className="text-gray-400 text-sm mb-4">Set when you signed up. These can't be changed here.</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Name</p>
              <p className="text-gray-800 font-medium">{profile?.full_name || user?.user_metadata?.full_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Email</p>
              <p className="text-gray-800 font-medium">{profile?.email || user?.email}</p>
            </div>
          </div>
        </section>

        {/* Goal tier */}
        <section className="mb-10">
          <SectionLabel className="mb-4">Your Goal</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GOALS.map((g, i) => {
              const isSelected = goal === g.units
              return (
                <motion.button
                  key={g.units}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setGoal(g.units)}
                  className={`text-left rounded-2xl p-5 border-2 transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? `${g.selectedBorder} bg-teal-50 border-teal-500`
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm shadow-sm'
                  }`}
                >
                  <span className="text-xs font-bold tracking-widest text-teal-500/70">{g.tag}</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{g.headline}</p>
                  <p className="text-sm text-teal-600 mb-3">{g.pct}% of parking spaces</p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <motion.div
                      className={`h-full ${g.barColor} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${g.pct}%` }}
                      transition={{ delay: 0.2 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{g.label}</p>
                  {isSelected && (
                    <div className="mt-2 flex items-center gap-1.5 text-teal-600 text-xs font-medium">
                      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Selected
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </section>

        {/* Role */}
        <section className="mb-10">
          <SectionLabel className="mb-1">Your Connection to Oakland</SectionLabel>
          <p className="text-gray-400 text-sm mb-4">Select all that apply.</p>
          <div className="flex flex-wrap gap-3">
            {ROLES.map(r => {
              const isSelected = roles.includes(r.value)
              return (
                <button
                  key={r.value}
                  onClick={() => toggleRole(r.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  <r.Icon className="w-4 h-4" strokeWidth={1.5} />
                  {r.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Ownership preference */}
        <section className="mb-10">
          <SectionLabel className="mb-1">Ownership Preference</SectionLabel>
          <p className="text-gray-400 text-sm mb-4">Who do you think should build and own these units?</p>
          <div className="flex flex-col gap-2">
            {OWNERSHIP_OPTIONS.map(o => {
              const isSelected = ownershipModel === o.value
              return (
                <button
                  key={o.value}
                  onClick={() => setOwnershipModel(isSelected ? null : o.value)}
                  className={`text-left flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    isSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>{o.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.subtext}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {ownershipModel === 'other' && (
            <input
              type="text"
              placeholder="Describe your idea…"
              value={ownershipOther}
              onChange={e => setOwnershipOther(e.target.value)}
              className="mt-3 w-full max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all text-sm"
            />
          )}
        </section>

        {/* Neighborhood */}
        <section className="mb-10">
          <SectionLabel className="mb-1">Your Neighborhood</SectionLabel>
          <p className="text-gray-400 text-sm mb-4">Which Oakland neighborhood do you most want to see this happen in?</p>

          {/* Same searchable dropdown as onboarding, light variant. Previously 124 chips in a
              wrapping cloud, which is unreadable at that length. */}
          <div className="max-w-sm">
            <SearchableSelect
              options={NEIGHBORHOODS}
              value={neighborhood === NOT_OAKLAND ? '' : neighborhood}
              onChange={setNeighborhood}
              placeholder="Search neighborhoods…"
              disabled={neighborhood === NOT_OAKLAND}
            />

            {/* Outside the dropdown on purpose: saying you are not in Oakland should not
                require searching a list of Oakland neighbourhoods. */}
            <label className="mt-3 flex items-center gap-3 cursor-pointer group w-fit">
              <input
                type="checkbox"
                checked={neighborhood === NOT_OAKLAND}
                onChange={e => setNeighborhood(e.target.checked ? NOT_OAKLAND : '')}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                I don't live in Oakland
              </span>
            </label>
          </div>
        </section>

        {/* About You (demographics) */}
        <section className="mb-10">
          <SectionLabel className="mb-1">About You</SectionLabel>
          <p className="text-gray-400 text-sm mb-4">Optional: helps researchers understand who supports tiny home parklets.</p>

          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Occupation</label>
              <input
                type="text"
                placeholder="e.g. Teacher, Student, Planner…"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                className="w-full max-w-sm bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Age range</label>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map(v => (
                  <button
                    key={v}
                    onClick={() => setAgeRange(ageRange === v ? null : v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none ${
                      ageRange === v
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                    }`}
                  >
                    {rangeLabel(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Household</label>
              <div className="flex flex-wrap gap-2">
                {HOUSEHOLD_TYPES.map(h => (
                  <button
                    key={h.value}
                    onClick={() => setHouseholdType(householdType === h.value ? null : h.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none ${
                      householdType === h.value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Household income</label>
              <div className="flex flex-wrap gap-2">
                {INCOME_RANGES.map(v => (
                  <button
                    key={v}
                    onClick={() => setIncomeRange(incomeRange === v ? null : v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none ${
                      incomeRange === v
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                    }`}
                  >
                    {rangeLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="h-16" />
      </motion.div>
    </PageLayout>
  )
}
