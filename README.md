# Stitch to Code

[![skills.sh](https://skills.sh/b/nassim-arifette/stitch-to-code)](https://skills.sh/nassim-arifette/stitch-to-code)

**Turn Google Stitch designs into coherent, working applications.**

Stitch can generate great individual screens. A real application is more than a collection of screens.

Across a project, navigation can drift, shared components can become slightly different, responsive states can disagree, and coding agents can substitute fonts, icons, or behavior that the design never intended.

**Stitch to Code is a design-to-code skill that reconciles those differences before and during implementation.**

It helps coding agents turn Stitch designs into one coherent application by preserving deliberate design choices, normalizing accidental drift, reusing shared patterns, grounding interactions in the real product, and validating the rendered result in the browser.

Framework-agnostic. Designed for coding agents such as Codex and Claude Code.

## Installation (30-second setup)

Stitch to Code ships as two skills that work together:

- **`stitch`** — the short, human-invoked entry point for `implement`, `sync`, and `audit`;
- **`stitch-to-code`** — the model-invoked design-to-code workflow that does the actual reconciliation, implementation, and validation.

Install both. The `stitch` entry point delegates to `stitch-to-code`.

<details open>
<summary><strong>Codex</strong></summary>

```bash
npx skills@latest add nassim-arifette/stitch-to-code \
  --skill stitch \
  --skill stitch-to-code \
  --agent codex
```

Then invoke it explicitly with commands such as:

```text
$stitch implement
$stitch sync
$stitch audit
```

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
npx skills@latest add nassim-arifette/stitch-to-code \
  --skill stitch \
  --skill stitch-to-code \
  --agent claude-code
```

Then invoke it explicitly with commands such as:

```text
/stitch implement
/stitch sync
/stitch audit
```

</details>

<details>
<summary><strong>Other supported agents</strong></summary>

Use the skills installer and select the agent you want to install to:

```bash
npx skills@latest add nassim-arifette/stitch-to-code \
  --skill stitch \
  --skill stitch-to-code
```

The installer supports many coding agents. Explicit command syntax varies by agent, while `stitch-to-code` can still be used automatically when the agent supports model-invoked skills.

</details>

<details>
<summary><strong>Manual installation</strong></summary>

Copy both skill folders into your agent's skills directory:

```text
skills/stitch/
skills/stitch-to-code/
```

Do not install only `stitch`: it is intentionally a thin entry point and expects `stitch-to-code` to be available.

</details>

## Use it

| Task | Claude Code | Codex |
| --- | --- | --- |
| Implement a design | `/stitch implement` | `$stitch implement` |
| Sync a design update | `/stitch sync` | `$stitch sync` |
| Audit without changing code | `/stitch audit` | `$stitch audit` |

Add a scope when needed:

```text
/stitch implement dashboard and billing
/stitch audit /dashboard
```

Use `$stitch` for the same examples in Codex. With no operation, the skill infers one only when your intent is clear; otherwise it asks.

Natural-language requests work through the model-invocable `stitch-to-code` skill too:

```text
Sync this existing app with the current Stitch design using Stitch to Code.
Preserve the existing product behavior.
```

`stitch` is only the human-facing entry point. It delegates to `stitch-to-code`, which owns the design-to-code workflow. Audit reports findings and suggested fixes without applying changes.

## Why reconciliation matters

Design-to-code gets harder when a design project contains several screens.

Suppose three related screens use a `12px` card radius and one isolated screen appears to use `16px`. If the project's `DESIGN.md` also defines `12px`, copying every screen literally would turn one design inconsistency into a second component system in code.

The same problem exists with behavior. If a screen contains an `Export CSV` button but the existing product has no export API, permission, or working behavior, the mockup alone is not a request to invent a production feature.

**Design sources answer what the application should look like. Product sources answer what it should actually do.**

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

The agent first discovers the relevant design and product context. **Reconcile** treats that material as one system. **Implement** preserves intentional design decisions while integrating real components and behavior. **Validate** checks the rendered result, not just the source.

Single-screen work stays lightweight. Multi-screen projects and conflicting sources need explicit reconciliation decisions. Audit follows the same discovery and review discipline but skips implementation and returns findings instead.

## Where Stitch context comes from

The context can come from the current task, a live project through Stitch MCP, `.stitch/DESIGN.md`, stored project/screen IDs, repository-linked artifacts, or exported Stitch screenshots and HTML.

When that context is discoverable, you do not need to repeat IDs or paths. The agent resolves which sources are relevant and authoritative; it asks when project identity is genuinely ambiguous and reports unavailable references instead of guessing. MCP is not required when suitable exports are already available.

## Product-aware design-to-code

**Existing product integration** preserves routes, APIs, permissions, contracts, and working behavior. Mockup affordances are evidence of intent, not proof of capability.

**Greenfield prototype** can use local mock data and client-side interactions without pretending they are real backend or persisted behavior.

**Design sync** applies newer design material while preserving working behavior unless an authoritative requirement changes it. Syncing a prototype does not make its simulated features real.

The agent infers the appropriate mode from the task and repository when possible.

## Browser validation

For web work, the skill calls for checking the rendered application at the relevant reference sizes. When Playwright is already available, `audit-ui.mjs` collects viewport-sized screenshots and evidence for runtime errors, failed requests, horizontal overflow, and font loading. Axe findings are optional when `axe-core` is installed.

Run from the target application's root, using the installed skill's path:

```bash
node <skill-dir>/scripts/audit-ui.mjs \
  --url http://localhost:3000 \
  --routes /,/dashboard \
  --viewports 1440x900,390x844
```

The helper installs nothing. It does not replace visual comparison, interaction testing, or accessibility review. Missing browser access is reported as incomplete validation. See [QA.md](skills/stitch-to-code/references/QA.md) for the full procedure.

## Works with the Stitch ecosystem

Google's [Stitch skills](https://github.com/google-labs-code/stitch-skills) provide design retrieval, generation, design-system workflows, and framework-specific output. Stitch to Code complements them by reconciling those designs with the codebase they need to become part of.

It stays framework-agnostic and works with the repository's design system, components, and product constraints.

## Advanced

Most projects need no additional tracking files. Optional [Strict Mode](skills/stitch-to-code/references/STRICT_MODE.md) supports explicit screen history, provenance, and shared-pattern tracking.

See [RECONCILIATION.md](skills/stitch-to-code/references/RECONCILIATION.md) for worked conflict examples and [SKILL.md](skills/stitch-to-code/SKILL.md) for the agent's workflow.

## License

[MIT](LICENSE). Unofficial community project, not affiliated with or endorsed by Google.
