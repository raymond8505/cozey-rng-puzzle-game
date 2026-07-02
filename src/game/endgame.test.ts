import { describe, it, expect } from "vitest";
import { reduce } from "./reducer";
import { completeness, scoreTier, isGameOver } from "./selectors";
import { makeState, playPerfect } from "@/fixtures/game.fixture";
import type { GameState, PieceId } from "./types";
import { asCellIndex } from "./types";

/** A fully-filled board (identity = correct) with `swaps` disjoint pairs
 *  transposed; each swap makes two cells incorrect. correct = N - 2*swaps. */
function craftFullBoard(state: GameState, swaps: number): GameState {
  const board: (PieceId | null)[] = state.pieces.map((p) => p.id);
  for (let k = 0; k < swaps; k++) {
    const a = 2 * k;
    const b = 2 * k + 1;
    const tmp = board[a]!;
    board[a] = board[b]!;
    board[b] = tmp;
  }
  return { ...state, board, pool: [], queue: [], held: null, phase: "idle" };
}

describe("end-of-game detection", () => {
  it("a perfect playthrough fills every cell and ends the game at 100%", () => {
    const done = playPerfect(makeState());
    expect(done.board.every((c) => c !== null)).toBe(true);
    expect(done.pool).toHaveLength(0);
    expect(done.queue).toHaveLength(0);
    expect(isGameOver(done)).toBe(true);
    expect(done.phase).toBe("gameOver");
    expect(completeness(done)).toBe(100);
  });

  it("rejects further play once over, but allows RESTART", () => {
    const done = playPerfect(makeState());
    const drawAttempt = reduce(done, { type: "DRAW" });
    expect(drawAttempt.lastRejection).toBe("illegalInPhase");
    const restarted = reduce(done, { type: "RESTART" });
    expect(restarted.phase).toBe("idle");
    expect(restarted.board.every((c) => c === null)).toBe(true);
  });
});

describe("completeness with misplaced pieces", () => {
  it("counts only correctly-homed cells", () => {
    const s = craftFullBoard(makeState(), 1); // 22/24 correct
    expect(completeness(s)).toBeCloseTo((22 / 24) * 100, 5);
  });

  it("maps score tiers by threshold", () => {
    const cases: Array<[number, string]> = [
      [0, "Flawless."], // 24/24 = 100
      [1, "Basically perfect."], // 22/24 = 91.6 -> >=85
      [4, "Nailed it!"], // 16/24 = 66.6 -> >=60
      [5, "Nailed it…"], // 14/24 = 58.3 -> >=30
      [9, "Art."], // 6/24 = 25 -> <30
    ];
    for (const [swaps, slogan] of cases) {
      const s = craftFullBoard(makeState(), swaps);
      expect(scoreTier(s).slogan).toBe(slogan);
    }
  });
});

describe("mid-board completeness", () => {
  it("is 0 on an empty board and rises as pieces are homed", () => {
    const s = makeState();
    expect(completeness(s)).toBe(0);
    // home the currently displayed piece on its own cell
    const piece = s.pool[s.machine.displayIndex % s.pool.length]!;
    const homed = reduce(
      reduce(s, { type: "SET_MACHINE_INDEX", index: s.pool.indexOf(piece) }),
      { type: "DRAW" },
    );
    const placed = reduce(homed, { type: "PLACE", cell: asCellIndex(s.pieces[piece].home) });
    expect(completeness(placed)).toBeCloseTo((1 / 24) * 100, 5);
  });
});
