# Stitch to Code
[![skills.sh](https://skills.sh/b/nassim-arifette/stitch-to-code)](https://skills.sh/nassim-arifette/stitch-to-code)

Stitch to Code is a small Agent Skill for coding agents like Codex and Claude Code.

> **Stitch to Code is not another Stitch downloader or React generator. It is the integration/reconciliation layer between generated Stitch designs and a real codebase.**

Google now maintains its own [`google-labs-code/stitch-skills`](https://github.com/google-labs-code/stitch-skills) for workflows such as retrieving/generating Stitch designs, managing/extracting `DESIGN.md`, and generating framework-specific components. Stitch to Code is designed to work **alongside** those tools: it stays framework-agnostic, reconciles multiple design sources/screens with the existing product, preserves real behavior, and validates the rendered integration.

I made it because I kept running into the same problem with Google Stitch: individual screens could look good, but once a project had several pages, they did not always feel like the same app anymore. The coding agent would then implement those differences literally, or change things Stitch had already defined clearly, like the font or icon set.

This got much more noticeable for me on larger projects. The more screens I had, the more these small and large inconsistencies added up. Using the rules behind this skill helped me a lot more than simply handing every Stitch screen to the coding agent and hoping it would reconcile everything by itself.

> Unofficial community project. Not affiliated with or endorsed by Google.

## Install

```bash
npx skills add nassim-arifette/stitch-to-code
```

For Codex only:

```bash
npx skills add nassim-arifette/stitch-to-code \
  --skill stitch-to-code \
  --agent codex \
  --copy
```

For Claude Code only:

```bash
npx skills add nassim-arifette/stitch-to-code \
  --skill stitch-to-code \
  --agent claude-code \
  --copy
```

You can also install it manually by copying:

```text
skills/stitch-to-code/
```

into:

```text
# Codex
.agents/skills/stitch-to-code/

# Claude Code
.claude/skills/stitch-to-code/
```

## Use it

For most projects, installing the skill is enough.

A prompt can be as simple as:

```text
Implement these Stitch screens using Stitch to Code.
Use the current Stitch project and DESIGN.md, reconcile inconsistencies across screens,
and validate the result in the browser.
```

The skill selects one of three implementation modes before coding:

- **existing product integration** — real product behavior/contracts win over mockup affordances;
- **greenfield prototype** — local mock data and client-only behavior are allowed without pretending they are real backend capability;
- **design sync/update** — preserve existing working behavior while bringing the visual implementation in line with current Stitch material.

The skill uses the current `.stitch/DESIGN.md` when available; it does not replace it with its own design system. For the current structured Google `DESIGN.md` format, machine-readable token values provide exact values while prose explains how they should be applied.

When `@google/design.md` is already available through the project or environment, the workflow can run its linter with the project's normal package tooling, for example:

```bash
npx @google/design.md lint .stitch/DESIGN.md
```

The workflow should not install, fetch, or download that package solely for this check unless one-off tool execution is appropriate and permitted in the current environment.

## What it tries to fix

There are a few problems I kept seeing when moving from Stitch to code.

Screens from the same project can disagree on things like navigation, headers, components, spacing, search placement, breakpoints, or responsive behavior. Sometimes the difference is minor. Sometimes one page looks like it came from a different version of the app.

Coding agents can also drift away from choices Stitch actually made. A project may specify a font, an icon family, exact colors, radii, breakpoints, or assets, and the agent may still substitute whatever it normally uses.

Mockups can also contain things that only exist to make the screen look realistic. A KPI, export button, avatar, notification, or filter should not automatically become a real product feature.

Stitch to Code gives the agent a few rules for dealing with that:

- use an explicit visual and behavioral source-of-truth hierarchy when sources disagree;
- reconcile relevant design/product sources before coding, using a temporary reconciliation map only when multiple screens, contradictions, or non-trivial normalization make it useful;
- use the exact font, icons, tokens, spacing, radii, breakpoints, and assets the authoritative design source defines;
- keep intentional differences, but reconcile accidental inconsistencies;
- reuse existing components when they already match or can safely satisfy the intended pattern;
- distinguish production integration from prototype-only mock behavior;
- preserve existing working behavior during design-sync tasks unless an authoritative requirement changes it;
- do not leave controls that look interactive but do nothing;
- resolve fidelity-vs-accessibility conflicts explicitly instead of silently changing design tokens;
- validate the live app with browser evidence before calling the work finished.

The skill does not impose a font, icon library, component library, or frontend framework of its own. If one Stitch project uses Hanken Grotesk and Material Symbols while another uses Geist and Phosphor, the agent should follow the project it is working on.

## Browser evidence

The skill includes `scripts/audit-ui.mjs` for deterministic browser evidence. When the target project already has Playwright, it can capture target viewports and report screenshots, console/page errors, failed/error network responses, document-level horizontal overflow, offscreen-element diagnostics, computed font usage/font resources, and optional axe findings when `axe-core` is already installed.

From this repository, an example is:

```bash
node skills/stitch-to-code/scripts/audit-ui.mjs \
  --url http://localhost:3000 \
  --routes /,/orders \
  --viewports 1440x900,390x844
```

Screenshots use the requested viewport dimensions by default and disable animations/transitions during capture for more stable evidence. Use `--full-page` only when a whole scrollable page is useful, and `--storage-state <file>` to reuse an existing Playwright authenticated state without adding login logic to the skill.

By default evidence is written to an OS temporary directory, so Lite mode does not need another committed project artifact. Storage-state contents are not copied into the evidence output. The script does not install Playwright or axe.

See [`QA.md`](skills/stitch-to-code/references/QA.md) for the browser procedure and [`RECONCILIATION.md`](skills/stitch-to-code/references/RECONCILIATION.md) for conflict examples.

## Optional strict mode

Most people do not need this.

The normal workflow does not add metadata files or registries to your project. The agent works from the Stitch references, `DESIGN.md`, and the repo itself: existing components, routes, product docs, schemas/API clients when relevant, tests, and code.

For larger projects where you actually want explicit tracking, Strict mode can add:

```text
.stitch/metadata.json
docs/ui/UI_PATTERNS.md
docs/ui/UI_SURFACES.md
```

The bundled Python scripts initialize and validate this optional tracking state. They are separate from the default browser-evidence helper.

See [`STRICT_MODE.md`](skills/stitch-to-code/references/STRICT_MODE.md) for the details.

## Initial case study

I ran a first blinded A/B test on one frozen multi-screen Stitch project using Codex with `xhigh` reasoning. Both runs started from the same project and used the same implementation prompt. One had Stitch to Code installed and the other did not.

| Category | Baseline | Stitch to Code |
| --- | ---: | ---: |
| Visual fidelity | 5/12 | 8/12 |
| Cross-screen consistency | 11/12 | 11/12 |
| Product truth | 19/20 | 20/20 |
| Responsive | 3/4 | 3/4 |
| Accessibility | 4/8 | 7/8 |
| **Total** | **42/56 (75.0%)** | **49/56 (87.5%)** |

The biggest difference in this test was font and icon fidelity, plus accessibility. Cross-screen consistency was already strong in the baseline on this particular project.

The skill run was not better at everything. It also introduced an oversized desktop modal and switched to the full sidebar too early. I kept those failures in the case study as well.

This is one small test, not a general claim about every Stitch project or every coding agent. My main reason for making the skill came from using this workflow on larger projects, where it helped me much more as inconsistencies accumulated across screens.

See [`example/`](example/) for the screenshots, prompts, and both implementations.

## License

MIT
