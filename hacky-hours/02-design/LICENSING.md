# Licensing

How peabrain itself is licensed, what dependencies we're allowed to pull
in, and how curated content is licensed separately from code.

## The project license

Peabrain's source code is released under the **MIT License** with
attribution to **Empathetech**.

The canonical license file is [`/LICENSE`](../../LICENSE) at the project
root. Copyright line: `Copyright (c) 2026 Empathetech`.

In practice this means anyone can:

- Use the code for personal or commercial purposes
- Modify it
- Redistribute it (with or without changes)
- Use it as part of a closed-source product

…as long as they preserve the copyright notice and license text in
copies of the code. We chose MIT to make peabrain maximally useful to
the broader gardening community.

## Attribution

Distributors must include the MIT license text and copyright line. We
don't require attribution in user-facing UI of derivative works — the
copyright line in the source is sufficient — but we appreciate credit
where it fits naturally (e.g., a link back to
[empathetech.org](https://www.empathetech.org/) in an "About" page).

When forking peabrain to make a derivative product, please leave the
existing copyright line and add your own — don't remove ours.

## Dependency license policy

Every third-party package added to peabrain must have a license that's
compatible with MIT. Some licenses — especially the GPL family — would
force peabrain itself to become copyleft, which would conflict with our
goal of maximum reusability. We avoid those.

### ✅ Allowed

Permissive, MIT-compatible licenses:

- **MIT**
- **Apache 2.0**
- **BSD 2-clause** and **BSD 3-clause**
- **ISC**
- **Zlib**
- **Unlicense**
- **CC0** (for data/content packages)

### ⚠️ Allowed with care

- **MPL 2.0** (Mozilla Public License) — file-level copyleft. Fine for
  libraries we don't modify; flag it for review if we ever fork an
  MPL-licensed package and modify its files.

### ❌ Forbidden

These would either force peabrain to change license, expose us to legal
ambiguity, or make redistribution risky:

- **GPL** (any version) — strong copyleft; would force peabrain GPL
- **AGPL** — even more aggressive, triggers on network use
- **LGPL** — the "library exception" is fragile and contested in
  JavaScript bundling contexts
- **BSL** (Business Source License), **SSPL**, **Elastic License**, and
  other "source available but not OSI-approved" licenses
- Anything custom / unclear / unspecified — if the package's license
  isn't a recognized OSI-approved permissive license, we don't ship it

### Process for adding a new dependency

Before running `pnpm add <package>`:

1. Check the package's license on its npm page or GitHub repo
2. Confirm it's on the **Allowed** list above
3. If it's on **Allowed with care**, note the license in the PR
   description and confirm we're not modifying its files
4. If it's **Forbidden** — find an alternative, or escalate to a
   licensing discussion before proceeding
5. Transitive dependencies (deps-of-deps) inherit this same policy.
   Use `pnpm licenses list` periodically to spot-check the full tree.

The framework's pre-merge checklist requires checking this doc before
adding any dependency.

## Content licensing (separate from code)

Code is MIT. **Curated content** — the plant database, icons, fonts,
bundled datasets — is licensed differently per its nature. We treat
this as a separate concern so users of peabrain understand what they
can do with the *data* vs. the *code*.

### Plant database (authored by us)

License: **CC BY 4.0** (Creative Commons Attribution 4.0 International).

Anyone can use, share, and adapt our curated plant data for any purpose,
including commercial, as long as they credit Empathetech. This is the
standard for community-shared data and aligns with how open botanical
datasets are typically released.

The data lives in `public/data/plants/` and is accompanied by an
`attributions.md` file that lists the upstream sources used to author
each plant entry (RHS, USDA, regional extension services, etc.).

### Köppen-Geiger climate data (third-party)

License: **CC BY 4.0** (as published by Beck et al.).

We use it as-is, credit the original authors in
`public/data/koppen/attributions.md`, and link to the source dataset.
We do not relicense it.

### Icons and fonts

Restrict to permissive licenses only:

- **MIT** / **Apache 2.0** for code-bundled icon libraries
- **SIL Open Font License (OFL)** for fonts (the standard for free
  fonts; permits embedding without per-page attribution)
- **CC0** for public-domain icons

Avoid icon sets that require visible attribution on every page using
them — they exist and they're a UX tax.

## Disclaimers

Peabrain provides gardening guidance, climate-zone information, and
flags potential legal/regulatory considerations for plants. **Peabrain
is not a legal authority.** Legal and regulatory data goes stale, and
laws vary by jurisdiction. Users acting on peabrain's guidance —
particularly anything touching plant legality, invasive species
restrictions, or pesticide use — should verify with their local
authorities. The MIT license already disclaims warranty for the
software; we mirror this in user-facing copy where peabrain surfaces
legal/regulatory content (see [SECURITY_PRIVACY.md](./SECURITY_PRIVACY.md)
once that doc is written).
