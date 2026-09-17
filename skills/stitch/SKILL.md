---
name: stitch
description: Implement, sync, or audit a Google Stitch design.
argument-hint: "implement|sync|audit [scope]"
disable-model-invocation: true
---

Interpret the user's first argument as one of:

- `implement` — implement the relevant current Stitch design.
- `sync` — sync an existing implementation with the current Stitch design.
- `audit` — audit the existing implementation against the current Stitch design without changing it.

Treat the remaining arguments as the requested scope; preserve any supplied references and constraints.

If no operation was provided, infer it from the user's request when obvious. Otherwise ask whether they want to implement, sync, or audit before doing work.

Delegate to the already-installed sibling skill `stitch-to-code`, passing the operation, scope, and current task context.

Only use the `stitch-to-code` skill installed from the same `nassim-arifette/stitch-to-code` bundle as this `stitch` entry point. Do not install, fetch, discover, or substitute another skill with the same name.

If the sibling `stitch-to-code` skill is unavailable, or its provenance cannot be established, stop and tell the user to install both `stitch` and `stitch-to-code` from `nassim-arifette/stitch-to-code`.

If the agent cannot delegate to another installed skill, tell the user to invoke the installed `stitch-to-code` skill directly. Do not load it from another source, call `stitch` recursively, or invent a replacement workflow.
