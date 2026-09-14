import { type ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const maxWidths = {
  sm:  'max-w-xl',
  md:  'max-w-3xl',
  lg:  'max-w-4xl',
  xl:  'max-w-6xl',
}

export function PageLayout({ children, maxWidth = 'md', className = '' }: PageLayoutProps) {
  // No min-h-full. Pages render inside #main-scroll, a flex column, so this is a flex item.
  // A flex item's default min-height:auto is what stops it shrinking below its content;
  // min-h-full replaces that with a percentage that resolves to a real number inside a flex
  // layout, so the box shrank to one viewport and the content spilled out past the footer.
  // Nothing needs the fill either: AppShell already paints bg-surface-page behind everything.
  return (
    <div className={`bg-surface-page py-12 px-6 pb-24 ${className}`}>
      <div className={`${maxWidths[maxWidth]} mx-auto`}>
        {children}
      </div>
    </div>
  )
}
