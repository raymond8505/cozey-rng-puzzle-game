# PUNCHCARD (working title)

A cozy, mobile-first browser jigsaw game. Draw pieces from a slot-machine
"Machine" (shaped by punch cards), route them through a small parking queue, and
complete the picture. No fail state, no timers — the only time pressure is how
fast the Machine cycles.

## Stack

Vite + React + TypeScript (strict) · SVG board/pieces · Motion (framer-motion) ·
Zustand · Vitest. Package manager: **yarn**.

## Getting started

```bash
yarn install
yarn dev      # http://localhost:5173
yarn test     # Vitest — pure game-core rules
yarn build    # strict tsc + production build
yarn lint
```

Append `?seed=<anything>` to the URL for a reproducible run (same seed ⇒ same
piece geometry and same Machine sequence).

## Architecture

- **`src/game/` — pure, seeded game core. Zero React imports.** Types, reducer
  `(GameState, GameAction) → GameState`, selectors, seeded RNG (mulberry32),
  jigsaw geometry. It is the single authority for the rules; the UI only
  dispatches actions and reads selectors. Fully unit-tested here.
- **`src/ui/`** — presentation. Board/Machine/Queue/Hand/Card/EndScreen etc.,
  one component per file, over a Zustand store wrapping the reducer.
- **`src/config/game.config.ts`** — the single source of truth for every
  tunable. Changing `board.cols`/`board.rows` needs zero code changes:
  geometry, layout, and queue capacity all follow (verified at 4×3, 6×4, 8×6).

### Determinism

The RNG is consumed **only at init** (piece edges, pool order, deck order).
During play the Machine just moves a cursor over the fixed pool order, so a run
is fully reproducible from its seed and the reducer is timer-free and testable.

## Rule ambiguities resolved (for review)

1. **A turn is *one of* two actions** (Draw *or* Place-from-queue), not Action A
   then an optional Action B. Turns end automatically after routing.
2. **Crowbar is the turn's one card** — playing it consumes the card slot and
   routes the lifted piece as that turn's action (no extra card, no draw).
3. **Card play is tied to the Draw action** → playing a card makes Action B
   (place-from-queue) illegal for that turn. One guard flips this if the
   intended reading is "one card anywhere in the turn."
4. **Crowbar returning a piece to its original cell is permitted** and counts as
   a placement (draws a card). Flagged as a possible free-card exploit; guard is
   a one-liner if designers want it forbidden.
5. **Second Look at exactly 2 pieces is allowed** (no-effect only at ≤1).

Full-queue force is computed at held-creation time for both draw and crowbar
origins. The full-queue swap is exposed as: drag the **held** piece to a cell to
place it, or drag a **queued** piece to a cell to place that one (the held piece
takes its slot).

## Balance observations (pillar #2 — both actions stay live)

Both branches remain reasonable in play: placements are the only card income, so
hoarding into the queue starves the hand, which keeps "just place and bank a
card" attractive; meanwhile filters/Second Look/Governor make "spend a card to
improve the draw" worthwhile when you need a specific piece. Spin speeds
(`machine.*Ms`), queue ratio, and deck composition are all in config and are
expected to be tuned during playtesting.

## Not in scope (per the slice brief)

Meta-progression, card unlocks, rarity effects, multiple puzzles, sharing
backend, accounts, persistence, sound, solvability analysis. Image export is a
noted stretch goal and is not built.
