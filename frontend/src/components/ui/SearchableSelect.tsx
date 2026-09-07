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
  /**
   * `dropdown` (default) hides the list behind a trigger button.
   *
   * `inline` renders the search box and the list permanently, at a fixed height. Used where the
   * picker is the only thing on the screen: opening a panel there shoves everything below it
   * down the page, and that jump is worse than the space the list costs. Fixed height rather
   * than max-height on purpose — a max-height still grows and shrinks as the filter narrows, so
   * typing a query with two matches would collapse the box and yank the buttons up with it.
   */
  mode?: 'dropdown' | 'inline'
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  variant = 'light',
  disabled = false,
  mode = 'dropdown',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Which option the keyboard is on. Separate from `value`, since moving through the list with
  // arrow keys should not commit a choice until Enter. Seeded from the current selection so an
  // inline list scrolls to it on mount rather than opening at the top of the alphabet.
  const [highlighted, setHighlighted] = useState(() => Math.max(0, options.indexOf(value)))

  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const dark = variant === 'dark'
  const inline = mode === 'inline'
  // Inline mode has no closed state at all, so everything below keys off this rather than `open`.
  const listOpen = inline || open

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options
  }, [options, query])

  // Close when clicking away, and discard whatever was typed: leaving a stale query behind
  // would make the next open show a filtered list for no visible reason. Dropdown only —
  // there is nothing to close inline.
  useEffect(() => {
    if (inline) return
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [inline])

  // Focus the filter as soon as the list opens, so typing works without a second click. Not for
  // inline, where the list is open from mount: stealing focus there would scroll the page to the
  // picker and pop the keyboard open on mobile before anyone has asked for it.
  useEffect(() => {
    if (inline) return
    if (open) {
      inputRef.current?.focus()
      setHighlighted(0)
    }
  }, [open, inline])

  // Keep the highlighted row in view when arrowing past the visible window.
  useEffect(() => {
    if (!listOpen) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, listOpen])

  function choose(option: string) {
    onChange(option)
    // Inline keeps the query, so the row you just picked stays where you can see it. Clearing it
    // would reset the list to the top of the alphabet and hide the choice you just made.
    if (inline) return
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      // Inline has nothing to close, so Escape clears the filter instead.
      if (!inline) setOpen(false)
      setQuery('')
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault() // stop the page scrolling instead of the list
      if (!listOpen) { setOpen(true); return }
      setHighlighted(i => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1
        if (next < 0) return filtered.length - 1
        if (next >= filtered.length) return 0
        return next
      })
      return
    }
    if (e.key === 'Enter' && listOpen && filtered[highlighted]) {
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

  const searchInput = (
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
  )

  const list = (
    <ul
      ref={listRef}
      role="listbox"
      className={`overflow-auto py-1 ${inline ? 'h-52' : 'max-h-60'}`}
    >
      {filtered.length === 0 && (
        <li className={`px-4 py-3 text-sm ${dark ? 'text-white/40' : 'text-gray-400'}`}>
          No neighbourhoods match &ldquo;{query}&rdquo;
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
  )

  // Inline: one permanent box. Disabling dims it in place rather than swapping it for a smaller
  // control, so ticking "I don't live in Oakland" does not resize the step either.
  if (inline) {
    return (
      <div
        ref={wrapRef}
        onKeyDown={onKeyDown}
        aria-disabled={disabled || undefined}
        className={`w-full border rounded-lg overflow-hidden transition-opacity duration-200 ${panel} ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        {searchInput}
        {list}
      </div>
    )
  }

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
          {searchInput}
          {list}
        </div>
      )}
    </div>
  )
}
