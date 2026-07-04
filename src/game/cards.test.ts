import { describe, it, expect } from "vitest";
import { reduce } from "./reducer";
import { resolveCard } from "./cards";
import {
  machineSpeedMs,
  displayedSequence,
  currentDisplayedPiece,
  legalActions,
} from "./selectors";
import { makeState, makeState6x4, turnDrawPlace, turnDrawPark } from "@/fixtures/game.fixture";
import type { Card, GameState, PieceId } from "./types";
import { asCellIndex } from "./types";

const handOf = (type: Card["type"]): Card[] => [{ instanceId: 1, type }];

/** Put one piece on the board (identity home) and remove it from the pool. */
function placeOnBoard(s: GameState, piece: PieceId, cell: number): GameState {
  const board = s.board.slice();
  board[cell] = piece;
  return { ...s, board, pool: s.pool.filter((id) => id !== piece) };
}

describe("Governor", () => {
  it("switches this draw to comfortableMs and reports an effect", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: handOf("governor") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.machine.governorActive).toBe(true);
    expect(machineSpeedMs(played)).toBe(base.config.machine.comfortableMs);
    expect(played.lastCardResult).toEqual({
      kind: "effect",
      card: "governor",
      effect: "governorSpeed",
    });
  });
});

describe("Edge Punch", () => {
  it("filters the displayed sequence to edge/corner pieces", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: handOf("edgePunch") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.machine.filter.kind).toBe("edge");
    const seq = displayedSequence(played);
    expect(seq.length).toBeGreaterThan(0);
    expect(seq.every((id) => played.pieces[id].edgeClass !== "interior")).toBe(true);
    expect(played.lastCardResult).toMatchObject({ kind: "effect", effect: "filterEdge" });
  });

  it("no-effects with a specific reason when no edge pieces remain in the pool", () => {
    const base = makeState();
    const interior = base.pieces.find((p) => p.edgeClass === "interior")!.id;
    const s: GameState = { ...base, hand: handOf("edgePunch"), pool: [interior] };
    expect(resolveCard(s, "edgePunch")).toEqual({
      kind: "noEffect",
      card: "edgePunch",
      reasonCode: "edgePunch.noEdgePieces",
    });
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.machine.filter.kind).toBe("none"); // filter not applied
    expect(played.lastCardResult).toMatchObject({ reasonCode: "edgePunch.noEdgePieces" });
    expect(played.cardPlayedThisTurn).toBe(true); // still consumed
  });
});

describe("Neighbor Punch", () => {
  it("filters to pieces adjacent to a filled cell", () => {
    const base = makeState6x4(); // cell-index expectations below assume 6 cols
    const withPlaced = placeOnBoard(base, base.pieces[0].id, 0); // fill corner cell 0
    const s: GameState = { ...withPlaced, hand: handOf("neighborPunch") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.machine.filter.kind).toBe("neighbor");
    const seq = displayedSequence(played);
    expect(seq.length).toBeGreaterThan(0);
    // cell 0's orthogonal neighbors are cells 1 and 6 (6 cols)
    expect(seq).toContain(base.pieces[1].id);
    expect(seq).toContain(base.pieces[6].id);
  });

  it("no-effects on an empty board", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: handOf("neighborPunch") };
    expect(resolveCard(s, "neighborPunch")).toMatchObject({
      reasonCode: "neighborPunch.noQualifyingPieces",
    });
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.machine.filter.kind).toBe("none");
  });
});

describe("Crowbar (no-effect path)", () => {
  it("no-effects on an empty board but is still consumed and leaves DRAW available", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: handOf("crowbar") };
    const played = reduce(s, { type: "PLAY_CROWBAR", instanceId: 1 });
    expect(played.lastCardResult).toEqual({
      kind: "noEffect",
      card: "crowbar",
      reasonCode: "crowbar.boardEmpty",
    });
    expect(played.cardPlayedThisTurn).toBe(true);
    expect(played.phase).toBe("idle");
    expect(played.held).toBeNull();
    // a normal draw is still possible this turn
    const drawn = reduce(played, { type: "DRAW" });
    expect(drawn.phase).toBe("routing");
  });
});

describe("Reveal", () => {
  it("re-shows the finished picture once it has been dismissed", () => {
    const base = makeState();
    const dismissed = reduce(base, { type: "DISMISS_REVEAL" });
    const s: GameState = { ...dismissed, hand: handOf("reveal") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.revealActive).toBe(true);
    expect(played.lastCardResult).toEqual({
      kind: "effect",
      card: "reveal",
      effect: "revealBoard",
    });
    expect(played.cardPlayedThisTurn).toBe(true);
  });

  it("no-effects when the picture is already showing (e.g. game start)", () => {
    const base = makeState(); // fresh games start revealed
    const s: GameState = { ...base, hand: handOf("reveal") };
    expect(resolveCard(s, "reveal")).toEqual({
      kind: "noEffect",
      card: "reveal",
      reasonCode: "reveal.alreadyShowing",
    });
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.revealActive).toBe(true);
    expect(played.cardPlayedThisTurn).toBe(true); // still consumed
  });

  it("leaves Action B open: the queue can be studied against the picture and played", () => {
    const base = makeState();
    const piece = currentDisplayedPiece(base)!;
    const parked = turnDrawPark(base, piece); // queue holds one tile
    const dismissed = reduce(parked, { type: "DISMISS_REVEAL" });
    const s: GameState = { ...dismissed, hand: handOf("reveal") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });

    expect(legalActions(played).canPlaceFromQueue).toBe(true);
    const home = asCellIndex(played.pieces[piece].home);
    const placedFromQueue = reduce(played, {
      type: "PLACE_FROM_QUEUE",
      queued: piece,
      cell: home,
    });
    expect(placedFromQueue.board[home]).toBe(piece);
    expect(placedFromQueue.turnCount).toBe(played.turnCount + 1); // a normal Action B turn
  });

  it("every other card still commits the turn to Action A (queue locked)", () => {
    const base = makeState();
    const piece = currentDisplayedPiece(base)!;
    const parked = turnDrawPark(base, piece);
    const s: GameState = { ...parked, hand: handOf("governor") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });

    expect(legalActions(played).canPlaceFromQueue).toBe(false);
    const attempted = reduce(played, {
      type: "PLACE_FROM_QUEUE",
      queued: piece,
      cell: asCellIndex(played.pieces[piece].home),
    });
    expect(attempted.lastRejection).toBe("illegalInPhase");
    expect(attempted.board.every((c) => c === null)).toBe(true);
  });
});

describe("DISMISS_REVEAL", () => {
  it("starts revealed and dismisses without touching turn state", () => {
    const base = makeState();
    expect(base.revealActive).toBe(true);
    const dismissed = reduce(base, { type: "DISMISS_REVEAL" });
    expect(dismissed.revealActive).toBe(false);
    expect(dismissed.phase).toBe(base.phase);
    expect(dismissed.turnCount).toBe(base.turnCount);
    expect(dismissed.cardPlayedThisTurn).toBe(base.cardPlayedThisTurn);
  });

  it("is inert when already dismissed (identical state object)", () => {
    const dismissed = reduce(makeState(), { type: "DISMISS_REVEAL" });
    expect(reduce(dismissed, { type: "DISMISS_REVEAL" })).toBe(dismissed);
  });

  it("a card-played reveal persists across endTurn until the next grab", () => {
    const base = makeState();
    const dismissed = reduce(base, { type: "DISMISS_REVEAL" });
    const s: GameState = { ...dismissed, hand: handOf("reveal") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    const piece = currentDisplayedPiece(played)!;
    const nextTurn = turnDrawPlace(played, piece, asCellIndex(played.pieces[piece].home));
    expect(nextTurn.turnCount).toBe(played.turnCount + 1); // turn really ended
    expect(nextTurn.revealActive).toBe(true);
  });
});

describe("filter lasts exactly one draw then restores", () => {
  it("clears the filter the moment a piece is drawn", () => {
    const base = makeState();
    const s: GameState = { ...base, hand: handOf("edgePunch") };
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.machine.filter.kind).toBe("edge");
    const drawn = reduce(played, { type: "DRAW" });
    // drawn piece came from the filtered (edge) set
    expect(drawn.pieces[drawn.held!.piece].edgeClass).not.toBe("interior");
    // filter is spent immediately
    expect(drawn.machine.filter.kind).toBe("none");
    const placed = reduce(drawn, { type: "PLACE", cell: asCellIndex(0) });
    expect(placed.machine.filter.kind).toBe("none");
  });
});
