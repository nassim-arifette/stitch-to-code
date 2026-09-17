# Strict mode

Most projects do not need this. Use Lite unless explicit tracking solves a real problem.

Strict is useful when a project has many Stitch screens, multiple contributors/agents, long design history, important permissions/actions, sensitive/exact data, or QA that must be traceable.

## Files

Strict can add:

```text
.stitch/
├── DESIGN.md          # owned by the Stitch / DESIGN.md workflow, not this skill
├── metadata.json      # Stitch IDs and artifact provenance
└── designs/
    ├── source/
    ├── derived/
    └── qa/

docs/ui/
├── UI_PATTERNS.md     # reusable UI decisions
└── UI_SURFACES.md     # per-surface product/implementation/QA state
```

Keep one kind of truth in one place:

- `DESIGN.md`: visual system/source context;
- `metadata.json`: project/screen IDs, supersession, artifact provenance/hashes;
- `UI_PATTERNS.md`: decisions shared by several surfaces;
- `UI_SURFACES.md`: per-surface requirements, exceptions, implementation/integration/QA state.

Do not duplicate editable implementation or QA statuses inside metadata.

## Screen references

Prefer stable `projectId` / `screenId` values over titles.

Useful reference kinds include:

- `CANONICAL`
- `RESPONSIVE_STATE`
- `ACCESSIBILITY_AUDIT`
- `VARIANT`
- `SUPERSEDED`
- `FUTURE_NO_CONTRACT`

When a tracked screen is replaced, keep the old reference as `SUPERSEDED` and point it to the replacement rather than silently rewriting history.

## Shared patterns

Promote a local component/pattern only when there are real convergent consumers. Record the role, main anatomy, responsive behavior, states/accessibility, implementation path, consumers, and justified exceptions.

Do not create parallel Button/Header/Card/Modal/Pagination families just because different Stitch screens happened to render them differently.

## Validation tools

The Python helpers validate **Stitch to Code-owned Strict state**. They do not reimplement Google's `DESIGN.md` specification.

Initialize Strict files:

```bash
python skills/stitch-to-code/scripts/init_project.py --root . --mode strict
```

Validate Strict tracking state:

```bash
python skills/stitch-to-code/scripts/validate_project.py --root .
```

The validator checks things such as incomplete Strict state, duplicate IDs, broken/cyclic `supersededBy` chains, missing tracked artifacts, hashes, and unresolved Strict template placeholders.

Validate the Stitch/Google design file separately with the official linter when available:

```bash
npx @google/design.md lint .stitch/DESIGN.md
```

Browser evidence is independent of Strict mode. Use `scripts/audit-ui.mjs` in both Lite and Strict when Playwright is already available in the target project.

Lite mode deliberately creates no Stitch to Code tracking state.
