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

describe("card economy — empty opening hand fills by placing", () => {
  it("opens with an empty hand; the first placement draws a card", () => {
    const s = makeState(); // default openingSize 0
    expect(s.hand).toHaveLength(0);
    const placed = reduce(reduce(s, { type: "DRAW" }), { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.hand).toHaveLength(1);
    expect(placed.deck).toHaveLength(s.deck.length - 1);
  });
});

describe("card economy — discard & reshuffle", () => {
  it("a played card goes to the discard pile", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: [{ instanceId: 1, type: "governor" }] };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.hand).toHaveLength(0);
    expect(played.discard).toEqual([{ instanceId: 1, type: "governor" }]);
  });

  it("reshuffles the discard into the deck when the deck empties, then draws", () => {
    const base = makeState();
    const s: GameState = {
      ...base,
      hand: [],
      deck: [],
      discard: [
        { instanceId: 5, type: "governor" },
        { instanceId: 6, type: "edgePunch" },
      ],
      reshuffles: 0,
    };
    const placed = reduce(reduce(s, { type: "DRAW" }), { type: "PLACE", cell: asCellIndex(0) });

    expect(placed.reshuffles).toBe(1);
    expect(placed.discard).toEqual([]); // discard folded into the deck
    expect(placed.hand).toHaveLength(1); // one drawn
    expect(placed.deck).toHaveLength(1); // one left
    // every discarded card is now accounted for in hand + deck
    const ids = [...placed.hand, ...placed.deck].map((c) => c.instanceId).sort();
    expect(ids).toEqual([5, 6]);
  });

  it("reshuffle order is deterministic for the same seed", () => {
    const base = makeState();
    const discard: GameState["discard"] = Array.from({ length: 6 }, (_, i) => ({
      instanceId: i,
      type: "governor",
    }));
    const craft = (): GameState => ({ ...base, hand: [], deck: [], discard, reshuffles: 0 });
    const run = () => reduce(reduce(craft(), { type: "DRAW" }), { type: "PLACE", cell: asCellIndex(0) });
    expect(run().deck).toEqual(run().deck);
  });
});

describe("card economy — guards", () => {
  it("does not draw when the hand is already at capacity", () => {
    const s = makeState(makeConfig({ hand: { capacity: 2, openingSize: 2 } })); // full
    const drawn = reduce(s, { type: "DRAW" });
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.hand).toHaveLength(2);
    expect(placed.deck).toEqual(s.deck);
  });

  it("does not draw when both deck and discard are empty", () => {
    const s = makeState(
      makeConfig({ hand: { capacity: 5, openingSize: 2 }, deck: [{ card: "governor", count: 2 }] }),
    );
    expect(s.deck).toHaveLength(0);
    expect(s.discard).toEqual([]);
    const drawn = reduce(s, { type: "DRAW" });
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.hand).toHaveLength(2); // unchanged — nothing to draw anywhere
  });
});
