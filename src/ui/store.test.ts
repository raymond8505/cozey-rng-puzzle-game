import { describe, it, expect } from "vitest";
import { useGame } from "./store";
import { PUZZLES } from "./puzzles";

// Guards the per-puzzle-grid + alternate-on-Play-Again wiring: each puzzle's
// board must actually drive the game it starts, and Play Again must advance to
// the next puzzle (and its grid). The store is a module singleton, so the first
// test observes the boot state before any playAgain runs.

describe("store puzzles", () => {
  it("boots on the first puzzle with its own grid", () => {
    const s = useGame.getState();
    expect(s.puzzleIndex).toBe(0);
    expect(s.puzzleSrc).toBe(PUZZLES[0].src);
    expect(s.state.config.board).toEqual(PUZZLES[0].board);
    expect(s.state.pool).toHaveLength(PUZZLES[0].board.cols * PUZZLES[0].board.rows);
  });

  it("playAgain alternates to the next puzzle and applies its grid", () => {
    const before = useGame.getState().puzzleIndex;
    useGame.getState().playAgain();
    const s = useGame.getState();
    const expected = (before + 1) % PUZZLES.length;

    expect(s.puzzleIndex).toBe(expected);
    expect(s.puzzleSrc).toBe(PUZZLES[expected].src);
    expect(s.state.config.board).toEqual(PUZZLES[expected].board);
    // a genuinely fresh game on the new grid
    const cells = PUZZLES[expected].board.cols * PUZZLES[expected].board.rows;
    expect(s.state.pool).toHaveLength(cells);
    expect(s.state.board).toHaveLength(cells);
    expect(s.state.board.every((c) => c === null)).toBe(true);
  });

  it("cycles back through the whole list", () => {
    const start = useGame.getState().puzzleIndex;
    for (let i = 0; i < PUZZLES.length; i++) useGame.getState().playAgain();
    expect(useGame.getState().puzzleIndex).toBe(start);
  });

  it("restart keeps the same puzzle", () => {
    const before = useGame.getState().puzzleIndex;
    useGame.getState().restart("seed-x");
    expect(useGame.getState().puzzleIndex).toBe(before);
    expect(useGame.getState().state.config.board).toEqual(PUZZLES[before].board);
  });
});
