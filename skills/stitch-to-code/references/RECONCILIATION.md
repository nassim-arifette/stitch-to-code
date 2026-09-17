# Reconciliation guide

Use this reference when multiple Stitch screens, `DESIGN.md`, and the existing product disagree. The goal is not to make every screen identical; it is to decide which differences are intentional and which are drift.

## Working map

Keep this as temporary working state in Lite mode:

| Surface | Canonical shell | Shared patterns | Local exceptions | Mock-only / unsupported | Responsive state |
| --- | --- | --- | --- | --- | --- |
| `/orders` | App shell A | page header, filters, table | bulk-select toolbar | export KPI | wide table / compact cards |
| `/orders/:id` | App shell A | page header, status badge | detail summary | demo notification | stacked below 720px |

A useful map is small but complete enough that every target surface has a row and every visible contradiction has a classification.

## Conflict algorithm

1. Identify the exact property or behavior that conflicts.
2. Decide whether the conflict is visual or behavioral; use the matching source-of-truth hierarchy from `SKILL.md`.
3. Check whether one screen is explicitly newer/canonical or whether the pattern repeats across several screens.
4. Classify the difference as intentional variant, product requirement, responsive state, mock-only content, or isolated drift.
5. Record the decision in the temporary map, then implement one coherent pattern.

Do not resolve a conflict by averaging values or inventing a third pattern unless the user/product requirement explicitly calls for a new one.

## Worked examples

### Structured token vs one screenshot

`DESIGN.md` defines `rounded.card: 12px`. Four screens use 12px; one screenshot appears closer to 16px.

**Decision:** use 12px. The structured token and repeated pattern outrank the isolated screenshot anomaly.

### Existing component is close but not exact

The repository already has a reusable `Button`, but its radius and icon family differ from the current Stitch design.

**Decision:** reuse/adapt the component if it can satisfy the higher-priority design source without breaking unrelated consumers. If a safe variant is needed, add the smallest coherent variant rather than creating a parallel button family.

### Unsupported control in an existing product

A Stitch screen shows an “Export CSV” button, but there is no route, permission, API, test, or working export behavior.

**Decision:** in existing-product mode, remove or recast the affordance instead of shipping an inert/fake export. In prototype mode, a client-only export may be implemented if the prototype intent justifies it, but it must not imply server-side persistence or permissions.

### Visual sync must not rewrite working behavior

A new Stitch screen changes the placement and styling of a destructive action. The existing app already has a permission check, confirmation flow, mutation, error handling, and audit event.

**Decision:** keep the working behavior and product safeguards. Sync the presentation around them unless the user/product spec explicitly changes the interaction contract.

### Responsive disagreement

A desktop screen uses a sidebar, a compact screen uses bottom navigation, and an intermediate screenshot accidentally shows both.

**Decision:** identify the intended transition from current design material/repeated patterns. Treat the one-off double navigation as drift unless explicitly defined as an intermediate state. Validate immediately below, at, and above the chosen breakpoint.

### Accessibility conflicts with an explicit visual token

A current explicit foreground/background token pair fails the project's required contrast threshold.

**Decision:** if accessibility/compliance is an explicit project requirement, make the minimum necessary token/application deviation and record it. Otherwise preserve the explicit source and flag the conflict; do not silently “improve” the design and lose source fidelity.

## What should remain an exception

Keep a local variant when the difference is explained by product meaning, state, platform, or responsive behavior. Examples include destructive vs primary actions, authenticated vs public shells, read-only permission states, and mobile information hierarchy.

Do not promote a one-off generated inconsistency into a reusable component API merely because it appears in one Stitch screen.
