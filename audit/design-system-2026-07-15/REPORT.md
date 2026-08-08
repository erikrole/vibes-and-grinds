# Vibes & Grinds design-system audit

## Scope

Current desktop journal, dark and light themes, visit detail, and add-visit flow at 1308 × 1155 using production data through the read-only local preview.

## Verdict

The product has a recognizable editorial identity, but it does not yet have a sufficiently enforced design system. The largest problems are semantic color drift, too many component-specific styling paths, unclear typography roles, and a form organized around database fields instead of the act of logging a visit.

## Evidence

1. `01-journal.png`: Light journal. Healthy foundation, uneven surface hierarchy.
2. `02-journal-dark.png`: Dark journal. Strongest current expression of the brand.
3. `03-add-visit.png`: Add-visit flow. Needs structural redesign.
4. Visit detail was inspected live. Its saved capture had a transparency/compositing defect, so it is not accepted as screenshot evidence. The map identity finding is also supported by the current location data contract in source.

## Highest-impact findings

### 1. Color system

- Preserve the warm paper and espresso direction. It is distinctive and appropriate.
- Replace raw Tailwind stone colors and one-off hex values with semantic tokens for canvas, surface, raised surface, field, border, primary text, secondary text, accent, success, warning, and destructive states.
- Define light and dark values for the same semantic roles. Light mode should not be a pale approximation of dark mode.
- Give score colors discrete semantic bands and contrast-tested foreground/background pairs. The current interpolated ramp often makes different scores look nearly identical.
- Remove component-local theme styling where a semantic token already exists.

### 2. Typography system

- Keep Fraunces for brand, shop names, major metrics, and editorial moments.
- Keep Inter for controls, metadata, labels, and prose.
- Create named roles instead of repeating inline font declarations: display, page title, section title, card title, metric, body, metadata, label, and button.
- Stop using Fraunces for every number and heading. Its frequency currently flattens hierarchy and makes dense operational screens feel decorative.
- Keep Vest Tracker's Barlow/mono family isolated behind its own mode namespace.

### 3. Component system

- Standardize three radii, three surface elevations, field height, focus ring, icon-button size, and spacing scale.
- Replace mixed Tailwind color utilities plus CSS variables with one styling path for Coffee surfaces.
- Build shared primitives for Button, IconButton, Field, Select, Surface, Modal, Score, and Empty/Error states.
- Delete dead or superseded selectors after migration, including the old detail location/map styles.

### 4. Add-visit flow

- Rebuild around three human tasks: `Where did you stop?`, `What did AJ order?`, and `How was it?`.
- Make Coffee Shop the first field and let Places fill city, address, and coordinates. Hide address unless lookup fails or the user asks to edit it.
- Show sport and opponent together as optional trip context, not equal-weight primary fields.
- Use explicit rating controls with visible selected values, keyboard behavior, and clear low/high anchors.
- Turn photo and note into a compact memory step after ratings.
- Keep the primary action visible in a sticky footer and show validation beside the relevant field.
- A single desktop sheet is acceptable, but it should read as a short sequence, not a database record editor.

### 5. Maps identity

- Coordinates and a name can open Maps.app to a pin, but they cannot guarantee the canonical Apple Maps place page.
- Store a provider-neutral location record plus canonical provider identifiers/URLs. Keep the existing Google Place ID and add an Apple Maps place ID or canonical Apple Maps place URL when resolved.
- Until that data exists, label the action honestly as opening the location in Maps rather than implying a verified place page.

## Accessibility risks

- Small uppercase labels and muted placeholder text are likely contrast risks, especially in dark fields.
- Some controls communicate state mainly through a thin accent line.
- Rating inputs need a keyboard and screen-reader review after redesign.
- Focus indication is inconsistent between native controls, Tailwind-styled controls, and custom links.
- Screenshot evidence cannot confirm zoom reflow, reduced motion, screen-reader output, or complete keyboard order.

## Recommended order

1. Establish semantic color, typography, spacing, radius, and focus tokens.
2. Migrate the journal and visit detail to those tokens.
3. Rebuild Add Visit using shared field, rating, photo, and modal primitives.
4. Add the canonical location identity needed for Apple Maps place pages.
5. Run keyboard, contrast, mobile reflow, and reduced-motion verification.
