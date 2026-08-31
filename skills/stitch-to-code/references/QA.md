# QA checklist

Use this when the implementation is large enough that the short checklist in `SKILL.md` is not enough.

## Visual fidelity

- Confirm the actual loaded font family and required weights.
- Confirm the intended icon family, glyphs, variants, and states.
- Check important semantic colors/tokens rather than approximate lookalikes.
- Check spacing, radii, supplied assets, and component anatomy where Stitch defines them.
- Compare related screens together so a local Stitch inconsistency does not become a second component system.

## Responsive

Test around the **real design transitions**, ideally immediately below, at, and above important breakpoints.

Check:

- navigation changes;
- headers/actions;
- lists/tables/cards;
- forms and dialogs;
- overflow;
- long labels and truncation;
- information preserved between wide and compact layouts.

Do not replace an explicit Stitch/project breakpoint with a framework default just because it is familiar.

## Interactions

Exercise important actions in the rendered app.

- Buttons/links that look active must work.
- Unsupported mockup actions should not appear as real controls.
- Search/filter/pagination should affect the intended data.
- Dialogs/drawers should open, close, scroll, and restore focus correctly.
- Recoverable errors should not unnecessarily destroy user input.
- Mutations should not be double-submitted.

## Accessibility

Check the implementation itself:

- logical keyboard order;
- visible focus;
- accessible names for icon-only controls;
- labels and errors associated with fields;
- headings and landmarks;
- dialog focus trap/restore/Escape behavior;
- important information not communicated only by color;
- reasonable target sizes and contrast;
- zoom/long text not breaking critical content.

## Runtime

- No unexplained console/runtime errors.
- No missing fonts/assets/icons.
- No unintended horizontal scroll.
- Routes/deep links/reload work where expected.
- Loading, empty, error, denied, and success states exist where the product needs them.
- Run the repository's relevant typecheck, lint, tests, and build/export checks.
