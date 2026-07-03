import { describe, it, expect } from "vitest";
import { reduce } from "./reducer";
import { legalActions, currentDisplayedPiece } from "./selectors";
import { makeState, drawSpecific, turnDrawPark } from "@/fixtures/game.fixture";
import type { Card, GameState } from "./types";
import { asCellIndex } from "./types";

const governorHand = (n: number): Card[] =>
  Array.from({ length: n }, (_, i) => ({ instanceId: 900 + i, type: "governor" }));

describe("turn legality", () => {
  it("starts in idle with the expected legal actions", () => {
    const s = makeState();
    const la = legalActions(s);
    expect(s.phase).toBe("idle");
    expect(la.canPlayCard).toBe(false); // empty opening hand — nothing to play yet
    expect(la.canDraw).toBe(true);
    expect(la.canPlace).toBe(false);
    expect(la.canPark).toBe(false);
  });

  it("PLACE in idle is a no-op that records a rejection", () => {
    const s = makeState();
    const after = reduce(s, { type: "PLACE", cell: asCellIndex(0) });
    expect(after.lastRejection).toBe("noHeldPiece");
    expect(after.board).toEqual(s.board);
    expect(after.phase).toBe("idle");
  });

  it("DRAW in idle moves to routing with a held piece and shrinks the pool", () => {
    const s = makeState();
    const displayed = currentDisplayedPiece(s);
    const after = reduce(s, { type: "DRAW" });
    expect(after.phase).toBe("routing");
    expect(after.held?.piece).toBe(displayed);
    expect(after.pool).toHaveLength(s.pool.length - 1);
    expect(after.pool).not.toContain(displayed);
  });

  it("a placement ends the turn and returns to idle", () => {
    const s = makeState();
    const drawn = reduce(s, { type: "DRAW" });
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(5) });
    expect(placed.phase).toBe("idle");
    expect(placed.held).toBeNull();
    expect(placed.turnCount).toBe(s.turnCount + 1);
    expect(placed.cardPlayedThisTurn).toBe(false);
  });
});

describe("one card max per turn", () => {
  it("rejects a second card play in the same turn", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: governorHand(2) };
    const first = reduce(s, { type: "PLAY_CARD", instanceId: 900 });
    expect(first.cardPlayedThisTurn).toBe(true);
    expect(first.hand).toHaveLength(1);
    const second = reduce(first, { type: "PLAY_CARD", instanceId: 901 });
    expect(second.lastRejection).toBe("cardAlreadyPlayed");
    expect(second.hand).toHaveLength(1); // unchanged
  });

  it("resets the card slot after the turn ends", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: governorHand(2) };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 900 });
    const drawn = reduce(played, { type: "DRAW" });
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.cardPlayedThisTurn).toBe(false);
    expect(legalActions(placed).canPlayCard).toBe(true);
  });
});

describe("Action A vs Action B", () => {
  it("place-from-queue (Action B) is illegal once a card is played", () => {
    const base = turnDrawPark(makeState(), currentDisplayedPiece(makeState())!);
    const withCard: GameState = { ...base, hand: governorHand(1) };
    const played = reduce(withCard, { type: "PLAY_CARD", instanceId: 900 });
    const queued = played.queue[0]!;
    const attempt = reduce(played, {
      type: "PLACE_FROM_QUEUE",
      queued,
      cell: asCellIndex(1),
    });
    expect(attempt.lastRejection).toBe("illegalInPhase");
    expect(attempt.queue).toEqual(played.queue);
  });

  it("Action B places a queued piece and ends the turn", () => {
    const s0 = makeState();
    const parked = turnDrawPark(s0, currentDisplayedPiece(s0)!);
    const queued = parked.queue[0]!;
    const after = reduce(parked, {
      type: "PLACE_FROM_QUEUE",
      queued,
      cell: asCellIndex(3),
    });
    expect(after.board[3]).toBe(queued);
    expect(after.queue).not.toContain(queued);
    expect(after.phase).toBe("idle");
    expect(after.turnCount).toBe(parked.turnCount + 1);
  });

  it("drawing does not happen twice in a routing phase", () => {
    const s = drawSpecific(makeState(), currentDisplayedPiece(makeState())!);
    const again = reduce(s, { type: "DRAW" });
    expect(again.lastRejection).toBe("illegalInPhase");
  });
});
