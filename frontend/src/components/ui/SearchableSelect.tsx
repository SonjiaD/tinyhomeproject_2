import { useState, useRef, useEffect, useMemo } from 'react'

/**
 * A select you can type into.
 *
 * Built for the neighbourhood picker, which offers 124 options. Both pages previously rendered
 * all of them as a wrapping cloud of chips, which is unreadable at that length — you cannot
 * scan 124 pills to find one name.
 *
 * Replaces the unused CustomSelect, which had no search and was hardcoded for light surfaces.
 * Onboarding sits on a dark background and the profile page on a light one, so the variant is
 * a real requirement rather than styling preference.
 */

interface SearchableSelectProps {
  options: readonly string[]
  /** Currently selected option, or '' for none. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Which surface this sits on. Onboarding is dark; the profile page is light. */
  variant?: 'light' | 'dark'
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  variant = 'light',
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Which option the keyboard is on. Separate from `value`, since moving through the list with
  // arrow keys should not commit a choice until Enter.
  const [highlighted, setHighlighted] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const dark = variant === 'dark'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options
  }, [options, query])

  // Close when clicking away, and discard whatever was typed: leaving a stale query behind
  // would make the next open show a filtered list for no visible reason.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Focus the filter as soon as the list opens, so typing works without a second click.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setHighlighted(0)
    }
  }, [open])

  // Keep the highlighted row in view when arrowing past the visible window.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, open])

  function choose(option: string) {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault() // stop the page scrolling instead of the list
      if (!open) { setOpen(true); return }
      setHighlighted(i => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1
        if (next < 0) return filtered.length - 1
        if (next >= filtered.length) return 0
        return next
      })
      return
    }
    if (e.key === 'Enter' && open && filtered[highlighted]) {
      e.preventDefault()
      choose(filtered[highlighted])
    }
  }

  const trigger = disabled
    ? dark
      ? 'bg-white/5 border-white/5 text-white/25 cursor-not-allowed'
      : 'bg-gray-50 border-border-input text-gray-400 cursor-not-allowed'
    : dark
      ? 'bg-white/5 border-white/10 text-white hover:border-white/20 focus:border-teal-400'
      : 'bg-white border-border-input text-gray-700 hover:border-primary-500/50 focus:border-primary-500'

  const panel = dark
    ? 'bg-primary-900 border-white/10'
    : 'bg-white border-border'

  return (
    <div ref={wrapRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`relative w-full text-left border rounded-lg px-4 py-3 pr-10 text-sm
          focus:outline-none transition-colors ${trigger}`}
      >
        {value || <span className={dark ? 'text-white/30' : 'text-gray-400'}>{placeholder}</span>}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${
              dark ? 'text-white/40' : 'text-gray-400'
            }`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && !disabled && (
        <div className={`mt-1 w-full border rounded-lg shadow-lg overflow-hidden ${panel}`}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlighted(0) }}
            placeholder={placeholder}
            className={`w-full px-4 py-2.5 text-sm border-b focus:outline-none ${
              dark
                ? 'bg-transparent border-white/10 text-white placeholder-white/30'
                : 'bg-transparent border-border text-gray-700 placeholder-gray-400'
            }`}
          />

          <ul ref={listRef} role="listbox" className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className={`px-4 py-3 text-sm ${dark ? 'text-white/40' : 'text-gray-400'}`}>
                No neighbourhoods match "{query}"
              </li>
            )}
            {filtered.map((option, i) => {
              const selected = option === value
              const active = i === highlighted
              return (
                <li
                  key={option}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                    dark
                      ? selected ? 'bg-teal-400/20 text-teal-200 font-medium'
                        : active ? 'bg-white/10 text-white' : 'text-teal-100/70'
                      : selected ? 'bg-primary-50 text-primary-800 font-medium'
                        : active ? 'bg-surface-muted text-gray-700' : 'text-gray-700'
                  }`}
                >
                  {option}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
