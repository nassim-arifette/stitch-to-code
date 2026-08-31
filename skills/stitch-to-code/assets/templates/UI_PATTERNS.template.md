# [PROJECT_NAME] — Reusable UI patterns

**Mode:** Strict  
**Version:** [VERSION]  
**Updated:** [YYYY-MM-DD]

This file owns reusable **product UI behavior**. Visual token values belong in `.stitch/DESIGN.md`. Per-surface exceptions and progress belong in `UI_SURFACES.md`.

## Promotion rule

- Reuse an existing semantic role before creating a variant.
- Keep one-off compositions feature-local.
- Promote only after real consumers prove a stable shared role.
- Record meaningful anatomy, responsive behavior, states, accessibility, and implementation location.
- Keep local exceptions in `UI_SURFACES.md`.

## Registry

| ID | Role | Canonical decision | Responsive | States / accessibility | Implementation | Consumers |
|---|---|---|---|---|---|---|
| `UI-SHELL-01` | Authenticated shell | [INVARIANTS] | [RULE] | [LANDMARKS/FOCUS] | [PATH] | [SURFACES] |
| `UI-NAV-01` | Navigation | [ORDER/ROLE/ACTIVE] | [RULE] | [KEYBOARD/LABELS] | [PATH] | [SURFACES] |
| `UI-HEADER-01` | Page header | [H1/ACTIONS] | [RULE] | [SEMANTICS] | [PATH] | [SURFACES] |
| `UI-PANEL-01` | Main panel | [ANATOMY] | [RULE] | [REGION/LABEL] | [PATH] | [SURFACES] |
| `UI-SEARCH-01` | Search/filters | [PLACEMENT/BEHAVIOR] | [RULE] | [LABELS] | [PATH] | [SURFACES] |
| `UI-PAGE-01` | Pagination | [PAGE SIZE/CONTROLS/TOTAL] | [RULE] | [LABELS/TARGETS] | [PATH] | [SURFACES] |
| `UI-LIST-01` | Wide list -> compact view | [DATA PRIORITY] | [RULE] | [SEMANTICS] | [PATH] | [SURFACES] |
| `UI-FORM-01` | Forms | [LABEL/HELP/ERROR/ACTIONS] | [RULE] | [FOCUS/ANNOUNCEMENT] | [PATH] | [SURFACES] |
| `UI-DIALOG-01` | Dialog/drawer | [ANATOMY] | [RULE] | [TRAP/RESTORE/ESC] | [PATH] | [SURFACES] |
| `UI-STATE-01` | Operational states | [LOADING/EMPTY/ERROR/etc.] | [RULE] | [ANNOUNCEMENT] | [PATH] | [SURFACES] |

Delete unused rows. Do not keep speculative patterns.

## Pattern detail

### [PATTERN_ID] — [NAME]

- **Role:** [WHY THIS EXISTS]
- **Anatomy:** [PARTS]
- **Stable API/contract:** [PROPS OR BEHAVIOR]
- **Allowed variants:** [VARIANTS]
- **States:** [DEFAULT/HOVER/FOCUS/PRESSED/DISABLED/LOADING/ERROR]
- **Responsive:** [RULES]
- **Accessibility:** [SEMANTICS/KEYBOARD/ANNOUNCEMENTS]
- **Implementation:** [PATH]
- **Consumers:** [SURFACE IDS]
- **Known exceptions:** [SURFACE IDS + REASON]
- **Stitch reference (optional):** [SCREEN ID]

## Change log

| Date | Pattern | Change | Reason | Migrated surfaces | Remaining |
|---|---|---|---|---|---|
| [YYYY-MM-DD] | [ID] | [CHANGE] | [WHY] | [LIST] | [LIST] |
