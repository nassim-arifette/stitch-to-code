# Strict mode

Most projects do not need this. Use Lite unless explicit tracking solves a real problem.

Strict is useful when a project has many Stitch screens, multiple contributors/agents, long design history, important permissions/actions, sensitive/exact data, or QA that must be traceable.

## Files

Strict can add:

```text
.stitch/
├── DESIGN.md          # still owned by the Stitch design workflow
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

- `DESIGN.md`: visual system;
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

## Optional scripts

The scripts are helpers for this Strict state; they are not required to run the skill.

Initialize Strict files:

```bash
python skills/stitch-to-code/scripts/init_project.py --root . --mode strict
```

Validate deterministic state:

```bash
python skills/stitch-to-code/scripts/validate_project.py --root .
```

The validator checks things such as duplicate IDs, broken/cyclic `supersededBy` chains, missing artifacts, hashes, and incomplete Strict state.

Lite mode deliberately creates nothing.
