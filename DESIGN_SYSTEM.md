# Design system

Source of truth is `frontend/src/index.css` (tokens at the top) and `frontend/tailwind.config.js` (which only maps Tailwind names onto those tokens). `frontend/tests/designTokens.test.js` enforces the rules marked ✔.

## Principles

Warm paper and espresso palette, Fraunces for identity and big numerals, Inter for controls, sentence-case copy, compact rows, restrained motion that always has a reduced-motion path. The Vest tracker keeps its own `--vt-*` palette and Barlow type.

## Tokens

| Group | Tokens | Rule |
| --- | --- | --- |
| Surface | `--paper`, `--surface`, `--surface-raised`, `--surface-muted`, `--field` | Use `surface-muted` for cards on paper. Don't invent new fills. |
| Text | `--text-primary`, `--text-secondary`, `--text-tertiary` (aliases `--ink`, `--ink-soft`, `--ink-faint`) | ✔ All meet 4.5:1 on surface, paper and surface-muted in both themes. |
| Accent | `--accent` (fills, bars, rings), `--accent-text` (any text) | ✔ `--accent` is not a text colour in light mode (≈3:1 on paper); use `--accent-text`. |
| Accent fill | `--accent-fill` + `--on-accent` | ✔ Filled accent buttons/chips use this pair (≥4.5:1). Never white on `--accent`: it is 3.3:1 in light and 2.5:1 in dark. |
| Fixed solids | `--on-solid` (white), `--cream`, `--scrim`, `--vp-*` | For text on fixed-hue solids (Vest red/green) and dark panels. Use `color-mix(in srgb, var(--cream) 14%, transparent)` rather than new `rgba()`. |
| Status | `--danger`, `--success`, `--warning`, `--focus` | ✔ 4.5:1 on surface. |
| Rating | `--score-low` … `--score-peak`, `--score-up/down` | ✔ 3:1 on surface as large text or graphics. Don't use for small text. |
| Type | `--font-display`, `--font-ui`, `--text-2xs/xs/sm/base/md/lg/xl` | Use the scale; avoid new `rem` sizes. |
| Space | `--space-1/2/3/4/6/8` | Prefer these in new CSS. |
| Radius | `--radius-xs/sm/md/lg/pill` | ✔ No raw `999px`. |
| Motion | `--dur-fast/base/slow`, `--ease-out`, `--ease-in`, `--ease-spring` | ✔ No raw `cubic-bezier()` outside the token block. Every animation needs a reduced-motion path; a global safety net at the end of the CSS neutralises anything missed. |
| Layers | `--z-fab/modal/help/nested/toast/celebrate` | Use these instead of numbers. |

Every colour token defined for light must exist for dark ✔.

## Audit (2026-10-15)

Fixed in this change:
- Light theme text failed AA: `--text-tertiary` 3.9:1, `--ink-faint` 4.4:1, accent text 2.95:1 on paper, `--score-mid` 2.2:1, `--score-good` 2.6:1. Darkened, and added `--accent-text`; 13 CSS and 3 Tailwind text uses moved to it.
- Radius tokens existed only for light mode; now shared. Added missing scales (type, space, motion, z-index, fonts).
- Replaced one-off easings (5 different curves), pill radii (16×), Fraunces stacks (20 spellings) and common font sizes with tokens.
- Removed the unused `cream`, `espresso` and `copper` Tailwind palettes.
- Added a global reduced-motion safety net (previously 8 hand-written blocks).
- Added token tests (theme parity, contrast, no regressions).

Remaining, in rough priority order:
1. 77 distinct `font-size` values; snap `.7/.85/.95rem` and the fractional `rem` sizes to the scale.
2. 82 hex/`rgba()` literals remain (was 129): Vest palette variants, shadows, and the legacy stone-grey map gradients. Move shadows to `--shadow-*` tokens and retire the stone gradients.
3. ~179 one-off spacing declarations: adopt `--space-*` as files are touched.
4. Radius: 26 distinct values (`2px`–`12px`, `50%`); map to `--radius-xs/sm/md`.
5. Mixed styling: components mix Tailwind utilities and BEM-ish classes for the same patterns (card, chip, button). Extract `.surface-card`, `.chip` and one button set (`btn-primary/secondary/ghost`) and use them in the fun-stats, awards and modal code.
6. 17 `!important` uses, mostly Tailwind overrides.
7. Vest and journal share a shell but not a spacing/type scale; align when the Vest page is next reworked.
