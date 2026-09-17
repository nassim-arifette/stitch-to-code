# Browser evidence and QA

Use this procedure for web implementations after the implementation gate in `SKILL.md` passes. The principle is: **inspect the live UI first, then inspect source to explain what the browser shows.**

## 1. Choose evidence targets

For every changed surface, identify:

- the canonical/current Stitch reference;
- its reference width/height when available;
- explicit responsive breakpoints;
- important routes/states/interactions that must be exercised.

For a breakpoint, test immediately below, at, and above it when practical. Do not substitute framework-default widths for explicit design thresholds.

## 2. Run the app and collect deterministic evidence

Use the project's normal dev/preview command. When Playwright already exists in the target project, run the bundled `scripts/audit-ui.mjs` from this skill directory.

Example:

```bash
node <skill-dir>/scripts/audit-ui.mjs \
  --url http://localhost:3000 \
  --routes /,/orders,/orders/123 \
  --viewports 1440x900,768x1024,390x844
```

Optional flags:

```text
--output <dir>                 Write evidence to a chosen directory instead of an OS temp directory.
--timeout <ms>                Navigation/action timeout (default: 15000).
--settle-ms <ms>              Extra settle time after load (default: 300).
--fail-on runtime,overflow    Exit non-zero for selected finding classes.
--fail-on all                 Also fail on HTTP/network and axe accessibility findings.
```

The audit records per route/viewport:

- screenshot;
- console errors and uncaught page errors;
- failed requests and HTTP 4xx/5xx responses;
- document/body horizontal overflow and likely overflowing elements;
- computed font-family/weight usage and loaded font resource URLs;
- `document.fonts` readiness/check evidence;
- axe violations when `axe-core` is already installed.

The script does **not** install Playwright or axe. If they are unavailable, use the repository's existing browser/test tooling and state what could not be collected.

## 3. Compare the rendered result with Stitch

Inspect screenshots at the actual reference widths. Check visual primitives and component anatomy before chasing small spacing differences:

- font family/weight and icon family/glyph/state;
- key tokens/colors, spacing, radii, assets, and density;
- shared shell/navigation/header/component consistency;
- content hierarchy and responsive transformation;
- dialogs/drawers/popovers for realistic content-driven sizing and scrolling.

A local screenshot mismatch does not automatically win over a higher-priority `DESIGN.md` token or canonical repeated pattern; use the reconciliation hierarchy.

## 4. Exercise behavior and accessibility

Manually or with the project's tests, exercise visible actions and important states:

- navigation, search/filter/pagination, forms, mutations, errors, loading, empty, denied, and success states as applicable;
- keyboard order, visible focus, accessible names/labels, headings/landmarks, dialog focus trap/restore/Escape behavior;
- zoom/long text and critical truncation;
- information preserved between wide and compact layouts.

Do not silently alter explicit visual tokens for accessibility. Follow the fidelity/accessibility rule in `SKILL.md`.

## 5. Run repository checks

Run the relevant typecheck, lint, tests, build/export, and any existing visual/a11y suites. Treat new failures introduced by the implementation as unresolved until fixed or explicitly explained.

## Evidence gate

QA is complete only when every changed surface has browser evidence at the relevant widths, important interactions/states were exercised, unexplained runtime/overflow/font/asset failures are absent, and remaining deviations are explicitly documented in the handoff.
