export const colors = {
  primary: {
    900: '#1a3a3a',
    800: '#234e4e',
    700: '#2d6363',
    600: '#357575',
    500: '#3d8888',
    100: '#dceeed',
    50:  '#eef6f5',
  },
  accent: {
    700: '#9a4a2f',
    600: '#b8593a',
    500: '#c96d4f',
    100: '#f5e0d6',
  },
  rank: ['#1a3a3a', '#2d6363', '#5a9e9e', '#a8cec9', '#dceeed'] as const,
  chart: {
    bar: '#2d6363',
  },
} as const

export function getRankColor(rank: number): string {
  if (rank <= 100) return colors.rank[0]
  if (rank <= 200) return colors.rank[1]
  if (rank <= 300) return colors.rank[2]
  if (rank <= 400) return colors.rank[3]
  return colors.rank[4]
}

/**
 * The two deep surface colours, for the places a Tailwind class cannot reach.
 *
 * These mirror `surface.dark` / `surface.darkest` in tailwind.config.js and must stay in sync
 * with it. Prefer the classes (`bg-surface-dark`, `bg-surface-darkest`) wherever they work;
 * these exist for the three cases that need a real colour string:
 *
 *   - CSS gradients that append an alpha suffix to the colour
 *   - imperative writes to element.style, where there is no className to set
 *   - libraries taking a colour value directly, such as Leaflet's pathOptions
 *
 * They were previously inline hex literals repeated across five files, which is how three
 * slightly different darks ended up in the app without anyone choosing them.
 */

/** Panels and immersive page sections. Deeper than primary-900, which is the nav's colour. */
export const SURFACE_DARK = '#0f2a2a'

/** Full-bleed immersive backgrounds: the slideshow and the auth pages. */
export const SURFACE_DARKEST = '#0d2626'
