// Pure derived state. The UI reads these instead of replicating rule logic, so
// the reducer stays the single source of truth for legality.

import type { GameState, CellIndex, PieceId } from "./types";
import { asCellIndex } from "./types";
import { orthNeighbors } from "./grid";

export const gridDims = (s: GameState) => ({
  cols: s.config.board.cols,
  rows: s.config.board.rows,
});

export const cellCount = (s: GameState): number =>
  s.config.board.cols * s.config.board.rows;

export const queueCapacity = (s: GameState): number =>
  Math.floor(s.config.queue.capacityRatio * cellCount(s));

export const isQueueFull = (s: GameState): boolean =>
  s.queue.length >= queueCapacity(s);

export function emptyCells(s: GameState): CellIndex[] {
  const out: CellIndex[] = [];
  for (let i = 0; i < s.board.length; i++) {
    if (s.board[i] === null) out.push(asCellIndex(i));
  }
  return out;
}

/** The ordered pool pieces the Machine is currently cycling, after any active
 *  one-draw filter. Never empty while the pool is nonempty: a filter that
 *  matches nothing is never applied (resolveCard no-effects it instead). */
export function displayedSequence(s: GameState): readonly PieceId[] {
  switch (s.machine.filter.kind) {
    case "edge":
      return s.pool.filter((id) => s.pieces[id].edgeClass !== "interior");
    case "neighbor":
      return s.pool.filter((id) =>
        orthNeighbors(s.pieces[id].home, gridDims(s)).some(
          (n) => s.board[n] !== null,
        ),
      );
    case "none":
    default:
      return s.pool;
  }
}

/** The piece captured if DRAW is pressed right now, or null if pool is empty. */
export function currentDisplayedPiece(s: GameState): PieceId | null {
  const seq = displayedSequence(s);
  if (seq.length === 0) return null;
  return seq[s.machine.displayIndex % seq.length];
}

/** Effective cycle speed: Governor's comfortable override, else the base. */
export const machineSpeedMs = (s: GameState): number =>
  s.machine.governorActive
    ? s.config.machine.comfortableMs
    : s.machine.baseSpeedMs;

/** True when the piece on `cell` is misplaced AND borders a filled cell — i.e.
 *  it overlaps a neighbor and should render raised (casting a seam shadow). A
 *  correct placement, an empty cell, or a lone misplaced piece is not. */
export function isOverlappingPlacement(s: GameState, cell: CellIndex): boolean {
  const occupant = s.board[cell];
  if (occupant === null || s.pieces[occupant].home === cell) return false;
  return orthNeighbors(cell, gridDims(s)).some((n) => s.board[n] !== null);
}

export const isGameOver = (s: GameState): boolean =>
  s.pool.length === 0 &&
  s.queue.length === 0 &&
  s.held === null &&
  s.board.every((c) => c !== null);

/** Correctly-homed pieces / total, as a percentage in [0, 100]. */
export function completeness(s: GameState): number {
  const total = cellCount(s);
  let correct = 0;
  for (let cell = 0; cell < s.board.length; cell++) {
    const occupant = s.board[cell];
    if (occupant !== null && s.pieces[occupant].home === cell) correct++;
  }
  return (correct / total) * 100;
}

export function scoreTier(s: GameState): { min: number; slogan: string } {
  const pct = completeness(s);
  // tiers are ordered high→low in config; first satisfied wins.
  for (const tier of s.config.scoring.tiers) {
    if (pct >= tier.min) return tier;
  }
  // config always includes a min:0 tier, so this is unreachable.
  return { min: 0, slogan: "" };
}

export interface LegalActions {
  readonly canPlayCard: boolean;
  readonly canPlayCrowbar: boolean;
  readonly canDraw: boolean;
  readonly canPlace: boolean;
  readonly canPark: boolean;
  readonly mustSwapOrPlace: boolean;
  readonly canPlaceFromQueue: boolean;
  readonly canSecondLookKeep: boolean;
  readonly canSecondDraw: boolean;
  readonly canToggleSpeed: boolean;
}

export function legalActions(s: GameState): LegalActions {
  const forced = s.phase === "routing" && s.held !== null && s.held.fullQueueForce;
  // Playing a card commits the turn to Action A (the draw), so Action B
  // (place-from-queue) is only available before any card is played this turn.
  const canStartAction = s.phase === "idle" && !s.cardPlayedThisTurn;
  return {
    canPlayCard: canStartAction && s.hand.length > 0,
    // crowbar is never blocked once held; may still no-effect on an empty board
    canPlayCrowbar: canStartAction && s.hand.some((c) => c.type === "crowbar"),
    canDraw:
      (s.phase === "idle" && s.pool.length > 0) ||
      (s.phase === "secondLook" && s.secondLook.drawsUsed === 1 && s.pool.length > 0),
    canPlace: s.phase === "routing",
    canPark: s.phase === "routing" && !forced && !isQueueFull(s),
    mustSwapOrPlace: forced,
    canPlaceFromQueue:
      canStartAction && s.queue.length > 0 && emptyCells(s).length > 0,
    canSecondLookKeep: s.phase === "secondLook",
    canSecondDraw:
      s.phase === "secondLook" && s.secondLook.drawsUsed === 1 && s.pool.length > 0,
    canToggleSpeed: s.phase !== "gameOver",
  };
}
