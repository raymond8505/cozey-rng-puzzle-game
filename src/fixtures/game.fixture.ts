// Shared test/story helpers for the game core. Per the testing skill, module-
// level fixtures and factories live here, not inside test files.

import { GAME_CONFIG } from "@/config/game.config";
import type { GameConfig } from "@/config/game.config";
import type { CellIndex, GameAction, GameState, PieceId } from "@/game/types";
import { asCellIndex } from "@/game/types";
import { createInitialState } from "@/game/init";
import { reduce } from "@/game/reducer";
import { currentDisplayedPiece, displayedSequence } from "@/game/selectors";

/** A GameConfig factory with shallow-per-section overrides. */
export function makeConfig(overrides: {
  board?: Partial<GameConfig["board"]>;
  machine?: Partial<GameConfig["machine"]>;
  queue?: Partial<GameConfig["queue"]>;
  hand?: Partial<GameConfig["hand"]>;
  deck?: GameConfig["deck"];
  rng?: Partial<GameConfig["rng"]>;
} = {}): GameConfig {
  return {
    ...GAME_CONFIG,
    board: { ...GAME_CONFIG.board, ...overrides.board },
    machine: { ...GAME_CONFIG.machine, ...overrides.machine },
    queue: { ...GAME_CONFIG.queue, ...overrides.queue },
    hand: { ...GAME_CONFIG.hand, ...overrides.hand },
    deck: overrides.deck ?? GAME_CONFIG.deck,
    rng: { ...GAME_CONFIG.rng, ...overrides.rng },
  };
}

/** Fresh state with an optional config override. */
export function makeState(config: GameConfig = GAME_CONFIG, seed?: string): GameState {
  return createInitialState(seed ?? config.rng.seed, config);
}

/** Pinned 6x4 board (and 1/8 queue ratio) for tests whose expectations encode
 *  grid math (specific cell indices, 24-cell counts, queue capacity 3). Keeps
 *  those tests stable when the shipped defaults are retuned. */
export function makeState6x4(seed?: string): GameState {
  return makeState(
    makeConfig({ board: { cols: 6, rows: 4 }, queue: { capacityRatio: 0.125 } }),
    seed,
  );
}

/** Stable signature of every piece's edge geometry (per home cell), for
 *  same-shapes / different-shapes assertions across runs. */
export function edgeSignature(state: GameState): string {
  return JSON.stringify(state.pieces.map((p) => p.edges));
}

/** Reduce a scripted list of actions. */
export function applyAll(state: GameState, actions: readonly GameAction[]): GameState {
  return actions.reduce(reduce, state);
}

/** Index of a piece within the current displayed sequence, or -1. */
export function indexOfDisplayed(state: GameState, piece: PieceId): number {
  return displayedSequence(state).indexOf(piece);
}

/** Aim the Machine at a specific pool piece and DRAW it into `held`.
 *  Requires the piece to be in the current displayed sequence. */
export function drawSpecific(state: GameState, piece: PieceId): GameState {
  const idx = indexOfDisplayed(state, piece);
  if (idx < 0) throw new Error(`piece ${piece} not in displayed sequence`);
  return applyAll(state, [{ type: "SET_MACHINE_INDEX", index: idx }, { type: "DRAW" }]);
}

/** One full Action-A turn: draw a specific piece and place it on `cell`. */
export function turnDrawPlace(
  state: GameState,
  piece: PieceId,
  cell: CellIndex,
): GameState {
  return reduce(drawSpecific(state, piece), { type: "PLACE", cell });
}

/** One full Action-A turn: draw a specific piece and park it. */
export function turnDrawPark(state: GameState, piece: PieceId): GameState {
  return reduce(drawSpecific(state, piece), { type: "PARK" });
}

/** Place each queued/drawn piece on its HOME cell to build a correct board.
 *  Draws pieces in pool order and homes them until the pool is empty. */
export function playPerfect(state: GameState): GameState {
  let s = state;
  let guard = 0;
  const maxTurns = s.board.length * 4;
  while (!(s.pool.length === 0 && s.queue.length === 0) && guard++ < maxTurns) {
    if (s.pool.length > 0) {
      const piece = currentDisplayedPiece(s);
      if (piece === null) break;
      s = turnDrawPlace(s, piece, asCellIndex(s.pieces[piece].home));
    } else {
      // pool empty, drain queue via Action B onto home cells
      const queued = s.queue[0] as PieceId;
      s = reduce(s, {
        type: "PLACE_FROM_QUEUE",
        queued,
        cell: asCellIndex(s.pieces[queued].home),
      });
    }
  }
  return s;
}
