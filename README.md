# Stitch to Code

**Stitch to Code is an Agent Skill for coding agents such as Claude Code and Codex.**

It helps when you have several Google Stitch screens and want the agent to turn them into one coherent app without quietly changing the design or treating every generated screen as a separate truth.

> Unofficial community project. Not affiliated with or endorsed by Google.

## Contents

- [Why use it?](#why-use-it)
- [What it tells the agent to do](#what-it-tells-the-agent-to-do)
- [Install](#install)
- [Use it](#use-it)
- [Lite and Strict](#lite-and-strict)
- [Accessibility](#accessibility)
- [First test](#first-test)
- [Repository](#repository)

## Why use it?

Stitch can make very good individual screens, but a multi-screen project can drift.

One page may use a different header, navigation, card style, search placement, spacing, breakpoint, or even a noticeably different visual language. Then the coding agent can make the problem worse by implementing every screen literally instead of understanding which parts are supposed to stay consistent.

There is also a second kind of drift: Stitch may clearly choose a font, an icon family, exact colors, radii, or assets, and the coding agent silently swaps them for whatever it normally uses.

And mockups naturally contain illustrative content. A KPI, Export button, avatar, notification, or filter in a generated screen is not automatically a real product feature.

Stitch to Code gives the agent one simple idea:

> **Copy deliberate design decisions exactly. Reconcile accidental inconsistencies. Do not invent the product from the mockup.**

## What it tells the agent to do

- Use the **exact font, icon family, icon variants/glyphs, tokens, spacing, radii, breakpoints, and supplied assets** chosen by Stitch when they are defined.
- Look at the relevant screens **together**, not as unrelated mockups.
- Keep intentional variants, but normalize accidental cross-screen inconsistencies.
- Reuse existing components when they already represent the right pattern.
- Check what the real product actually supports before turning mockup content into functionality.
- Never leave controls that look interactive but do nothing.
- Check accessibility in the actual implementation: keyboard, focus, semantics, labels, contrast, and responsive behavior.
- Validate the coded app in a real browser instead of assuming that matching a screenshot means the work is finished.

The skill does **not** impose a specific font or icon library. If one Stitch project uses Hanken Grotesk + Material Symbols and another uses Geist + Phosphor, the agent should follow the active project.

## Install

Repository: `nassim-arifette/stitch-to-code`

```bash
npx skills add nassim-arifette/stitch-to-code
```

Or install only this skill for Codex:

```bash
npx skills add nassim-arifette/stitch-to-code \
  --skill stitch-to-code \
  --agent codex \
  --copy
```

Manual project install also works by copying:

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

For most projects, there is no setup beyond installing the skill.

A prompt can be as simple as:

```text
Implement these Stitch screens using Stitch to Code.
Use the current Stitch project and DESIGN.md, reconcile inconsistencies across screens,
and validate the result in the browser.
```

The agent should use the Stitch `DESIGN.md` produced by the Stitch workflow. Stitch to Code does **not** replace it with its own generic design system.

## Lite and Strict

### Lite — default

This is what most people should use.

```text
my-app/
├── .stitch/
│   └── DESIGN.md
├── src/
└── ...
```

No extra Stitch to Code metadata. No Python command. No registry to maintain.

The agent works from the Stitch references plus the repository itself: existing components, routes, product docs, schemas/API clients when relevant, tests, and code.

### Strict — optional

Strict is only for projects where explicit tracking is genuinely useful: many screens, several contributors, important permissions/actions, sensitive data, or a long Stitch history.

It can add:

```text
.stitch/metadata.json
docs/ui/UI_PATTERNS.md
docs/ui/UI_SURFACES.md
```

The bundled Python scripts only help initialize and validate this optional Strict state. They are not required for Lite or for the skill itself.

See [`STRICT_MODE.md`](skills/stitch-to-code/references/STRICT_MODE.md) if you need it.

## Accessibility

Stitch to Code treats accessibility as part of implementation quality, not as something a screenshot can prove. The coded app should be checked for keyboard navigation, visible focus, semantics, labels, contrast, responsive behavior, dialogs/drawers, and other relevant accessibility concerns.

## First test

I ran a first blinded A/B test on one frozen multi-screen Stitch project using Codex with `xhigh` reasoning. Both runs started from the same fixture and used the same implementation prompt; one had Stitch to Code installed.

| Category | Baseline | Stitch to Code |
| --- | ---: | ---: |
| Visual fidelity | 5/12 | 8/12 |
| Cross-screen consistency | 11/12 | 11/12 |
| Product truth | 19/20 | 20/20 |
| Responsive | 3/4 | 3/4 |
| Accessibility | 4/8 | 7/8 |
| **Total** | **42/56 (75.0%)** | **49/56 (87.5%)** |

The clearest improvement was in the exact things that motivated the skill: font/icon fidelity and accessibility. The skill-assisted run was not better at everything; it also introduced an oversized desktop modal and switched to the full sidebar too early.

This is **one case study, not a universal benchmark claim**. The current skill also contains small fixes made after reviewing that run.

See [`example/`](example/) for the short write-up and visual comparisons.

## Repository

```text
stitch-to-code/
├── README.md
├── LICENSE
├── skills/
│   └── stitch-to-code/
│       ├── SKILL.md
│       ├── references/
│       │   ├── QA.md
│       │   └── STRICT_MODE.md
│       ├── assets/templates/
│       └── scripts/
└── example/
    ├── README.md
    └── images/
```

That's intentionally about it. The default experience is the skill itself; the rest is optional supporting material.
