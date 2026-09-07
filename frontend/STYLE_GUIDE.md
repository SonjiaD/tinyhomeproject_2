# Style guide

The rules every page follows, and why each one exists. If you are about to write a Tailwind class
that sets a size, a colour or a padding on something this document covers, use the component or the
token instead.

This exists because the site drifted: two different greens with no rule about which went where, a
`Button` size scale that almost every page overrode, and page columns ranging from 576px to 1024px.
The result was that the survey looked like a different product from the map.

---

## Colour

The site has two green palettes and keeps both, because they do different jobs. What was missing was
the rule about which job.

| Role | Palette | Where |
|---|---|---|
| **Structure** | `primary-800` / `primary-900` | Nav, footer, page hero bands, map panels, dark page backgrounds |
| **Accent** | `teal-*` | Every button fill, link, focus ring, selected state, eyebrow label |
| **Semantic** | red, `getRankColor` | Oppose, errors, map vote ranking |

`primary-*` is the custom palette in `tailwind.config.js` (muted, `primary-900` = `#1a3a3a`).
`teal-*` is Tailwind's default (vivid, `teal-500` = `#14b8a6`). They are genuinely different
colours, not shades of one — mixing them arbitrarily is what made the buttons clash with the map.

**Accent usage in practice:**

- `teal-500` fill → `teal-400` on hover
- `teal-600` for links on light backgrounds
- `teal-300` / `teal-200` for body text on dark backgrounds
- `teal-400/20` for selected rows
- `teal-400` for focus rings

**Never** use `primary-*` for something a person clicks, and never use `teal-*` for a large
background surface.

Dark surfaces beyond the palette live in `src/lib/colors.ts` as `SURFACE_DARK` (`#0f2a2a`) and
`SURFACE_DARKEST` (`#0d2626`), with matching `surface-dark` / `surface-darkest` Tailwind utilities.

---

## Buttons

Use the `Button` component (`src/components/ui/Button.tsx`). It owns padding, text size, radius and
shadow.

| Size | Classes | Use for |
|---|---|---|
| `sm` | `px-4 py-1.5 text-sm` | Compact inline actions |
| `md` *(default)* | `px-6 py-2.5 text-sm` | Form actions, survey navigation, profile, map controls |
| `lg` | `px-8 py-3.5 text-base` | Landing-page hero CTAs only |

Variants: `primary` (teal fill), `secondary` (teal outline), `ghost` (teal text),
`subtle` (translucent white — for dark or photographic backgrounds).

### `className` on `<Button>` carries layout only

`w-full`, `flex-1`, `gap-2`, `whitespace-nowrap`. **Never** padding, **never** text size.

This is the rule that broke first. The survey passed `size="lg"` *and* `py-4 text-base` stacked on
top of it, nine times, which is why its buttons read as oversized against every other button on the
site. `lg` already means `text-base`; adding it again just made the button taller than the scale
allows.

⚠️ **One documented exception:** the two landing hero CTAs keep `shadow-lg shadow-teal-900/40` /
`shadow-xl shadow-teal-900/50`. They sit on dark photographic backgrounds where the variant's
`shadow-sm` disappears entirely. That is contextual elevation, not size — it does not license
padding overrides.

### Buttons in a fixed-width row need `whitespace-nowrap`

A `flex-1` button inside a `max-w-md` row cannot grow to fit its label. When the label swaps at
runtime — a submit button changing to a saving state, say — a longer string wraps to two lines and
the entire row jumps taller mid-action. Shortening the label fixes it until the next wording change;
`whitespace-nowrap` fixes it permanently.

---

## Type scale

| Level | Classes |
|---|---|
| Page h1 | `text-3xl md:text-4xl font-bold` |
| Landing hero h1 *(sole exception)* | `text-3xl md:text-5xl font-bold` |
| Tool header h1 | `text-xl font-semibold` |
| Section h2 | `text-xl font-semibold` |
| Card title h3 | `text-base font-semibold` |
| Body | `text-sm leading-relaxed` |
| Hero subcopy | `text-base leading-relaxed` |
| Meta, captions, labels | `text-xs` |
| Eyebrow | the `SectionLabel` component |

**Tool header** is a real tier, not a violation. The map and Suggest pages put their heading in a
thin bar above a full-bleed map; a `text-4xl` heading there would crowd out the thing the page
exists to show. Content pages that scroll use the page h1 scale.

---

## Layout

- Content pages use **`PageLayout`** (`src/components/ui/PageLayout.tsx`), which owns
  `py-12 px-6 pb-24`. Do not hand-roll that padding.
- Prose pages use `maxWidth="lg"` (`max-w-4xl`).
- `Card` defaults to `padding="md"` (`p-6`); `lg` (`p-8`) for prose-only cards.

Column width is the reason a page can *feel* like it uses larger type when it does not. The profile
page and the policy pages were built with identical font sizes, but the profile page's column was
128px narrower inside `p-8` cards, which reads as noticeably bigger text. Match the column before
reaching for a font size.

---

## Forms

`SearchableSelect` (`src/components/ui/SearchableSelect.tsx`) has two modes:

- **`dropdown`** (default) — click to open. For forms with several fields, where a permanently open
  list would crowd everything else out.
- **`inline`** — search box and list always visible, at a **fixed** height. For a step whose only
  job is that one choice. A panel that springs open on click shoves everything below it down the
  page, and on a sparse screen that jump reads as a glitch.

⚠️ Inline uses a fixed height rather than a max-height deliberately. A max-height still shrinks as
the filter narrows, so typing a query with two matches collapses the box and yanks the buttons
upward — the same bug in a quieter form. Anything that toggles inside a sparse layout should reserve
its space rather than claim it on demand.

Native checkboxes use `accent-teal-500`. `@tailwindcss/forms` is **not** installed, so `text-teal-500`
and `border-*` on an `<input type="checkbox">` do nothing at all and the control renders in the
browser's default blue. `accent-*` maps to the CSS `accent-color` property and is the supported way
to tint a native control without the plugin.
