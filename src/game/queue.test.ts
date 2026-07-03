import { describe, it, expect } from "vitest";
import { reduce } from "./reducer";
import {
  queueCapacity,
  isQueueFull,
  legalActions,
  currentDisplayedPiece,
} from "./selectors";
import { makeState, makeState6x4, makeConfig } from "@/fixtures/game.fixture";
import type { GameState, PieceId } from "./types";
import { asCellIndex } from "./types";

/** Park pieces (Action A, draw+park) until the queue is full. */
function fillQueue(state: GameState): GameState {
  let s = state;
  while (!isQueueFull(s)) {
    const piece = currentDisplayedPiece(s);
    if (piece === null) break;
    const idx = s.pool.indexOf(piece);
    s = reduce(s, { type: "SET_MACHINE_INDEX", index: idx });
    s = reduce(s, { type: "DRAW" });
    s = reduce(s, { type: "PARK" });
  }
  return s;
}

describe("derived queue capacity", () => {
  it("defaults to floor(0.1 * 35) = 3 for 7x5", () => {
    expect(queueCapacity(makeState())).toBe(3);
  });

  it("is derived, not hardcoded (5x5 @ ratio 1/4 => 6)", () => {
    const s = makeState(makeConfig({ board: { cols: 5, rows: 5 }, queue: { capacityRatio: 0.25 } }));
    expect(queueCapacity(s)).toBe(6);
  });

  it("follows a tiny board (4x3 @ 0.1 => floor(1.2) = 1)", () => {
    const s = makeState(makeConfig({ board: { cols: 4, rows: 3 } }));
    expect(queueCapacity(s)).toBe(1);
  });
});

// The full-queue suites pin 6x4 (queue capacity 3) so the length-3
// expectations survive default-board retunes.
describe("full-queue forced placement", () => {
  it("marks a draw into a full queue as forced and blocks parking", () => {
    const full = fillQueue(makeState6x4());
    expect(full.queue).toHaveLength(3);
    const drawn = reduce(full, { type: "DRAW" });
    expect(drawn.held?.fullQueueForce).toBe(true);
    const la = legalActions(drawn);
    expect(la.mustSwapOrPlace).toBe(true);
    expect(la.canPark).toBe(false);

    const parkAttempt = reduce(drawn, { type: "PARK" });
    expect(parkAttempt.lastRejection).toBe("queueFull");
    expect(parkAttempt.phase).toBe("routing");
  });

  it("allows placing the drawn piece directly to satisfy the force", () => {
    const full = fillQueue(makeState6x4());
    const drawn = reduce(full, { type: "DRAW" });
    const held = drawn.held!.piece;
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(10) });
    expect(placed.board[10]).toBe(held);
    expect(placed.queue).toHaveLength(3); // unchanged
    expect(placed.phase).toBe("idle");
  });
});

describe("full-queue swap", () => {
  it("swaps the held piece into the queue and places a displaced queued piece", () => {
    const full = fillQueue(makeState6x4());
    const queueBefore = full.queue;
    const drawn = reduce(full, { type: "DRAW" });
    const held = drawn.held!.piece;
    const displaced = queueBefore[1] as PieceId;

    const swapped = reduce(drawn, {
      type: "SWAP",
      placeCell: asCellIndex(7),
      placePiece: displaced,
    });

    expect(swapped.board[7]).toBe(displaced);
    expect(swapped.queue).toHaveLength(3); // still full
    expect(swapped.queue).toContain(held); // held is now parked
    expect(swapped.queue).not.toContain(displaced);
    expect(swapped.phase).toBe("idle");
  });

  it("SWAP placing the held piece is equivalent to a direct place", () => {
    const full = fillQueue(makeState6x4());
    const drawn = reduce(full, { type: "DRAW" });
    const held = drawn.held!.piece;
    const swapped = reduce(drawn, {
      type: "SWAP",
      placeCell: asCellIndex(9),
      placePiece: held,
    });
    expect(swapped.board[9]).toBe(held);
    expect(swapped.queue).toEqual(full.queue); // untouched
  });

  it("rejects SWAP when the queue was not full (not forced)", () => {
    const s = makeState();
    const drawn = reduce(s, { type: "DRAW" });
    const swapped = reduce(drawn, {
      type: "SWAP",
      placeCell: asCellIndex(0),
      placePiece: drawn.held!.piece,
    });
    expect(swapped.lastRejection).toBe("illegalInPhase");
  });
});
