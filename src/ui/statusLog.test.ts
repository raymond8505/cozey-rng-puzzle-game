// logForTransition turns reducer state diffs into console hint lines. These
// tests pin the edge-triggered behavior: each hint fires exactly when its
// condition BECOMES true, and routine actions produce no lines at all.

import { describe, it, expect } from "vitest";
import { reduce } from "@/game/reducer";
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
        text: "Queue is full — drag the new piece, or a queued one, onto the board.",
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
      { tone: "info", text: "Click the captured piece to keep it, or draw again." },
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
