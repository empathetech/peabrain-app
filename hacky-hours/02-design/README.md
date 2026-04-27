# Design Documents

These docs define how peabrain is built. They are the source of truth — code
should match these, not the other way around. When implementation drifts,
either update the code or amend the doc (and write an ADR for significant
decisions in `decisions/`).

## Active

- [ARCHITECTURE.md](./ARCHITECTURE.md) — technical shape, hosting, data flow
- [LICENSING.md](./LICENSING.md) — license, attribution, dependency policy
- [DATA_MODEL.md](./DATA_MODEL.md) — domain model, schemas, persistence
- [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — recommendation engine, advisory rules, math
- [USER_JOURNEYS.md](./USER_JOURNEYS.md) — flows for each kind of session
- [STYLE_GUIDE.md](./STYLE_GUIDE.md) — visual language, components, iconography
- [ACCESSIBILITY.md](./ACCESSIBILITY.md) — WCAG 2.1 AA conformance plan
- [SECURITY_PRIVACY.md](./SECURITY_PRIVACY.md) — threat surface, data handling
- [TESTING.md](./TESTING.md) — test strategy, definition of done

## Decisions

ADRs (Architecture Decision Records) live in [decisions/](./decisions/).
Write one when you change a design decision in a way that's worth remembering
the *why* behind. Format: `YYYY-MM-DD-<short-topic>.md`.
