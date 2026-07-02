import { describe, it, expect } from "vitest";
import { hashSeed, Rng, shuffle } from "./rng";

describe("rng", () => {
  it("hashSeed is deterministic and 32-bit unsigned", () => {
    const a = hashSeed("dev-seed");
    const b = hashSeed("dev-seed");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(0xffffffff);
    expect(hashSeed("dev-seed")).not.toBe(hashSeed("other-seed"));
  });

  it("produces the same stream for the same seed", () => {
    const seed = hashSeed("abc");
    const r1 = new Rng(seed);
    const r2 = new Rng(seed);
    const s1 = Array.from({ length: 10 }, () => r1.next());
    const s2 = Array.from({ length: 10 }, () => r2.next());
    expect(s1).toEqual(s2);
    for (const v of s1) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int stays within range", () => {
    const r = new Rng(hashSeed("range"));
    for (let i = 0; i < 100; i++) {
      const v = r.int(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("shuffle is a deterministic permutation", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const a = shuffle(items, new Rng(hashSeed("s")));
    const b = shuffle(items, new Rng(hashSeed("s")));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    // does not mutate input
    expect(items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
