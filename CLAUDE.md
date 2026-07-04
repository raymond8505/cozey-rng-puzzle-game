# Punchcard (cozy-puzzle-rng)

Vite + React 19 + zustand + motion. Plain CSS in `src/ui/index.css` (BEM-ish class names, palette as `:root` custom properties). Tests are vitest + testing-library, colocated `*.test.tsx`.

## Drag & drop

Drop targets carry `data-drop` (`"cell:<n>"`, `"queue"`, `"slot"`); `src/ui/dnd/resolveDrop.ts` resolves a drop by scanning the **entire** `document.elementsFromPoint` stack for the attribute — not just the topmost element. Two consequences:

- **Forgiving hit areas are cheap:** an invisible pad at `z-index: -1` with `data-drop` enlarges a drop target without stealing clicks (click dispatch only hits the topmost element). Established pattern: `.card-slot-hitbox` in `CardSlot.tsx`.
- A target overlapped by another `data-drop` element loses to whichever is higher in the stack — stack order is the tiebreaker.
- **Drag-to-pry** (armed crowbar): placed tiles get HTML ghost `motion.div`s in `.pry-layer` (`Board.tsx`), dropped on `"window"` or `"queue"`. A queue drop reuses the normal pipeline — `playCrowbar` then `PARK` as two dispatches in `GameScreen.onPry` — no dedicated reducer action. The Queue strip must advertise `data-drop` during an armed pry explicitly; `canPark` alone only opens during routing.
- **Board overlay alignment invariant:** `.board-stage` is forced to the grid's exact aspect ratio with width AND height capped together (inline `aspect-ratio` + `maxWidth: calc(var(--board-stage-max-h) * ratio)`). Don't reintroduce a bare `max-height` on the frame — `aspect-ratio` governs the border box, so with border-box padding the svg letterboxes a few px and every percent-positioned HTML overlay skews.
- Motion CAN drag SVG elements (viewBox-scaled svgs need `MotionConfig transformPagePoint={transformViewBoxPoint(ref)}`, per motion.dev). The HTML ghost layer was chosen as the simpler, pattern-consistent route — not because SVG drag is impossible. (The `08735a0` commit message claims otherwise; it's wrong.)

## Conventions

- **Icons:** named SVG components in `src/ui/icons/`, re-exported from its `index.ts` barrel (this repo's equivalent of the system-wide `src/components/icons` rule). No inline SVG in feature components.
- **Fonts:** Caveat (handwritten accents, e.g. the card-slot post-it) loads via a Google Fonts `<link>` in `index.html` — deliberate choice over @fontsource: zero deps, falls back to system cursive offline. `font-family: "Caveat", "Segoe Print", cursive`.
- **Card plays are announced in the status window**, not on the card: the seated card back is intentionally blank, and tests guard that (`CardSlot.test.tsx` asserts an empty throat).
- The card-slot post-it note is a permanent fixture (rendered in both empty and seated states) — a taped-on note doesn't vanish.
- **Seated-card lifecycle** (`store.ts`): a card seats the moment it's played (crowbar seats at *arm* time), stays until a tile is chosen — except Reveal, which stays until the grab that fades the picture (the `DISMISS_REVEAL` that flips `revealActive` off; choosing a tile doesn't complete it). Only duds are on a timer (`NO_EFFECT_EJECT_MS`), guarded by a seat serial so a stale timeout can't evict a later card.
- **Player-facing copy says "tile", never "piece"** — code identifiers (`PieceId`, `PieceSprite`) keep "piece". Tiles are always *dragged*; clicks are for choices (draw, Second Look keep).
- `PieceView`'s inner `motion.g` pins `opacity` inline — state classes that fade the piece must sit on the OUTER `<g>` (`piece-dimmed`).
