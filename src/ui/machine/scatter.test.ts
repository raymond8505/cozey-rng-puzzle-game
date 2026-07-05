import { describe, it, expect, beforeEach } from "vitest";
import { scatterFor, _resetForTests } from "./scatter";
import { asPieceId, type PieceId } from "@/game/types";

const ids = (...ns: number[]): PieceId[] => ns.map(asPieceId);

describe("scatterFor", () => {
  beforeEach(() => {
    _resetForTests();
  });

  it("keeps every throw inside the tray bounds and the ±25deg tilt range", () => {
    for (let round = 0; round < 50; round++) {
      _resetForTests();
      const queue = ids(1, 2, 3);
      const scatter = scatterFor(queue, 3);
      for (const id of queue) {
        const t = scatter.get(id)!;
        expect(t.xPct).toBeGreaterThanOrEqual(12);
        expect(t.xPct).toBeLessThanOrEqual(88);
        expect(t.yPct).toBeGreaterThanOrEqual(32);
        expect(t.yPct).toBeLessThanOrEqual(68);
        expect(t.rotDeg).toBeGreaterThanOrEqual(-25);
        expect(t.rotDeg).toBeLessThanOrEqual(25);
      }
    }
  });

  it("returns the same throw for the same piece across calls", () => {
    const first = scatterFor(ids(7), 3).get(asPieceId(7));
    const second = scatterFor(ids(7), 3).get(asPieceId(7));
    expect(second).toBe(first);
  });

  it("re-tosses a piece that left the queue and came back", () => {
    const first = scatterFor(ids(7), 3).get(asPieceId(7));
    scatterFor(ids(), 3); // piece placed on the board
    const again = scatterFor(ids(7), 3).get(asPieceId(7)); // parked again
    expect(again).not.toBe(first);
  });

  it("prunes departed pieces while keeping the rest in place", () => {
    const kept = scatterFor(ids(1, 2), 3).get(asPieceId(1));
    const after = scatterFor(ids(1), 3);
    expect(after.get(asPieceId(1))).toBe(kept);
    expect(after.has(asPieceId(2))).toBe(false);
  });

  it("spreads simultaneous arrivals across distinct bands", () => {
    // Three pieces, three bands: least-occupied selection guarantees one each.
    const scatter = scatterFor(ids(1, 2, 3), 3);
    const bandWidth = (88 - 12) / 3;
    const bands = ids(1, 2, 3).map((id) =>
      Math.floor((scatter.get(id)!.xPct - 12) / bandWidth),
    );
    expect(new Set(bands).size).toBe(3);
  });
});
