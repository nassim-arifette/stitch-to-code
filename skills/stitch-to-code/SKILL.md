---
name: stitch-to-code
description: >-
  Implement or sync Google Stitch designs into a real application. Use whenever a task involves Stitch screens, a Stitch project, Stitch MCP, or .stitch/DESIGN.md. Reconcile multiple screens into one coherent UI, preserve explicit design tokens/assets, map mockup affordances to real product behavior, reuse compatible existing components, and validate the rendered implementation. Do not use for unrelated image/Figma-to-code work.
---

# Stitch to Code

Use Stitch to Code as the **integration and reconciliation layer** between Stitch-generated design material and a real codebase. It is not a downloader, a framework generator, or a replacement for Stitch/Google design tooling.

The core rule is:

> Preserve deliberate design decisions. Reconcile accidental inconsistencies. Ground behavior in the actual product and the selected implementation mode.

Use **Lite** by default. Lite adds no permanent Stitch to Code state. Use **Strict** only when explicit screen history, shared-pattern tracking, or QA/provenance records solve a real project need; read `references/STRICT_MODE.md` then.

## Choose the implementation mode first

Select one mode before editing code:

- **Existing product integration** — default when the repository already contains a working product. Preserve real routes, data contracts, permissions, and supported behavior. Do not invent backend/product capability from mockup content.
- **Greenfield prototype** — use when the user is intentionally building a Stitch prototype. Local mock data and client-only interactions are valid, but do not present them as persisted, authenticated, server-backed, or otherwise real when they are not.
- **Design sync/update** — use when an existing implementation is being brought in line with newer Stitch design material. Preserve working behavior and product contracts unless the user or an authoritative product requirement explicitly changes them.

If the mode is not stated, infer it from the repository and request. Prefer **existing product integration** when a real application already exists.

## Source-of-truth hierarchy

Use separate hierarchies for visual decisions and product behavior.

### Visual decisions

When visual sources disagree, prefer in this order:

1. the user's explicit requirement for the current task;
2. current structured values in `.stitch/DESIGN.md` for properties they directly define;
3. an explicitly current/canonical Stitch screen;
4. a pattern repeated across the relevant Stitch screens;
5. a compatible existing component or token in the repository;
6. an isolated screen anomaly.

For a current structured `DESIGN.md`, treat machine-readable token values as exact values and prose as guidance for how to apply them. If a token is malformed or unresolved, it is not a usable exact value until the conflict is resolved; preserve the source file and report the problem rather than silently guessing.

Do not let an isolated screenshot detail override a higher-priority explicit token or established repeated pattern.

### Product behavior

When deciding what the UI should actually do, prefer in this order:

1. the user's explicit product requirement/specification;
2. APIs, schemas, permissions, routes, domain models, and tests;
3. existing working product behavior;
4. Stitch affordances as evidence of intent only.

The mode changes what is allowed at level 4: a prototype may implement clearly local/mock behavior; an existing product or sync task must not fabricate product capability.

## Phase 1 — Discover

Inspect the repository and the relevant Stitch material before editing.

Establish:

- target surfaces/screens and stable Stitch project/screen IDs when available;
- the selected implementation mode;
- which Stitch references are current/canonical;
- routes, navigation, real entities/data, APIs/contracts, roles/permissions, and supported actions;
- existing components, tokens, assets, and responsive conventions;
- important loading, empty, error, denied, pending, and success states;
- how the application is run and which normal type/lint/test/build checks apply.

If Stitch MCP or specialized Stitch skills are available, use them for retrieval/generation work and fetch only the material needed for the task.

If `.stitch/DESIGN.md` exists and the Google linter is available, run:

```bash
npx @google/design.md lint .stitch/DESIGN.md
```

Do not add a permanent dependency just to run the linter. Do not rewrite `DESIGN.md` merely to make the implementation convenient. If lint cannot run, state that; if it reports malformed/unresolved tokens, surface the finding and do not silently substitute guessed values.

> **Discovery gate:** proceed only when the target surfaces, implementation mode, authoritative design sources, product capabilities/constraints, and validation path are known.

## Phase 2 — Reconcile before coding

Compare all relevant screens together. Do not implement them as independent mockups.

Create a small **temporary reconciliation map** in working notes, not a committed Lite-mode artifact:

```text
surface → canonical shell → shared patterns → local exceptions → mock-only/unsupported controls → responsive state
```

Use one row/entry per relevant surface. Resolve disagreements using the source-of-truth hierarchies above, and classify each meaningful difference as one of:

- intentional variant;
- real product requirement;
- responsive state;
- illustrative/mock-only content;
- isolated Stitch drift to normalize.

Prefer an established shared pattern over creating another nearly identical header, card, button, search control, pagination, modal, or navigation family. Do not over-normalize genuine feature-specific differences.

### Fidelity vs accessibility

Accessibility behavior belongs to the coded product: implement semantics, keyboard operation, focus, labels/names, dialog behavior, and other non-conflicting accessibility requirements.

Do **not** silently mutate an explicit design token only to improve contrast or another visual accessibility property. Instead:

- when accessibility/compliance is an explicit project requirement, make the minimum necessary visual deviation and record/report it;
- otherwise preserve the explicit design source and flag the conflict.

Read `references/RECONCILIATION.md` when a conflict is non-trivial or several screens disagree.

> **Reconciliation gate:** proceed only when every relevant surface is represented in the reconciliation map, shared patterns and intentional exceptions are identified, and no unresolved contradiction is silently driving implementation.

## Phase 3 — Implement

Preserve exact Stitch choices when they are authoritative: font family/weights, icon family/glyph/variant, colors/tokens, spacing, radii, supplied assets, explicit breakpoints, and established component language.

Then apply the mode rules:

- **Existing product integration:** reuse compatible existing components before creating new families; adapt them when a higher-priority design source requires it; wire only supported product actions; remove or recast unsupported mockup controls.
- **Greenfield prototype:** local mock data and client state are allowed; make visible controls actually work at the prototype level; do not fake remote persistence, permissions, account state, or server success unless explicitly requested as simulation.
- **Design sync/update:** preserve working routes, data flow, mutations, permissions, and interaction semantics unless an authoritative requirement changes them; update the visual/system layer around that behavior.

Across all modes:

- keep shared patterns actually shared;
- do not invent metrics, identities, balances, notifications, routes, filters, or mutations that the chosen mode does not justify;
- do not leave interactive-looking controls inert;
- keep wide and compact states backed by the same underlying product truth;
- use explicit Stitch/project breakpoints instead of familiar framework defaults when they exist;
- make technical fallbacks explicit rather than silently swapping fonts, icons, or assets.

> **Implementation gate:** proceed only when mode-valid interactions work, reusable patterns are shared, explicit design choices are preserved or deviations are explained, and there are no misleading dead controls or accidental parallel component families.

## Phase 4 — Validate with browser evidence

For web work, validate the **rendered application**, not only the source. Open the live UI first; use source inspection afterward to explain and fix observed problems.

Use the bundled `scripts/audit-ui.mjs` when Playwright is already available in the target project. Run it at the Stitch/reference widths and around important breakpoints. It captures screenshots plus deterministic evidence for console/page errors, failed/error responses, horizontal overflow, computed font usage/font resources, and optional axe accessibility findings when `axe-core` is installed.

Read `references/QA.md` for the full browser procedure and audit command options.

Also run the repository's normal typecheck, lint, tests, build/export, or equivalent checks where appropriate.

> **Validation gate:** finish only when the relevant surfaces were inspected at the reference/responsive widths, important interactions and accessibility behavior were exercised, runtime/overflow/font/asset issues have no unexplained failures, and any remaining visual/product deviations are explicit.

## Done

All four gates must pass. In the final handoff, state any intentional design deviation, unresolved source conflict, skipped validation capability, or prototype-only behavior. Do not call a surface complete merely because it resembles a Stitch screenshot.
