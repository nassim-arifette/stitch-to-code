# [PROJECT_NAME] — UI surfaces

**Mode:** Strict  
**Version:** [VERSION]  
**Updated:** [YYYY-MM-DD]  
**Active Stitch project:** [STITCH_PROJECT_TITLE] — [STITCH_PROJECT_ID]

This file owns **per-surface product scope and progress**. Stitch identity/provenance belongs in `.stitch/metadata.json`; reusable decisions belong in `UI_PATTERNS.md`.

## Surface kinds

- `PAGE` — navigable destination;
- `MODAL` — separate flow/contract worth tracking;
- `STATE` — complementary state of an existing surface;
- `SHARED_ACTION` — capability reused across surfaces;
- `TRANSVERSAL` — cross-route behavior;
- `FUTURE` — concept without confirmed product contract.

Do not inflate shipped page counts with states or future concepts.

## Independent statuses

- `design`: `MISSING | DRAFT | TEAM_REVIEW | APPROVED`
- `implementation`: `NOT_STARTED | IN_PROGRESS | IMPLEMENTED`
- `integration`: `MOCKED | PARTIAL | BACKEND_CONNECTED | NOT_APPLICABLE`
- `qa`: `NOT_RUN | PARTIAL | PASS | BLOCKED`

A Stitch generation is not automatically approved. Coded UI is not automatically integrated or QA-passed.

## Matrix

| UX ID | Kind | Surface | Route/trigger | Roles/capabilities | Product contracts | Stitch screenId | Patterns | Design | Implementation | Integration | QA | Blocker/exception |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `UX-[DOMAIN]-01` | `PAGE` | [PURPOSE] | `/route` | [ROLES] | [READS/MUTATIONS] | [SCREEN_ID] | [PATTERN_IDS] | `DRAFT` | `NOT_STARTED` | `PARTIAL` | `NOT_RUN` | [NONE/NOTE] |

## Surface detail

### UX-[DOMAIN]-01 — [NAME]

- **Entry:** [navigation / deep link / params]
- **Exit:** [destinations]
- **Roles/capabilities:** [authoritative capabilities]
- **Reads:** [contracts]
- **Mutations:** [contracts]
- **States:** [relevant states only]
- **Sensitive/exact data:** [rules]
- **Active Stitch screen:** [screenId]
- **Supplemental Stitch refs:** [responsive/a11y/variant IDs]
- **Patterns:** [IDs]
- **Product adaptations:** [material differences from Stitch and why]
- **Dependencies/blockers:** [backend/design/product]
- **QA evidence:** [date, commit, viewports, scenarios, commands/captures]

## System surfaces to consider when real

Examples, not mandatory requirements:

- unknown route / 404;
- denied access;
- session expiry;
- global offline/error behavior;
- authentication/recovery/MFA;
- support/help;
- notifications/preferences;
- query-string modes;
- logout/shared destructive actions.

Do not add one solely because this template mentions it.

## Future concepts

| ID | Concept | Proposed kind | Contract status | Stitch ref | Activation condition |
|---|---|---|---|---|---|
| `FUTURE-01` | [IDEA] | `FUTURE` | unconfirmed | [OPTIONAL] | [PRODUCT DECISION] |

## Review log

| Date | Scope reviewed | Orphan routes | Legacy Stitch refs | Status corrections | Decisions |
|---|---|---:|---:|---:|---|
| [YYYY-MM-DD] | [SCOPE] | [COUNT] | [COUNT] | [COUNT] | [NOTES] |
