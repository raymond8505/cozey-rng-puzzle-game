# Punchcard (cozy-puzzle-rng)

Vite + React 19 + zustand + motion. Plain CSS in `src/ui/index.css` (BEM-ish class names, palette as `:root` custom properties). Tests are vitest + testing-library, colocated `*.test.tsx`.

## Drag & drop

Drop targets carry `data-drop` (`"cell:<n>"`, `"queue"`, `"slot"`); `src/ui/dnd/resolveDrop.ts` resolves a drop by scanning the **entire** `document.elementsFromPoint` stack for the attribute — not just the topmost element. Two consequences:

- **Forgiving hit areas are cheap:** an invisible pad at `z-index: -1` with `data-drop` enlarges a drop target without stealing clicks (click dispatch only hits the topmost element). Established pattern: `.card-slot-hitbox` in `CardSlot.tsx`.
- A target overlapped by another `data-drop` element loses to whichever is higher in the stack — stack order is the tiebreaker.
- **Drag-to-pry** (armed crowbar): placed tiles get HTML ghost `motion.div`s in `.pry-layer` (`Board.tsx`), dropped on `"window"` or `"queue"`. A queue drop reuses the normal pipeline — `playCrowbar` then `PARK` as two dispatches in `GameScreen.onPry` — no dedicated reducer action. The parking tray (`ParkingArea` in `src/ui/machine/`) must advertise `data-drop` during an armed pry explicitly; `canPark` alone only opens during routing (pinned in `ParkingArea.test.tsx`).
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
- **Parking lives on the machine** (`ParkingArea` between window and card slot): parked tiles render littered via UI-only scatter poses (`src/ui/machine/scatter.ts` — 65–115° tumble, band-spread x). Pose data must never enter `GameState`. On the draggable, the tumble rides motion's `style={{ rotate }}` (motion owns `transform`); the scatter wrapper centers with negative margins, not `translate(-50%,-50%)`.

## Visual design: sun-faded lithographed tin toy

The machine is a rustic 50s retro-futuristic children's toy in lithographed tin. All texture is CSS gradients/box-shadows in `index.css` — no image assets, no decorative components.

- **Every painted color is muted** — "faded by time" is a user directive, not taste drift. New saturated hexes should be desaturated toward their bleached selves before landing. Palette semantics live in `:root` (`--litho-teal`, `--tin` = worn edges/disabled, `--chrome-hi`/`--chrome-lo` = bezel ring pair, `--rivet`, `--brass`).
- **Chrome bezels are outward box-shadow ring layers** (`0 0 0 2px var(--chrome-hi), 0 0 0 3px var(--chrome-lo)`). Any rule that overrides `box-shadow` on a beveled element — state classes (`.chosen`/`.awaiting`), every `@keyframes` frame, the reduced-motion override — must repeat the ring layers verbatim, or the bezel flickers off during the transition/pulse.
- **No hover effects on the puzzle grid** (user directive): a `.cell-drop` fill/opacity change on hover visibly tints the artwork under the overlay rect.
- **No decorative background art under the board svg**: backgrounds paint below children, so rivet dots on `.board-frame` pop in and out as tiles cover the corner cells. The chassis carries the rivet motif; the board frame keeps only the inset-shadow pinstripe (drawn at 5–6.5px, inside the 8px padding).
- **Lilita One** is the display face (title, draw button, compare captions) — single weight, must pair with `font-weight: 400` or browsers faux-bold it. Loaded from the same Google Fonts `<link>` as Caveat/IBM Plex Mono.
- The post-it stays deliberately off-palette (aged stationery, not machine paint); IBM Plex Mono stays — it's the period IBM voice for a game called Punchcard.
- Misplaced-tile rule nuance: no visual tell for *wrong* tiles (45f92bb), but a tile **overlapping** a neighbor casts `.piece-raised`'s seam shadow — physical plausibility, not a correctness hint (7a6aa83).
