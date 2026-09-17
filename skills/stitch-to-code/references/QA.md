# Browser evidence and QA

Use this procedure to validate implementation/sync work, or to audit an existing app without changing it. Inspect the live UI first, then inspect source to explain what the browser shows. Audit-only work reports defects; it does not require an implementation gate or permission to fix them.

## 1. Choose evidence targets

For every target surface, identify its canonical/current Stitch reference, reference width/height, explicit breakpoints, and important routes/states/interactions. Test below, at, and above important breakpoints when practical; do not substitute framework defaults.

Run the project's normal dev/preview command. Confirm the requested route actually rendered: a login redirect, loading skeleton, or failed data load is not evidence of the intended screen. Match reference content/state and let the app become ready using its existing browser/test tooling; a fixed delay is not a readiness guarantee.

## 2. Collect deterministic evidence

Run from the **target application's root**, so its dependencies resolve correctly. `<skill-dir>` is the installed `stitch-to-code` directory, not necessarily a `skills/` folder in the application.

```bash
node <skill-dir>/scripts/audit-ui.mjs \
  --url http://localhost:3000 \
  --routes /,/orders,/orders/123 \
  --viewports 1440x900,768x1024,390x844
```

Screenshots match the requested viewport dimensions in CSS pixels by default. Animations/transitions are disabled and the caret hidden during capture, not throughout interaction testing. Full-page capture is optional.

```text
--output <dir>                Evidence directory (default: OS temporary directory).
--timeout <ms>                Per-operation deadline (default: 15000), not a whole-run budget.
--settle-ms <ms>              Extra delay after load (default: 300).
--storage-state <file>        Existing Playwright storage-state JSON for authenticated routes.
--full-page                  Capture the whole scrollable document.
--fail-on runtime,overflow   Fail on selected findings; network and a11y are also supported.
--fail-on all                Require axe-core and fail on any supported finding class.
```

The script uses existing Playwright (`playwright` or `@playwright/test`) and optional `axe-core`; it installs nothing. Its standalone browser does not inherit the project's Playwright config or login fixtures. Use existing project tooling when that setup is necessary.

Treat storage state as sensitive: never commit it or copy it into evidence. The helper reads it without exporting its contents or path. Screenshots, console messages, HTML excerpts, and URLs can themselves contain sensitive data; inspect/redact evidence before sharing. Use only authorized targets and test accounts.

The report records screenshots, console/page errors, failed requests and HTTP error responses, and document-level horizontal overflow. Offscreen elements are diagnostic only: they do not independently fail `--fail-on overflow`. Font evidence includes computed CSS stacks, FontFaceSet entries/status, checks, and resource URLs. **These do not prove which font rendered each glyph.** Confirm actual rendered fonts with browser developer tools when fidelity is in doubt; a successful `document.fonts.check()` can still involve fallback.

Axe runs only when installed. Missing optional axe is reported as skipped; explicitly requesting `--fail-on a11y` or `all` without it returns an error. A failed axe run is reported separately from detected violations.

Exit codes: **0** means evidence was collected without a selected failure; **1** means selected findings; **2** means invalid setup or incomplete required evidence. Navigation, DOM, font-readiness, or screenshot collection failures return 2 even without `--fail-on`. A successful exit is not a visual-fidelity or accessibility certificate. Review the report and screenshots.

## 3. Compare the rendered result with Stitch

Check actual typography and icon family/glyph/state; authoritative tokens, spacing, radii, assets, and density; shared shells/components; content hierarchy and responsive transformations; and content-driven dialog/drawer sizing and scroll behavior.

A local screenshot mismatch does not override a higher-priority design token or canonical pattern. Use the hierarchy in `SKILL.md`. The helper collects evidence; it does not perform a semantic comparison with Stitch or verify interactions.

## 4. Exercise behavior and accessibility

With the project's tests or browser tools, exercise navigation, search/filter/pagination, forms, and loading/empty/error/denied/success states. Check keyboard order, focus visibility, labels and accessible names, headings/landmarks, dialog focus trap/restoration/Escape, zoom/long text, truncation, and information preserved between wide and compact layouts.

Test mutations only in an explicitly safe test environment; an audit is not permission to export sensitive data, submit payments, or delete production records. Otherwise mark those interactions untested. Check animations normally outside stabilized screenshot capture. Follow the fidelity/accessibility conflict rule in `SKILL.md`; audits recommend changes without applying them.

## 5. Run repository checks and report

Run appropriate typecheck, lint, tests, build/export, and existing visual/accessibility checks without auto-fix during audit. Record what actually ran, failures, and skips. Separate source conflicts, product defects, and unavailable tooling.

For each audit finding, include the surface, expected vs observed behavior, impact, and evidence (screenshot, report entry, source path, or reproduction). Do not claim a clean bill of health from missing evidence.

Implementation/sync validation passes when required evidence and interaction checks are complete, no unexplained failures remain, and deviations are explicit. An audit completes with an evidence-backed report, even if defects remain; missing checks must still be labelled incomplete.
