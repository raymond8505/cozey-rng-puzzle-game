import { describe, it, expect } from "vitest";
import { createInitialState } from "./init";
import { reduce } from "./reducer";
import { makeConfig } from "@/fixtures/game.fixture";
import type { GameAction } from "./types";
import { asCellIndex } from "./types";

describe("createInitialState", () => {
  it("starts a fresh 7x5 game with full pool, empty board, dealt hand", () => {
    const s = createInitialState("dev-seed");
    expect(s.pieces).toHaveLength(35);
    expect(s.pool).toHaveLength(35);
    expect(s.board).toHaveLength(35);
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.queue).toEqual([]);
    expect(s.hand).toHaveLength(0); // openingSize 0 — hand fills by placing
    expect(s.deck).toHaveLength(8); // full starter deck (nothing dealt)
    expect(s.discard).toEqual([]);
    expect(s.reshuffles).toBe(0);
    expect(s.phase).toBe("idle");
    expect(s.revealActive).toBe(true); // every fresh game starts revealed
    expect(s.held).toBeNull();
    expect(s.machine.baseSpeedMs).toBe(s.config.machine.slowMs);
  });

  it("is fully reproducible for the same seed", () => {
    const a = createInitialState("same");
    const b = createInitialState("same");
    expect(a.pieces).toEqual(b.pieces);
    expect(a.pool).toEqual(b.pool);
    expect(a.deck).toEqual(b.deck);
    expect(a.hand).toEqual(b.hand);
  });

  it("differs across seeds (pool order)", () => {
    const a = createInitialState("seed-a");
    const b = createInitialState("seed-b");
    expect(a.pool).not.toEqual(b.pool);
  });

  it("a scripted action sequence is deterministic across same-seed runs", () => {
    const script: GameAction[] = [
      { type: "SET_MACHINE_INDEX", index: 3 },
      { type: "DRAW" },
      { type: "PLACE", cell: asCellIndex(0) },
      { type: "SET_MACHINE_INDEX", index: 1 },
      { type: "DRAW" },
      { type: "PARK" },
    ];
    const run = (seed: string) =>
      script.reduce(reduce, createInitialState(seed));
    expect(run("seed")).toEqual(run("seed"));
  });

  it("honors config overrides (board size drives everything)", () => {
    const s = createInitialState("x", makeConfig({ board: { cols: 5, rows: 5 } }));
    expect(s.pieces).toHaveLength(25);
    expect(s.pool).toHaveLength(25);
    expect(s.board).toHaveLength(25);
  });
});
