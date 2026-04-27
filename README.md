# peabrain 🌱

A garden planning companion for backyard gardeners across the skill spectrum.

Peabrain helps you go from *"I have a yard and an idea"* to *"I harvested
food I planned for"* — with location-aware, beginner-safe guidance the
whole way. It's a planning, visualization, and care companion that knows
about climate zones, surface fit, sun exposure, plant compatibility, and
the time of year.

## Status

**🚧 In design.** Code hasn't started yet. The full product design lives
in [`hacky-hours/`](./hacky-hours/) — what we're building, why, and how.

You can read along by starting with:

- [`hacky-hours/01-ideate/PRODUCT_OVERVIEW.md`](./hacky-hours/01-ideate/PRODUCT_OVERVIEW.md) — what peabrain *is*
- [`hacky-hours/02-design/`](./hacky-hours/02-design/) — how it works (architecture, data, UX, accessibility, security, testing)
- [`hacky-hours/03-roadmap/ROADMAP.md`](./hacky-hours/03-roadmap/ROADMAP.md) — what gets built when

## What peabrain will do

- **Lay out a garden** — drop raised beds, in-ground plots, planters, and trellises onto a bird's-eye canvas
- **Recommend plants per surface** — given your location, climate zone, sun exposure, and the surface itself
- **Warn honestly** — about bad-fit climates, shallow beds, sun mismatches, companion conflicts, and crop-rotation conflicts
- **Estimate cost and yield** — so you can decide whether the project is worth it before committing
- **Stay private** — runs entirely in your browser, no accounts, no tracking, your data lives where you put it
- **Work offline** — installable Progressive Web App
- **Be accessible** — WCAG 2.1 AA from day one, including the spatial layout planner

## How it's built

A client-side Progressive Web App in TypeScript + React + Vite, hosted
on GitHub Pages. No backend server. Garden data lives in your browser
(IndexedDB) and exports as portable JSON. See
[`hacky-hours/02-design/ARCHITECTURE.md`](./hacky-hours/02-design/ARCHITECTURE.md)
for the full picture.

## Project values

- **Free, open, MIT-licensed.** Anyone can use, modify, and build on this.
- **Privacy by design.** No accounts. No analytics. No tracking. No PII.
- **Accessible by default.** Not a stretch goal.
- **Global, not US-only.** Works wherever there are gardeners.
- **Advisory, not prescriptive.** We suggest; you decide.

## Built by

[Empathetech](https://www.empathetech.org/) — a community group.

Designed and developed using the [Hacky Hours](https://github.com/empathetech/hacky-hours-docs)
documentation framework for LLM-assisted app development.

## License

MIT. See [LICENSE](./LICENSE).
