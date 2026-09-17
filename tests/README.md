# Maintainer checks

Run from the repository root:

```bash
node --test tests/*.test.mjs
python -m unittest discover -s tests -v
```

Node and Python tests use their standard-library test runners. Browser tests use the project's existing `playwright` or `@playwright/test` installation and Chromium; they are explicitly skipped when Playwright is absent. No test installs tools automatically.

These are script regressions: argument parsing, exit behavior, real DOM/screenshot evidence, storage-state handling, and Strict metadata/template safety. The browser fixtures use `setContent`, so they do not require a running application or external network. Cookie restoration is checked, but this is not an end-to-end authentication flow.

They do not measure agent triggering, delegated skill execution, Stitch fidelity, or production-app correctness. Validate those in the intended agent/application before claiming them. Keep browser state and generated evidence out of commits.
