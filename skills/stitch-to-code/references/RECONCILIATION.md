# Reconciliation examples

Use these examples when Stitch screens, `DESIGN.md`, and the product disagree. The source hierarchies and decision rules live in `SKILL.md`; this reference illustrates them rather than defining another algorithm.

## Working map

When `SKILL.md` calls for a map, keep it as temporary working state in Lite mode. Do not create one for a straightforward single-screen task just because this example exists.

| Surface | Canonical shell | Shared patterns | Local exceptions | Mock-only / unsupported | Responsive state |
| --- | --- | --- | --- | --- | --- |
| `/orders` | App shell A | page header, filters, table | bulk-select toolbar | export KPI | wide table / compact cards |
| `/orders/:id` | App shell A | page header, status badge | detail summary | demo notification | stacked below 720px |

A useful map has a row for every target surface and a decision for each meaningful contradiction. In audit mode these are review decisions, not permission to modify the implementation.

## Structured token vs one screenshot

`DESIGN.md` explicitly defines a 12px card radius. Four screens use 12px; one screenshot appears closer to 16px.

**Decision:** use 12px. The structured token and repeated pattern outrank the isolated anomaly. Do not average the values into a third pattern.

## Existing component is close but not exact

The repository already has a reusable `Button`, but its radius and icon family differ from the current design.

**Decision:** reuse/adapt it if it can satisfy the authoritative design without breaking unrelated consumers. If a variant is necessary, add the smallest coherent variant rather than a parallel button family.

## Unsupported control in an existing product

A screen shows an “Export CSV” button, but there is no route, permission, API, test, or working export behavior, and the task does not request a new export feature.

**Decision:** remove or recast the affordance instead of shipping an inert/fake export. A prototype may implement a real client-side download of local mock data if that fits its scope; do not imply backend permissions or persistence. A separately requested production export needs its own real implementation, not a fake success response.

## Visual sync must not rewrite working behavior

A new screen changes a destructive action's placement and styling. The app already has a permission check, confirmation, mutation, error handling, and audit event.

**Decision:** preserve the working behavior and safeguards. Sync its presentation unless an authoritative requirement explicitly changes the contract.

## Responsive disagreement

A desktop screen has a sidebar, a compact screen has bottom navigation, and an intermediate screenshot shows both accidentally.

**Decision:** derive the intended transition from current design material. Treat the isolated duplication as drift unless it is explicitly an intermediate state. Validate around the actual breakpoint.

## Accessibility conflicts with an explicit token

An explicit foreground/background pair fails the project's required contrast threshold.

**Decision:** follow the fidelity/accessibility rule in `SKILL.md`. For implementation with an explicit compliance requirement, apply the minimum necessary deviation and report it. Without that requirement, preserve the source and flag the conflict. During audit, report the proposed resolution without editing.

## Intentional exceptions

Keep variants justified by product meaning, state, platform, or responsive behavior: destructive vs primary actions, authenticated vs public shells, read-only permissions, and mobile information hierarchy. A one-off generated inconsistency alone is not grounds for a new component API.
