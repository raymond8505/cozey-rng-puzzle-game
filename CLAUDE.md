# Punchcard (cozy-puzzle-rng)

Vite + React 19 + zustand + motion. Plain CSS in `src/ui/index.css` (BEM-ish class names, palette as `:root` custom properties). Tests are vitest + testing-library, colocated `*.test.tsx`.

## Drag & drop

Drop targets carry `data-drop` (`"cell:<n>"`, `"queue"`, `"slot"`); `src/ui/dnd/resolveDrop.ts` resolves a drop by scanning the **entire** `document.elementsFromPoint` stack for the attribute — not just the topmost element. Two consequences:

- **Forgiving hit areas are cheap:** an invisible pad at `z-index: -1` with `data-drop` enlarges a drop target without stealing clicks (click dispatch only hits the topmost element). Established pattern: `.card-slot-hitbox` in `CardSlot.tsx`.
- A target overlapped by another `data-drop` element loses to whichever is higher in the stack — stack order is the tiebreaker.

## Conventions

- **Icons:** named SVG components in `src/ui/icons/`, re-exported from its `index.ts` barrel (this repo's equivalent of the system-wide `src/components/icons` rule). No inline SVG in feature components.
- **Fonts:** Caveat (handwritten accents, e.g. the card-slot post-it) loads via a Google Fonts `<link>` in `index.html` — deliberate choice over @fontsource: zero deps, falls back to system cursive offline. `font-family: "Caveat", "Segoe Print", cursive`.
- **Card plays are announced in the status window**, not on the card: the seated card back is intentionally blank, and tests guard that (`CardSlot.test.tsx` asserts an empty throat).
- The card-slot post-it note is a permanent fixture (rendered in both empty and seated states) — a taped-on note doesn't vanish.
