import { describe, it, expect } from "vitest";
import { reduce } from "./reducer";
import { isQueueFull, currentDisplayedPiece, legalActions } from "./selectors";
import { makeState, makeConfig } from "@/fixtures/game.fixture";
import type { Card, GameState } from "./types";
import { asCellIndex } from "./types";

const crowbarHand: Card[] = [{ instanceId: 1, type: "crowbar" }];

/** Draw the currently-displayed piece and place it on `cell`; returns to idle. */
function placeOne(state: GameState, cell: number): GameState {
  const piece = currentDisplayedPiece(state)!;
  const aimed = reduce(state, { type: "SET_MACHINE_INDEX", index: state.pool.indexOf(piece) });
  return reduce(reduce(aimed, { type: "DRAW" }), { type: "PLACE", cell: asCellIndex(cell) });
}

function fillQueue(state: GameState): GameState {
  let s = state;
  while (!isQueueFull(s)) {
    const piece = currentDisplayedPiece(s)!;
    s = reduce(s, { type: "SET_MACHINE_INDEX", index: s.pool.indexOf(piece) });
    s = reduce(s, { type: "DRAW" });
    s = reduce(s, { type: "PARK" });
  }
  return s;
}

describe("Crowbar lift-and-route", () => {
  it("lifts a placed piece into the hand and enters routing", () => {
    const roomy = makeConfig({ hand: { capacity: 5, openingSize: 2 } });
    const placed = placeOne(makeState(roomy), 5);
    const piece = placed.board[5]!;
    const s: GameState = { ...placed, hand: crowbarHand };
    const lifted = reduce(s, { type: "PLAY_CROWBAR", instanceId: 1, cell: asCellIndex(5) });

    expect(lifted.held?.piece).toBe(piece);
    expect(lifted.held?.origin).toEqual({ kind: "crowbar", fromCell: 5 });
    expect(lifted.board[5]).toBeNull();
    expect(lifted.phase).toBe("routing");
    expect(lifted.cardPlayedThisTurn).toBe(true);
  });

  it("places the lifted piece elsewhere and draws a card", () => {
    const roomy = makeConfig({ hand: { capacity: 5, openingSize: 2 } });
    const placed = placeOne(makeState(roomy), 5);
    const piece = placed.board[5]!;
    const s: GameState = { ...placed, hand: crowbarHand };
    const lifted = reduce(s, { type: "PLAY_CROWBAR", instanceId: 1, cell: asCellIndex(5) });
    const moved = reduce(lifted, { type: "PLACE", cell: asCellIndex(6) });

    expect(moved.board[6]).toBe(piece);
    expect(moved.board[5]).toBeNull();
    expect(moved.hand).toHaveLength(lifted.hand.length + 1); // placement income
    expect(moved.phase).toBe("idle");
  });

  it("can park the lifted piece (no card income)", () => {
    const placed = placeOne(makeState(), 5);
    const s: GameState = { ...placed, hand: crowbarHand };
    const lifted = reduce(s, { type: "PLAY_CROWBAR", instanceId: 1, cell: asCellIndex(5) });
    const parked = reduce(lifted, { type: "PARK" });
    expect(parked.queue).toContain(placed.board[5]);
    expect(parked.hand).toHaveLength(lifted.hand.length); // parking draws nothing
  });

  it("permits returning the piece to its original cell (counts as a placement)", () => {
    const roomy = makeConfig({ hand: { capacity: 5, openingSize: 2 } });
    const placed = placeOne(makeState(roomy), 5);
    const piece = placed.board[5]!;
    const s: GameState = { ...placed, hand: crowbarHand };
    const lifted = reduce(s, { type: "PLAY_CROWBAR", instanceId: 1, cell: asCellIndex(5) });
    const back = reduce(lifted, { type: "PLACE", cell: asCellIndex(5) });
    expect(back.board[5]).toBe(piece);
    expect(back.hand).toHaveLength(lifted.hand.length + 1); // still draws a card
  });

  it("forfeits an armed crowbar: spent with no lift, turn still open", () => {
    const placed = placeOne(makeState(), 5);
    const s: GameState = { ...placed, hand: crowbarHand };
    const forfeited = reduce(s, { type: "FORFEIT_CROWBAR", instanceId: 1 });

    expect(forfeited.hand).toHaveLength(0);
    expect(forfeited.discard.at(-1)).toEqual(crowbarHand[0]);
    expect(forfeited.board).toEqual(s.board); // nothing lifted
    expect(forfeited.held).toBeNull();
    // the abandoning tile play (DRAW / PLACE_FROM_QUEUE) must still be legal
    expect(forfeited.cardPlayedThisTurn).toBe(false);
  });

  it("forfeit rejects an absent card and a non-crowbar", () => {
    const s: GameState = { ...makeState(), hand: [{ instanceId: 2, type: "governor" }] };
    expect(reduce(s, { type: "FORFEIT_CROWBAR", instanceId: 9 }).lastRejection).toBe(
      "cardNotInHand",
    );
    expect(reduce(s, { type: "FORFEIT_CROWBAR", instanceId: 2 }).lastRejection).toBe(
      "illegalInPhase",
    );
  });

  it("lifting into a full queue forces placement (parking blocked)", () => {
    const full = fillQueue(makeState());
    const placed = placeOne(full, 12); // one piece on board, queue still full
    const s: GameState = { ...placed, hand: crowbarHand };
    const lifted = reduce(s, { type: "PLAY_CROWBAR", instanceId: 1, cell: asCellIndex(12) });
    expect(lifted.held?.fullQueueForce).toBe(true);
    expect(legalActions(lifted).canPark).toBe(false);
    const parkAttempt = reduce(lifted, { type: "PARK" });
    expect(parkAttempt.lastRejection).toBe("queueFull");
  });
});
