// @vitest-environment jsdom
//
// resolveDropAt scans the WHOLE elementsFromPoint stack for a data-drop token
// — not just the topmost element. That contract is what lets drop pads sit at
// z-index -1 (CardSlot hitbox) or under other chrome and still resolve.
// jsdom has no layout, so the stack itself is stubbed.

import { describe, it, expect, afterEach, vi } from "vitest";
import { resolveDropAt } from "./resolveDrop";

/** Stub the hit-test stack: one element per token (null = no data-drop). */
function stubStack(...tokens: (string | null)[]) {
  const els = tokens.map((t) => {
    const el = document.createElement("div");
    if (t !== null) el.dataset.drop = t;
    return el;
  });
  document.elementsFromPoint = vi.fn(() => els);
}

afterEach(() => vi.restoreAllMocks());

describe("resolveDropAt", () => {
  it("parses every target kind", () => {
    for (const [token, expected] of [
      ["queue", { kind: "queue" }],
      ["slot", { kind: "slot" }],
      ["window", { kind: "window" }],
      ["cell:7", { kind: "cell", cell: 7 }],
    ] as const) {
      stubStack(token);
      expect(resolveDropAt(0, 0)).toEqual(expected);
    }
  });

  it("scans past covering elements without a token", () => {
    stubStack(null, null, "window");
    expect(resolveDropAt(0, 0)).toEqual({ kind: "window" });
  });

  it("takes the topmost token when targets overlap", () => {
    stubStack("queue", "window");
    expect(resolveDropAt(0, 0)).toEqual({ kind: "queue" });
  });

  it("misses cleanly on garbage or token-free stacks", () => {
    stubStack("cell:nope");
    expect(resolveDropAt(0, 0)).toBeNull();
    stubStack(null);
    expect(resolveDropAt(0, 0)).toBeNull();
  });
});
