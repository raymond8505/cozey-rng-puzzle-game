import { describe, it, expect, vi } from "vitest";
import { useGame } from "./store";
import { PUZZLES } from "./puzzles";
import { edgeSignature } from "@/fixtures/game.fixture";

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

// Every fresh game mints its own seed, so the same home cell gets different
// edge shapes run to run; restart() still reproduces the CURRENT run because
// newGame carries the run's seed into config.rng (previously it always fell
// back to the global default seed, so restart never actually reproduced).
describe("per-game seeding", () => {
  it("selectPuzzle starts each run with fresh piece shapes", () => {
    useGame.getState().selectPuzzle(1);
    const first = edgeSignature(useGame.getState().state);
    useGame.getState().selectPuzzle(1);
    expect(edgeSignature(useGame.getState().state)).not.toBe(first);
  });

  it("playAgain mints a fresh seed for each visit to the same puzzle", () => {
    useGame.getState().playAgain();
    const firstVisitSeed = useGame.getState().state.config.rng.seed;
    for (let i = 0; i < PUZZLES.length; i++) useGame.getState().playAgain();
    expect(useGame.getState().state.config.rng.seed).not.toBe(firstVisitSeed);
  });

  it("restart without a seed reproduces the current run", () => {
    useGame.getState().selectPuzzle(0);
    const before = useGame.getState().state;
    useGame.getState().restart();
    const after = useGame.getState().state;
    expect(edgeSignature(after)).toBe(edgeSignature(before));
    expect(after.pool).toEqual(before.pool);
    expect(after.hand).toEqual(before.hand);
  });
});

// The seated card is NOT on a timer: it stays in the slot (and on the
// nameplate) until a tile is chosen. Only the toast expires by itself.
describe("seated card lifecycle", () => {
  /** Fresh game with a single governor in hand, played into the slot. */
  function playGovernor() {
    useGame.getState().restart("seat-test");
    const s = useGame.getState().state;
    useGame.setState({ state: { ...s, hand: [{ instanceId: 99, type: "governor" }] } });
    useGame.getState().playCard(99);
  }

  it("toast expires on its timer while the card stays seated", () => {
    vi.useFakeTimers();
    playGovernor();
    expect(useGame.getState().seatedCard).toBe("governor");
    expect(useGame.getState().toast).not.toBeNull();

    vi.advanceTimersByTime(5000);
    expect(useGame.getState().toast).toBeNull();
    expect(useGame.getState().seatedCard).toBe("governor"); // still seated
    vi.useRealTimers();
  });

  it("clears the seat when a tile is chosen (DRAW)", () => {
    playGovernor();
    useGame.getState().dispatch({ type: "DRAW" });
    expect(useGame.getState().state.held).not.toBeNull();
    expect(useGame.getState().seatedCard).toBeNull();
  });
});
