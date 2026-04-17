# Theme Specs — Figma → TypeScript

Design-token source of truth. Current values below mirror `src/ui/theme.ts`. When the Figma design ships, overwrite these rows; long-term we can add a codegen step that regenerates `theme.ts` from this file.

## Colours

| Token | Hex | Usage |
|-------|-----|-------|
| `background`     | `#0f1117` | Root view, splash |
| `surface`        | `#1a1d27` | Card / input background |
| `surfaceLight`   | `#252836` | Elevated surface, chips |
| `primary`        | `#608bdb` | Primary actions, accent |
| `primaryLight`   | `#7ea3e8` | Pressed / hover state |
| `text`           | `#f4f7ff` | Primary text |
| `textSecondary`  | `#8b92a8` | Hints, metadata |
| `border`         | `#2a2d3a` | Dividers, outlines |
| `red`            | `#e06c75` | Destructive / error |
| `green`          | `#98c379` | Success / saved |
| `yellow`         | `#e5c07b` | Warning |
| `blue`           | `#61afef` | Info / link |
| `purple`         | `#c678dd` | Learning scope accent |

## Typography

System fonts only in v1.0 — no custom family. Monospace is reserved for code and model-id fields.

| Token | px | Weight | Usage |
|-------|-----|--------|-------|
| `fontSize.sm`  | `12` | 400 | Small labels, hints |
| `fontSize.md`  | `14` | 400 | Body default |
| `fontSize.lg`  | `16` | 500–600 | Subtitles, card titles |
| `fontSize.xl`  | `20` | 700 | Section titles |
| `fontSize.xxl` | `24` | 700 | Screen titles |

## Spacing

Used for flexbox `gap`, `padding`, and `margin` values.

| Token | px |
|-------|-----|
| `spacing.xs` | `4` |
| `spacing.sm` | `8` |
| `spacing.md` | `16` |
| `spacing.lg` | `24` |
| `spacing.xl` | `32` |

## Radii

Not yet promoted into `theme.ts` — add an `export const radius = { … } as const` block when we commit to these.

| Token | px |
|-------|-----|
| `radius.sm`   | `6`  |
| `radius.md`   | `8`  |
| `radius.lg`   | `12` |
| `radius.pill` | `28` |

## Elevation / opacity

| Token | Value | Notes |
|-------|-------|-------|
| `shadow.card`      | `{ offset: {0,2}, opacity: 0.25, radius: 4, elevation: 4 }` | Used on cards |
| `opacity.disabled` | `0.5` | Disabled pressables |
| `opacity.overlay`  | `0.6` | Modal backdrops |

## Migration plan

Once Figma locks values:

1. Update the tables above to the final palette.
2. `scripts/codegen-theme.js` (to write) reads this markdown (or a structured JSON sibling) and regenerates `src/ui/theme.ts` with strict `as const` typing.
3. Add a CI check: `grep -rE "#[0-9a-fA-F]{6}" src/ app/ | grep -v theme.ts` must return empty. Hardcoded hex outside `theme.ts` fails the build.
