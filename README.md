# Stitch to Code

[![skills.sh](https://skills.sh/b/nassim-arifette/stitch-to-code)](https://skills.sh/nassim-arifette/stitch-to-code)

**Turn Google Stitch designs into coherent, working applications.**

Stitch can generate great individual screens. A real application is more than a collection of screens.

Across a project, navigation can drift, shared components can become slightly different, responsive states can disagree, and coding agents can substitute fonts, icons, or behavior that the design never intended.

**Stitch to Code is a design-to-code skill that reconciles those differences before and during implementation.**

It helps coding agents turn Stitch designs into one coherent application by preserving deliberate design choices, normalizing accidental drift, reusing shared patterns, grounding interactions in the real product, and validating the rendered result in the browser.

Framework-agnostic. Designed for coding agents such as Codex and Claude Code.

> Unofficial community project. Not affiliated with or endorsed by Google.

## Install

```bash
npx skills add nassim-arifette/stitch-to-code
```

For a specific agent:

```bash
# Codex
npx skills add nassim-arifette/stitch-to-code \
  --skill stitch-to-code \
  --agent codex \
  --copy

# Claude Code
npx skills add nassim-arifette/stitch-to-code \
  --skill stitch-to-code \
  --agent claude-code \
  --copy
```

You can also copy `skills/stitch-to-code/` into your agent's local skills directory.

## Use it

Once installed, ask the agent to implement, sync, or audit a Stitch design.

```text
Implement these Stitch screens using Stitch to Code.
```

```text
Sync this existing app with the latest Stitch design.
Preserve the existing product behavior.
```

```text
Audit the dashboard against the current Stitch design and DESIGN.md.
```

The skill resolves the relevant Stitch context and implementation mode from the task and repository when it can. You should not normally need to manually provide project IDs, screen IDs, or local paths unless the available sources are genuinely ambiguous.

## Why reconciliation matters

Design-to-code gets harder when a design project contains several screens.

Suppose three related Stitch screens use a `12px` card radius and one isolated screen appears to use `16px`. If the project's `DESIGN.md` also defines `12px`, copying every screen literally would turn one design inconsistency into a second component system in code.

The same problem exists with behavior. If a Stitch screen contains an `Export CSV` button but the existing product has no export API, route, permission, or working behavior, a production implementation should not invent that capability just because the mockup contains a button.

**Design sources answer what the application should look like. Product sources answer what it should actually do.**

Stitch to Code keeps those questions separate while turning the design into code.

## How it works

```text
        Google Stitch
             │
   screens / DESIGN.md
             │
             ▼
        RECONCILE ◀──── existing product
             │          routes / data / APIs
             │          components / behavior
             ▼
         IMPLEMENT
             │
             ▼
          VALIDATE
             │
             ▼
     working application
```

**Reconcile** means looking at the relevant design material as one system rather than treating every generated screen as independently canonical.

**Implement** means preserving intentional design decisions while mapping them onto the application's real components, data, routes, permissions, and supported interactions.

**Validate** means checking the rendered application, not just the source code.

For simple single-screen work, reconciliation can stay lightweight. For multi-screen projects, conflicting sources, or non-trivial normalization, the skill makes those decisions explicit before implementation.

## Where the Stitch context can come from

Stitch to Code does not require one particular handoff format. The relevant design context can come from a live Stitch project through Stitch MCP, `.stitch/DESIGN.md`, stored project or screen IDs, exported Stitch screenshots or HTML, repository-linked artifacts, or material supplied directly in the current task.

The skill uses the best available sources and determines which design material is authoritative when they disagree.

## Product-aware design-to-code

The same design-to-code rules do not fit every project.

**Existing product integration** preserves real routes, APIs, permissions, data contracts, and working behavior. Mockup affordances are evidence of design intent, not proof that a product capability exists.

**Greenfield prototype** can use local mock data and client-side interactions when appropriate, without pretending they are real backend or persisted behavior.

**Design sync** updates an existing implementation to newer Stitch material while preserving working product behavior unless an authoritative requirement explicitly changes it.

The skill infers the appropriate mode from the task and repository when possible.

## Browser validation

A correct implementation is more than code that compiles or resembles a screenshot.

For web work, Stitch to Code validates the rendered application at the relevant reference widths. When Playwright is already available in the target project, the included `scripts/audit-ui.mjs` helper can collect viewport-sized screenshots and deterministic evidence for runtime errors, failed requests, document-level horizontal overflow, and font loading. Optional accessibility findings are collected when `axe-core` is already installed.

```bash
node skills/stitch-to-code/scripts/audit-ui.mjs \
  --url http://localhost:3000 \
  --routes /,/dashboard \
  --viewports 1440x900,390x844
```

The helper does not install Playwright or axe. See [`QA.md`](skills/stitch-to-code/references/QA.md) for the full browser procedure.

## Works with the Stitch ecosystem

Stitch to Code complements Google's official Stitch tooling rather than replacing it.

Google's [`stitch-skills`](https://github.com/google-labs-code/stitch-skills) can retrieve and generate Stitch material, manage design artifacts, and produce framework-specific output. Stitch to Code focuses on the design-to-code step where those designs have to become one coherent application.

```text
Google Stitch
     │
     ▼
design context
     │
     ▼
STITCH TO CODE
reconcile + implement + validate
     │
     ▼
real application
```

It intentionally stays framework-agnostic and uses the design system, components, and product constraints of the repository it is working in.

## Advanced

Most projects need no Stitch to Code state beyond the installed skill itself.

For projects that need explicit screen history, provenance, or shared-pattern tracking, optional **Strict Mode** is available. See [`STRICT_MODE.md`](skills/stitch-to-code/references/STRICT_MODE.md).

For worked examples of source conflicts and normalization decisions, see [`RECONCILIATION.md`](skills/stitch-to-code/references/RECONCILIATION.md).

## License

MIT
