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

Call the Skill tool with "stitch-to-code", passing the operation, scope, and task context, and carry out the corresponding workflow. If the agent has no Skill tool, load the installed `stitch-to-code` skill through its supported skill-loading mechanism and follow it in the current task.

If `stitch-to-code` is missing, report that both skills must be installed; do not call `stitch` recursively or invent a replacement workflow.
