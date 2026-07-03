// logForTransition turns reducer state diffs into console hint lines. These
// tests pin the edge-triggered behavior: each hint fires exactly when its
// condition BECOMES true, and routine actions produce no lines at all.

import { describe, it, expect } from "vitest";
import { reduce } from "@/game/reducer";
import { asCellIndex } from "@/game/types";
import type { GameState } from "@/game/types";
import { makeState, applyAll } from "@/fixtures/game.fixture";
import { logForTransition } from "./statusLog";

/** Fresh idle state holding exactly one card of the given type. */
function withCard(type: "governor" | "secondLook"): GameState {
  return { ...makeState(), hand: [{ instanceId: 1, type }] };
}

describe("logForTransition", () => {
  it("announces routing options when a draw takes a piece into hand", () => {
    const prev = makeState();
    const next = reduce(prev, { type: "DRAW" });
    expect(next.held).not.toBeNull();

    expect(logForTransition(prev, next)).toEqual([
      { tone: "info", text: "Drag onto the board, or into the queue to park." },
    ]);
  });

  it("uses the forced variant when the queue was full at draw time", () => {
    const prev = makeState();
    const drawn = reduce(prev, { type: "DRAW" });
    const next = { ...drawn, held: { ...drawn.held!, fullQueueForce: true } };

    expect(logForTransition(prev, next)).toEqual([
      {
        tone: "info",
        text: "Queue is full — drag the new tile, or a queued one, onto the board.",
      },
    ]);
  });

  it("announces the second-look choice on entering the phase, once", () => {
    const idle = withCard("secondLook");
    const armed = reduce(idle, { type: "PLAY_CARD", instanceId: 1 });
    const looked = reduce(armed, { type: "DRAW" });
    expect(looked.phase).toBe("secondLook");

    // the capture is held by the window, not the hand — no routing hint yet
    expect(logForTransition(armed, looked)).toEqual([
      { tone: "info", text: "Click the captured tile to keep it, or draw again." },
    ]);
    // staying in the phase re-announces nothing
    expect(logForTransition(looked, looked)).toEqual([]);
  });

  it("announces the mandatory keep when the second draw lands", () => {
    const looked = applyAll(withCard("secondLook"), [
      { type: "PLAY_CARD", instanceId: 1 },
      { type: "DRAW" },
    ]);
    const both = reduce(looked, { type: "DRAW" });
    expect(both.secondLook.drawsUsed).toBe(2);

    expect(logForTransition(looked, both)).toEqual([
      { tone: "info", text: "Keep one — the other goes back." },
    ]);
  });

  it("announces the governed speed when Governor engages", () => {
    const prev = withCard("governor");
    const next = reduce(prev, { type: "PLAY_CARD", instanceId: 1 });
    expect(next.machine.governorActive).toBe(true);

    expect(logForTransition(prev, next)).toEqual([
      {
        tone: "info",
        text: `Governor: running at ${prev.config.machine.comfortableMs}ms this draw.`,
      },
    ]);
  });

  it("prompts the next draw when a turn ends back in idle", () => {
    // PARK, not PLACE: parking draws no card, so the hand stays empty and
    // the prompt has no card slot to offer.
    const routing = reduce(makeState(), { type: "DRAW" });
    const next = reduce(routing, { type: "PARK" });
    expect(next.phase).toBe("idle");

    expect(logForTransition(routing, next)).toEqual([
      { tone: "info", text: "Draw a tile." },
    ]);
  });

  it("offers the card slot in the prompt when a card is in hand", () => {
    // A placement pays out a card (the economy), so the very next prompt
    // already offers the slot.
    const routing = reduce(makeState(), { type: "DRAW" });
    const next = reduce(routing, { type: "PLACE", cell: asCellIndex(0) });
    expect(next.hand.length).toBeGreaterThan(0);

    expect(logForTransition(routing, next)).toEqual([
      { tone: "info", text: "Draw a tile, or insert a card." },
    ]);
  });

  it("prompts after an Action-B queue placement too — any finished turn counts", () => {
    const parked = applyAll(makeState(), [{ type: "DRAW" }, { type: "PARK" }]);
    const next = reduce(parked, {
      type: "PLACE_FROM_QUEUE",
      queued: parked.queue[0],
      cell: asCellIndex(0),
    });
    expect(next.turnCount).toBe(parked.turnCount + 1);

    // the queue placement drew a card, so this prompt offers the slot too
    expect(logForTransition(parked, next)).toEqual([
      { tone: "info", text: "Draw a tile, or insert a card." },
    ]);
  });

  it("does not prompt a draw when the pool ran dry", () => {
    const routing = reduce(makeState(), { type: "DRAW" });
    const placed = reduce(routing, { type: "PLACE", cell: asCellIndex(0) });
    // Synthesize the dry pool: only the fields the helper reads must cohere,
    // and draining a full board organically would end the game instead.
    const next = { ...placed, pool: [] };

    expect(logForTransition(routing, next)).toEqual([]);
  });

  it("stays silent for routine machine actions", () => {
    const prev = makeState();
    for (const action of [
      { type: "ADVANCE_MACHINE" } as const,
      { type: "TOGGLE_SPEED" } as const,
    ]) {
      expect(logForTransition(prev, reduce(prev, action))).toEqual([]);
    }
  });
});
