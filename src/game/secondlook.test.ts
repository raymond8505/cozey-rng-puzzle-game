import { describe, it, expect } from "vitest";
import { reduce } from "./reducer";
import { resolveCard } from "./cards";
import { currentDisplayedPiece } from "./selectors";
import { makeState } from "@/fixtures/game.fixture";
import type { Card, GameState } from "./types";

const secondLookHand: Card[] = [{ instanceId: 1, type: "secondLook" }];

function armAndDrawTwice(state: GameState) {
  const s: GameState = { ...state, hand: secondLookHand };
  const armed = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
  const first = reduce(armed, { type: "DRAW" });
  const firstPiece = first.secondLook.firstCapture!;
  const second = reduce(first, { type: "DRAW" });
  const secondPiece = second.secondLook.secondCapture!;
  return { armed, first, second, firstPiece, secondPiece };
}

describe("Second Look", () => {
  it("arms on a pool of >= 2 and allows two draws", () => {
    const { armed, first, second, firstPiece, secondPiece } = armAndDrawTwice(makeState());
    expect(armed.secondLook.armed).toBe(true);
    expect(armed.lastCardResult).toMatchObject({ effect: "secondLookArmed" });

    expect(first.phase).toBe("secondLook");
    expect(first.secondLook.drawsUsed).toBe(1);
    expect(second.secondLook.drawsUsed).toBe(2);
    expect(firstPiece).not.toBe(secondPiece);
    // both provisionally removed from the pool
    expect(second.pool).not.toContain(firstPiece);
    expect(second.pool).not.toContain(secondPiece);
  });

  it("keeping the first returns the unkept second to the pool", () => {
    const s0 = makeState();
    const { second, firstPiece, secondPiece } = armAndDrawTwice(s0);
    const kept = reduce(second, { type: "SECOND_LOOK_KEEP", which: "first" });
    expect(kept.held?.piece).toBe(firstPiece);
    expect(kept.phase).toBe("routing");
    expect(kept.pool).toContain(secondPiece); // returned to pool
    expect(kept.pool).not.toContain(firstPiece); // now held
    expect(kept.pool).toHaveLength(s0.pool.length - 1);
  });

  it("keeping the second returns the unkept first to the pool", () => {
    const { second, firstPiece, secondPiece } = armAndDrawTwice(makeState());
    const kept = reduce(second, { type: "SECOND_LOOK_KEEP", which: "second" });
    expect(kept.held?.piece).toBe(secondPiece);
    expect(kept.pool).toContain(firstPiece);
  });

  it("allows keeping the first after declining the second draw", () => {
    const s0 = makeState();
    const s: GameState = { ...s0, hand: secondLookHand };
    const armed = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    const first = reduce(armed, { type: "DRAW" });
    const firstPiece = first.secondLook.firstCapture!;
    const kept = reduce(first, { type: "SECOND_LOOK_KEEP", which: "first" });
    expect(kept.held?.piece).toBe(firstPiece);
    expect(kept.pool).toHaveLength(s0.pool.length - 1); // nothing returned
  });

  it("rejects keeping the second when only one draw happened", () => {
    const s: GameState = { ...makeState(), hand: secondLookHand };
    const armed = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    const first = reduce(armed, { type: "DRAW" });
    const attempt = reduce(first, { type: "SECOND_LOOK_KEEP", which: "second" });
    expect(attempt.lastRejection).toBe("noSecondDraw");
  });

  it("no-effects when only one piece remains in the pool", () => {
    const base = makeState();
    const only = currentDisplayedPiece(base)!;
    const s: GameState = { ...base, hand: secondLookHand, pool: [only] };
    expect(resolveCard(s, "secondLook")).toEqual({
      kind: "noEffect",
      card: "secondLook",
      reasonCode: "secondLook.onePieceLeft",
    });
    const played = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
    expect(played.secondLook.armed).toBe(false);
    expect(played.cardPlayedThisTurn).toBe(true);
  });
});
