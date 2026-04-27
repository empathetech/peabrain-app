# Security & Privacy

What peabrain collects, what it doesn't, where data lives, and how we
protect it. Most of the design here flows from a single architectural
decision in [ARCHITECTURE.md](./ARCHITECTURE.md): **peabrain has no
backend server.** That eliminates entire categories of risk before
they exist.

## Threat model

We design against three realistic adversaries, in priority order:

1. **Accidental data loss / leakage by peabrain itself.** A bug, a
   bad dependency, or a careless feature design that exposes user
   data to peabrain's developers, hosting provider, or third-party
   services without explicit consent.
2. **Malicious content from the network.** Bad actors injecting
   scripts via dependency supply chain, malicious imported plan
   files, XSS through user-supplied notes.
3. **Compromise of the user's browser.** Browser malware, malicious
   extensions, shared/public computer use. We can't fully defend
   against this — our role is to minimize the data exposed when it
   happens.

We are explicitly **not** trying to defend against:

- Targeted state-level adversaries
- Physical access to the user's device
- The user's deliberate sharing of their own data

## Privacy stance

### What peabrain does *not* collect

- No accounts, no usernames, no email addresses, no passwords.
- No analytics, no telemetry, no usage tracking, no fingerprinting.
- No advertising IDs, no third-party trackers, no marketing pixels.
- No precise geolocation stored without explicit user opt-in (and
  even then, rounded — see below).
- No payment information (peabrain is free).
- No social graph, no contacts.

### What peabrain *does* collect, and where it lives

| Data | Where it lives | Who can see it |
|------|----------------|----------------|
| Garden plans (surfaces, plantings, notes, sun zones) | User's browser IndexedDB | Only the user; never leaves their device unless they export or sync |
| Approximate location (zone, country, hemisphere) | User's browser IndexedDB | Same — local only |
| Precise lat/lon coords | **Only if user opts in** to geolocation; **rounded to 0.1°** (~11 km) before storage; user's browser IndexedDB | Same |
| User preferences (units, theme) | localStorage | Same |
| OAuth tokens for cloud-storage sync | localStorage, **session-scoped only** (cleared on tab close) | Same |
| Cloud-sync exports (JSON files) | User's chosen cloud (Drive / OneDrive) | The user's cloud account; not visible to peabrain |

**Peabrain itself never receives, stores, or processes any of the
above on a server we operate, because we don't operate a server.**
The user's bytes never touch our infrastructure.

### Cloud storage sync

When a user opts into cloud-storage sync:

- We use the **minimum-scope OAuth grant** — Google Drive's
  `drive.file` scope (access only to files peabrain itself created)
  and the OneDrive equivalent. We never request `drive` (full Drive
  access).
- The OAuth flow is the **provider's**, not peabrain's. Tokens are
  issued by Google/Microsoft directly to the user's browser; peabrain
  never sees the user's cloud password.
- Tokens live in localStorage, session-scoped, and are cleared when
  the browser tab closes. This means re-auth on next visit — slightly
  more friction but a much smaller blast radius if the device is
  compromised.
- The sync writes the JSON garden file to the user's chosen folder.
  We never index, hash, or fingerprint the file content for any
  purpose other than the immediate sync operation.
- Users can revoke peabrain's access at any time in their cloud
  provider's settings. We surface this path in the Settings page.

### Geolocation

- The default location-entry path is **typed input** (city, country,
  postal code). This is the minimum-data path and is presented first.
- The browser geolocation API is offered as a **one-tap opt-in**
  ("use my location"). It is never invoked silently or on page load.
- Before invoking it, peabrain shows what will happen ("we'll ask
  your browser for your coordinates and look up your climate zone").
- Coordinates are **rounded to 0.1°** (~11 km) before any storage.
  The full-precision coords are used only transiently to call
  Nominatim for reverse geocoding, then discarded.
- The reverse-geocoding call uses a per-request `User-Agent` per
  Nominatim's fair-use policy and includes no user identifiers.
- Users can clear their stored location at any time in Settings.

### Photo handling (future, V2+)

Photo plant-diagnosis is documented in ARCHITECTURE.md as a future
feature requiring a server. When it lands, the privacy commitments
are:

- Photos are uploaded **per-explicit-action** — never auto-uploaded,
  never bulk-synced.
- The UI surfaces a clear "this sends your photo to a third-party AI
  service" notice **before** the upload, with a confirm gate.
- The server accepts the photo, forwards it to the model, returns
  the response, and **does not retain the photo** beyond the request
  lifecycle. Logs do not include photo bytes or stable hashes.
- Photos are never associated with the user's gardens or any other
  identifier. No account exists to associate them with anyway.
- Rate limits are by IP, not user identity, to prevent abuse without
  building user tracking.

This is documented now so the implementation does not drift toward
"easier" defaults that betray the privacy stance.

## Data handling for users

- **The user owns their data.** It lives in their browser; it goes
  where they tell it to go.
- **Export is always available.** From any garden, the user can
  download a complete, round-trippable JSON file plus visual exports
  (SVG / PNG / HTML).
- **Deletion is local and immediate.** Deleting a garden in peabrain
  removes it from IndexedDB on the spot. No "soft delete" or
  "recoverable for 30 days" — there's nowhere it could be recovered
  from.
- **Browser data wipe affects everything.** If the user clears
  cookies/site-data or uses Private/Incognito mode, their gardens
  are gone. Onboarding (USER_JOURNEYS.md) communicates this
  explicitly so it's never a surprise.

## Security controls

### In the application

- **Strict Content Security Policy (CSP)** served via meta tag and
  GitHub Pages headers where possible:
  - `default-src 'self'`
  - `script-src 'self'` (no inline scripts, no `unsafe-eval`)
  - `style-src 'self' 'unsafe-inline'` (we minimize inline styles
    but Vite injects some during dev — production locks this down)
  - `img-src 'self' data: https://*.googleusercontent.com
    https://*.live.com` (the cloud-storage providers' image hosts)
  - `connect-src 'self' https://nominatim.openstreetmap.org
    https://www.googleapis.com https://graph.microsoft.com`
  - `frame-ancestors 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`
- **No `dangerouslySetInnerHTML`** in React components. Period. User
  notes, plant search input, and imported file content are all
  rendered as text nodes only.
- **Imported file validation** — every imported JSON is parsed via a
  strict schema validator (e.g., Zod) before any field is read.
  Unknown fields are rejected. File size capped (e.g., 10 MB) before
  parsing.
- **No `eval`, no `Function()` constructor, no dynamic `import()`
  of user-supplied paths.**
- **Trusted Types policy** where browser-supported, to defang any
  remaining injection paths.

### In the build pipeline

- **Dependency policy** lives in [LICENSING.md](./LICENSING.md);
  every new dep also gets an implicit security review (popularity,
  recent activity, known CVEs).
- **`pnpm audit` runs in CI.** High-severity findings block merge.
- **Renovate or Dependabot** keeps dependencies current; we triage
  at least monthly.
- **Subresource Integrity (SRI)** on any third-party scripts we ever
  load (we aim for none).
- **No secrets in the repo.** `.env*` files are in `.gitignore`. The
  pre-merge checklist references this. There are very few secrets
  to begin with — the OAuth client IDs are public by design; no
  client secrets needed for client-side OAuth flows.

### In hosting

- **HTTPS only.** GitHub Pages serves HTTPS by default; we never
  serve over plain HTTP. `Strict-Transport-Security` header where
  configurable.
- **No server-side processing means no server-side vulnerabilities.**
  This is a real architectural advantage worth restating.

### Service worker

- The service worker caches the app shell and bundled data, never
  user data.
- Cache versioning on every release prevents stale-cache bugs that
  could surface old code with known vulnerabilities.
- Service worker is registered with `scope: '/'` and never widens
  beyond peabrain's origin.

## User-supplied content

The places where user input could be a vector:

| Surface | Vector | Mitigation |
|---------|--------|------------|
| Notes (on Garden, Surface, Planting, SunZone) | XSS via HTML/script in note text | Always rendered as text nodes (React default); never via `dangerouslySetInnerHTML`. Markdown rendering, if added, uses a sanitizer with a strict allow-list. |
| Plant search box | Injection into URL or DOM | Searches are local IndexedDB queries; never sent to a server; values escaped before display. |
| Garden / surface / planting names | XSS in display | Rendered as text nodes; never as HTML. |
| Imported JSON files | Schema-shaped attacks (large arrays, deeply nested objects, prototype pollution) | Schema validation rejects extra fields; we use `Object.create(null)` for parsed dictionaries; file size capped; nesting depth capped. |
| Imported JSON files | Malicious content in image references | We don't load image URLs from imports; bundled plant images are app assets, not import-driven. |

## Disclaimers and informational content

Peabrain provides gardening guidance based on curated data. It is
not, and does not claim to be:

- A legal authority on plant legality, invasive-species regulations,
  or pesticide rules. The legal flags in the plant DB are
  best-effort, dated, and disclaimed in the UI per
  [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md).
- A medical authority. Some plants are toxic to humans or pets;
  we surface known toxicity flags where we have them, but users
  must verify with veterinary or medical professionals when in
  doubt. Same disclaimer pattern as legal flags.
- A guarantee of yield or success. Gardening is biology + weather +
  effort + luck. Yield estimates show ranges; the UI never frames
  them as promises.

These disclaimers appear:

- In the legal / invasive flag UI itself
- On the planning-time yield rollup
- In the Settings → About page
- In the published privacy + terms pages

## Public-facing pages

We publish a small set of plain-language pages:

- `/privacy` — what we collect, where it lives, what we never do.
  Mirrors this doc in user-friendly form.
- `/terms` — MIT license, disclaimers (gardening, legal, medical),
  warranty disclaimer.
- `/accessibility` — see [ACCESSIBILITY.md](./ACCESSIBILITY.md).
- `/about` — what peabrain is, who Empathetech is, how to contribute
  or report issues.

These pages are part of the MVP, not afterthoughts.

## Reporting and response

- Security issues are reported via a `SECURITY.md` at the repo root
  (added at MVP ship): plain-language instructions for reporting,
  a contact path that doesn't require a GitHub account, our
  response-time target (we'll aim for acknowledgement within 7 days,
  triage within 14).
- We follow a coordinated-disclosure norm: we'll work with the
  reporter on a timeline before any public disclosure of details.
- Because peabrain has no server, the universe of patchable bugs is
  client-side; any fix ships as a normal release. Service-worker
  versioning ensures the fix reaches users on next page load.

## Open questions

- **Bug bounty / VDP.** Worth considering once the project has
  meaningful adoption. Premature for MVP. Revisit when we have a
  real user base.
- **External security audit.** A community-driven project rarely has
  budget for one. We aim for "obvious due diligence done well":
  CSP, dep audits, axe-clean a11y, no inline scripts, schema-validated
  imports. If a sponsor or contributor wants to fund a third-party
  review later, great.
- **Plant DB integrity.** The bundled plant DB ships in the repo —
  anyone modifying their copy of peabrain can edit it. That's fine;
  it's their copy. But should we ship a signed manifest so the *live
  app* can detect tampered data? Probably overkill for V1, but worth
  remembering for V2+.
- **Cloud-storage encryption-at-rest.** Provider-side encryption is
  table stakes (Drive and OneDrive both do it). Should we
  client-side encrypt the JSON before upload, with a passphrase the
  user controls? Adds friction; defers password-manager pain to
  the user. Defer; revisit if there's user demand.
