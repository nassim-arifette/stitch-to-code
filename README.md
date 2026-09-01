# Stitch to Code
[![skills.sh](https://skills.sh/b/nassim-arifette/stitch-to-code)](https://skills.sh/nassim-arifette/stitch-to-code)

Stitch to Code is a small Agent Skill for coding agents like Codex and Claude Code.

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

The skill uses the `DESIGN.md` produced by Stitch. It does not replace it with its own design system.

## What it tries to fix

There are a few problems I kept seeing when moving from Stitch to code.

Screens from the same project can disagree on things like navigation, headers, components, spacing, search placement, breakpoints, or responsive behavior. Sometimes the difference is minor. Sometimes one page looks like it came from a different version of the app.

Coding agents can also drift away from choices Stitch actually made. A project may specify a font, an icon family, exact colors, radii, breakpoints, or assets, and the agent may still substitute whatever it normally uses.

Mockups can also contain things that only exist to make the screen look realistic. A KPI, export button, avatar, notification, or filter should not automatically become a real product feature.

Stitch to Code gives the agent a few rules for dealing with that:

- use the exact font, icons, tokens, spacing, radii, breakpoints, and assets Stitch defines
- look at related screens together instead of treating each one as an isolated mockup
- keep intentional differences, but reconcile accidental inconsistencies
- reuse existing components when they already match the intended pattern
- check what the app actually supports before turning mockup content into functionality
- do not leave controls that look interactive but do nothing
- check keyboard use, focus, semantics, labels, contrast, and responsive behavior in the actual implementation
- run the app in a real browser before calling the work finished

The skill does not impose a font or icon library of its own. If one Stitch project uses Hanken Grotesk and Material Symbols while another uses Geist and Phosphor, the agent should follow the project it is working on.

## Optional strict mode

Most people do not need this.

The normal workflow does not add metadata files, registries, or Python setup to your project. The agent works from the Stitch references and the repo itself: existing components, routes, product docs, schemas or API clients when relevant, tests, and code.

For larger projects where you actually want explicit tracking, Strict mode can add:

```text
.stitch/metadata.json
docs/ui/UI_PATTERNS.md
docs/ui/UI_SURFACES.md
```

The bundled Python scripts only initialize and validate this optional state. They are not needed for the skill itself.

See [`STRICT_MODE.md`](skills/stitch-to-code/references/STRICT_MODE.md) for the details.

## First test

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

The skill run was not better at everything. It also introduced an oversized desktop modal and switched to the full sidebar too early. I kept those failures in the benchmark as well.

This is one small test, not a general claim about every Stitch project or every coding agent. My main reason for making the skill came from using this workflow on larger projects, where it helped me much more as inconsistencies accumulated across screens.

See [`example/`](example/) for the screenshots, prompts, and both implementations.

## License

MIT
