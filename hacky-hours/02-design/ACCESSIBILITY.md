# Accessibility

WCAG 2.1 AA from day one — committed in PRODUCT_OVERVIEW. This doc
turns that commitment into specific, testable rules and surfaces the
non-obvious cases where peabrain has to work harder than a typical
web app (especially the layout planner).

## Conformance target

**WCAG 2.1 Level AA** across the entire product. We do not ship
features that regress this. Where AAA is achievable without
sacrificing clarity, we aim for it (notably contrast and reduced
motion).

We are not pursuing WCAG 2.2 specific criteria yet, but we will adopt
them as they become widely tooled. The principles overlap heavily
with 2.1 AA.

## Color and contrast

- **All text meets AA contrast** (4.5:1 for body, 3:1 for large text
  ≥ 18 px / 14 px bold) against its intended background, in both
  light and dark mode.
- **Status colors meet AA** when paired with the backgrounds and
  text colors specified in [STYLE_GUIDE.md](./STYLE_GUIDE.md).
- **Color is never the sole carrier of meaning.** Every status, fit
  tier, warning, and state change pairs color with at least one of:
  an icon, a text label, a shape, or a textual pattern. This is
  reinforced visually in the fit-badges exemplar.
- **Decorative SVGs use `aria-hidden="true"`.** Status SVGs use
  `role="img"` with an accessible `<title>` describing the meaning.

### Pre-build contrast verification

Before any build work begins, every starting hex pair in
STYLE_GUIDE.md must be verified against:

- Body text on light background and dark background
- Body text on every status-colored fill (badges, callouts)
- Status icon on white and on the status-fill it appears in

Tooling: WebAIM Contrast Checker, Stark, or `axe-core` reports —
captured as a spreadsheet in `02-design/assets/accessibility/`
contrast-audit at build time. Any failing pair is adjusted before
implementation, never papered over.

## Keyboard navigation

The entire product is operable using a keyboard alone. Pointer/touch
is an enhancement, not a requirement.

### Global

- **Skip link** at the top of every page: "Skip to main content."
- **Focus is always visible** — a 2 px outline in primary green on
  light backgrounds, primary-green-tinted-light on dark. Never
  removed by `outline: none`.
- **Tab order is meaningful** and matches visual order. We do not use
  positive `tabindex` values.
- **Focus trapping** in dialogs and modals; focus returns to the
  triggering element on close.
- **Escape** closes panels and dialogs everywhere.

### Layout planner — the hard problem

A spatial drag-and-drop canvas is fundamentally a pointer interaction.
We have to design a parallel keyboard model that is *equally capable*,
not a half-baked fallback.

The planner ships with `dnd-kit`'s keyboard support enabled, plus a
peabrain-specific mental model that we document and teach:

| Keyboard | Action |
|----------|--------|
| `Tab` / `Shift+Tab` | Cycle through surfaces in the layout |
| `Enter` on a surface | Open that surface's detail panel |
| `Tab` inside a surface | Cycle through plantings within it |
| `Space` on a planting/surface | Pick up for moving |
| `Arrow keys` while picked up | Move in 4 directions, snapping to a configurable grid |
| `Shift + Arrow` | Move 10× the grid step |
| `Enter` while picked up | Drop |
| `Escape` while picked up | Cancel move (return to original position) |
| `Delete` / `Backspace` | Delete selected planting / surface (with confirm) |
| `?` (anywhere) | Open keyboard shortcut reference |

For **sun-zone painting**, the keyboard model is:

| Keyboard | Action |
|----------|--------|
| Tool-palette focus + `Enter` | Activate sun-zone tool |
| `Arrow keys` | Move a "paint cursor" (visible, focusable square) |
| `Space` | Toggle the current sun level on the cursor cell |
| `1` / `2` / `3` / `4` | Quick-switch level (full / AM / PM / shade) |
| `Escape` | Exit the sun-zone tool |

For **adding a new surface**:

| Keyboard | Action |
|----------|--------|
| Toolbar focus + select surface type | Choose raised bed / planter / etc. |
| `Arrow keys` | Position the new surface in the canvas |
| `+` / `-` | Resize in fixed increments |
| `Enter` | Place and confirm |
| `Escape` | Cancel |

## Screen-reader experience

Peabrain must be usable end-to-end with a screen reader (NVDA, JAWS,
VoiceOver, TalkBack). We test against at least NVDA + Chrome and
VoiceOver + Safari before each release.

### Page structure

- Single `<h1>` per page: the garden name.
- Logical heading hierarchy with no skipped levels.
- Landmark roles: `<header>`, `<nav>`, `<main>`, `<aside>` for the
  detail panel, `<footer>`.
- Skip link points to `<main>`.

### The SVG layout canvas

This is where most products fail. Our approach:

- The root `<svg>` has `role="application"` and an `aria-label`
  describing the canvas: *"Garden layout for Backyard, with 4
  surfaces and 12 plantings."*
- Each surface group has `role="group"`, an `aria-label` describing
  it (*"Raised bed A, 2.4 by 1.2 meters, in full sun, contains 4
  plantings"*), and `tabindex="0"`.
- Each planting within a surface has `role="img"` and an `aria-label`
  describing plant, quantity, and status (*"Cherry tomato, 4 plants,
  growing"*).
- Sun zones are `aria-hidden="true"` because their meaning is already
  encoded in the surface labels' "in full sun" / "in partial morning
  sun" prefix.
- Drag-and-drop announcements via an `aria-live="assertive"` region:
  *"Moving cherry tomato. Use arrow keys."* / *"Dropped at row 2,
  column 3."* / *"Move canceled."*
- After each placement, a polite live-region update announces the
  fit and warnings: *"Decent fit. Bed is a bit shallow for carrots."*

### Live regions

- **Save status** lives in `aria-live="polite"`: announces *"All
  changes saved"* on initial load and only when state changes
  (avoids constant chatter).
- **Recommendation updates** announce when filters change: *"12
  plants match your filters."*
- **Errors and important warnings** use `aria-live="assertive"` —
  cloud sync failed, IndexedDB quota exceeded, schema mismatch on
  import.

### Forms and inputs

- Every input has a programmatically associated `<label>` (not just a
  visual proximity).
- Required fields are marked with both a visual asterisk and a text
  "(required)" for screen readers.
- Error messages reference the specific input via `aria-describedby`.
- Inline validation messages do not move focus unprompted.

## Touch and pointer

- **Tap target minimum 44 × 44 CSS px** for any interactive element.
- **Hover states never carry essential information** — they may add
  detail but the same info is reachable via tap or focus.
- **Pinch-zoom is not disabled.** We never set `user-scalable=no`.
- **Drag-and-drop fallbacks on touch:** long-press to pick up, tap
  the destination to drop, swipe-from-edge to cancel — provided by
  dnd-kit; we keep them on.

## Motion and animation

- **`prefers-reduced-motion: reduce`** swaps animations for instant
  state changes. No exceptions.
- **No auto-playing motion** outside of the user's explicit drag,
  drop, or save action.
- **No flashing content.** Anything pulsing or changing rapidly must
  do so under 3 Hz to comply with WCAG 2.3.1.

## Localization and writing direction

- All UI strings live in a translation table — no hardcoded English
  in components.
- The app respects right-to-left writing direction (`dir="rtl"`)
  end-to-end. The layout planner mirrors layout, the toolbar mirrors,
  text inputs and labels mirror.
- Plant common names ship with multiple locales in the plant DB; the
  active locale resolves the displayed name.
- Numerals and dates respect the user's locale (Intl.NumberFormat,
  Intl.DateTimeFormat).

We do not commit to *every* locale at MVP — but we commit to *not
making any locale impossible to add later*. No design decision should
prevent translation or RTL adaptation.

## Errors and recovery

- Error messages are written in plain language and tell the user *what
  to do next.* Never expose stack traces.
- Errors are conveyed via at least: text, color, and an icon — no
  reliance on color alone.
- Destructive actions require confirmation; the confirm dialog
  describes the consequence.
- Auto-save reduces the surface area of "I lost my work" — but when a
  save genuinely fails, the toast is `aria-live="assertive"` and
  includes a "retry" affordance.

## Disclaimers and legal-flag presentation

When peabrain surfaces legal/regulatory information about a plant
(see BUSINESS_LOGIC.md), the disclaimer is announced and visible:

- The legal status badge has `role="img"` with a label like
  *"Permit required in your region."*
- The "we are not legal advisors" disclaimer is in normal page flow
  (not visually hidden), so screen readers reach it.
- The "data last verified on YYYY-MM-DD" stamp is text, never just an
  icon tooltip.

## Testing and verification

Three-layer testing strategy, expanded in [TESTING.md](./TESTING.md):

1. **Automated** — `axe-core` runs in CI on every PR; failures block
   merge. ESLint `eslint-plugin-jsx-a11y` runs on every save.
2. **Manual keyboard testing** — every PR that touches UI is tested
   with the keyboard alone. The pre-merge checklist references this.
3. **Manual screen-reader testing** — performed before each release
   tag against NVDA + Chrome and VoiceOver + Safari for the critical
   journeys (Journeys 1–5 from USER_JOURNEYS.md).

Periodically (each milestone release), we do a holistic
accessibility pass: run axe across the deployed app, walk every
critical journey by keyboard, walk one journey with a screen reader,
log findings as backlog items.

## Accessibility statement

We will publish a public accessibility statement at
`/accessibility` once the MVP is live, declaring our conformance
target, known gaps, and how to report issues. This is a trust
commitment as much as a legal one.

## Open questions

- **Cognitive accessibility for first-time gardeners.** WCAG 2.1
  doesn't say much here, but our audience includes total beginners
  who may also have low gardening literacy. Plain-language copy and
  forgiving flows are part of style guide; should we go further
  (read-aloud mode, illustrated tutorials)? Defer until we see real
  user feedback.
- **Voice input for outdoor use.** A user in the yard with dirty
  hands might want to dictate a note. Browser dictation works but
  isn't great. Out of scope for MVP; revisit if it comes up.
- **Print accessibility.** Exported HTML and printed SVG should
  remain accessible (real text, not images-of-text). Verify during
  the print stylesheet pass.
