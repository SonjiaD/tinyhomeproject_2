import { useState, type InputHTMLAttributes } from 'react'

/**
 * Password field with a show/hide toggle.
 *
 * Typing a password blind is the main avoidable cause of failed logins, especially on phones
 * where autocorrect and small keys make mistakes easy and invisible. Revealing the text is a
 * deliberate, user-initiated action, so it does not weaken anything: the value is already in
 * the DOM either way.
 *
 * Shared rather than inlined because login, signup and the password reset page all need it,
 * and a toggle that behaves differently on one of them would be its own small bug.
 */

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

const INPUT_CLASS =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white ' +
  'placeholder-white/30 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all'

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={className ?? INPUT_CLASS}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        // Keep the toggle out of the tab order: someone tabbing from the password field
        // expects to reach the submit button, not a decoration in between.
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors p-1"
      >
        {visible ? (
          // Eye with a slash: currently visible, clicking hides it.
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          // Plain eye: currently hidden, clicking reveals it.
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  )
}
