import { describe, it, expect } from "vitest";
import { reduce } from "./reducer";
import { isQueueFull, currentDisplayedPiece } from "./selectors";
import { makeState, makeConfig } from "@/fixtures/game.fixture";
import type { GameState } from "./types";
import { asCellIndex } from "./types";

// Hand has room (capacity 5, opening 2) so placements can draw.
const roomyConfig = makeConfig({ hand: { capacity: 5, openingSize: 2 } });

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

describe("card economy — placements are the only income", () => {
  it("a direct placement draws exactly one card", () => {
    const s = makeState(roomyConfig);
    const drawn = reduce(s, { type: "DRAW" });
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.hand).toHaveLength(s.hand.length + 1);
    expect(placed.deck).toHaveLength(s.deck.length - 1);
  });

  it("parking draws no card", () => {
    const s = makeState(roomyConfig);
    const drawn = reduce(s, { type: "DRAW" });
    const parked = reduce(drawn, { type: "PARK" });
    expect(parked.hand).toHaveLength(s.hand.length);
    expect(parked.deck).toHaveLength(s.deck.length);
  });

  it("playing a card draws no card (hand only shrinks)", () => {
    const base = makeState(roomyConfig);
    const s: GameState = {
      ...base,
      hand: [
        { instanceId: 1, type: "governor" },
        { instanceId: 2, type: "governor" },
      ],
    };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.hand).toHaveLength(1);
    expect(played.deck).toEqual(s.deck);
  });

  it("place-from-queue (Action B) draws a card", () => {
    const s = makeState(roomyConfig);
    // park one, then place it next turn
    const piece = currentDisplayedPiece(s)!;
    const parked = reduce(
      reduce(reduce(s, { type: "SET_MACHINE_INDEX", index: s.pool.indexOf(piece) }), {
        type: "DRAW",
      }),
      { type: "PARK" },
    );
    const queued = parked.queue[0]!;
    const placed = reduce(parked, {
      type: "PLACE_FROM_QUEUE",
      queued,
      cell: asCellIndex(0),
    });
    expect(placed.hand).toHaveLength(parked.hand.length + 1);
    expect(placed.deck).toHaveLength(parked.deck.length - 1);
  });

  it("a forced full-queue swap draws exactly one card (one placement)", () => {
    const full = fillQueue(makeState(roomyConfig));
    const handBefore = full.hand.length;
    const deckBefore = full.deck.length;
    const drawn = reduce(full, { type: "DRAW" });
    const swapped = reduce(drawn, {
      type: "SWAP",
      placeCell: asCellIndex(11),
      placePiece: full.queue[0]!,
    });
    expect(swapped.hand).toHaveLength(handBefore + 1);
    expect(swapped.deck).toHaveLength(deckBefore - 1);
  });
});

describe("card economy — guards", () => {
  it("does not draw when the hand is already at capacity", () => {
    const s = makeState(); // default: capacity 3, opening 3 => full
    const drawn = reduce(s, { type: "DRAW" });
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.hand).toHaveLength(3);
    expect(placed.deck).toEqual(s.deck);
  });

  it("does not draw when the deck is empty", () => {
    const s = makeState(
      makeConfig({ hand: { capacity: 5, openingSize: 2 }, deck: [{ card: "governor", count: 2 }] }),
    );
    expect(s.deck).toHaveLength(0);
    const drawn = reduce(s, { type: "DRAW" });
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.hand).toHaveLength(2); // unchanged, deck was empty
  });
});
