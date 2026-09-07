import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

// rounded-lg, not rounded-full. Pill buttons made the marketing, auth and onboarding pages
// read as a different product from the map UI, which already used gentle corners. Circles
// (icon buttons, progress dots) and chips keep their own radius; those are different shapes,
// not different opinions about the same shape.
const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed'

const variants = {
  primary:   'bg-teal-500 hover:bg-teal-400 text-white shadow-sm',
  secondary: 'border-2 border-teal-500 text-teal-600 hover:bg-teal-50',
  ghost:     'text-teal-600 hover:text-teal-500 hover:bg-teal-50',
  // For dark or photographic backgrounds, where the teal fill would dominate: the landing
  // slideshow's secondary CTA and similar.
  subtle:    'bg-white/10 hover:bg-white/20 border border-white/30 text-white backdrop-blur-sm',
}

const sizes = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </>
      ) : children}
    </button>
  )
}
