import { describe, it, expect } from "vitest";
import { isOverlappingPlacement } from "./selectors";
import { makeState } from "@/fixtures/game.fixture";
import type { GameState, PieceId } from "./types";
import { asCellIndex, asPieceId } from "./types";

/** Place `pieceId` on `cell` (identity home: pieceId === its home cell). */
function put(board: (PieceId | null)[], cell: number, pieceId: number) {
  board[cell] = asPieceId(pieceId);
}

describe("isOverlappingPlacement (raised-piece condition)", () => {
  it("is false for an empty cell", () => {
    const s = makeState();
    expect(isOverlappingPlacement(s, asCellIndex(0))).toBe(false);
  });

  it("is false for a correctly-homed piece even with filled neighbors", () => {
    const s = makeState();
    const board = s.board.slice();
    put(board, 8, 8); // correct
    put(board, 9, 9); // neighbor, correct
    const next: GameState = { ...s, board };
    expect(isOverlappingPlacement(next, asCellIndex(8))).toBe(false);
  });

  it("is true for a misplaced piece bordering a filled cell", () => {
    const s = makeState();
    const board = s.board.slice();
    put(board, 8, 8); // correct neighbor (fills cell 8)
    put(board, 9, 10); // WRONG piece on cell 9 (home 10), borders filled cell 8
    const next: GameState = { ...s, board };
    expect(isOverlappingPlacement(next, asCellIndex(9))).toBe(true);
  });

  it("is false for a misplaced piece with no filled neighbors (nothing to overlap)", () => {
    const s = makeState();
    const board = s.board.slice();
    put(board, 9, 10); // misplaced but isolated
    const next: GameState = { ...s, board };
    expect(isOverlappingPlacement(next, asCellIndex(9))).toBe(false);
  });
});
