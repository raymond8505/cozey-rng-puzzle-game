// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mintSeed, readSeed } from "./seed";

// jsdom is required here: readSeed's browser branch reads window.location,
// and the URL is steered per test via history.replaceState.

describe("mintSeed", () => {
  it("mints distinct seeds across calls", () => {
    const seeds = new Set(Array.from({ length: 20 }, mintSeed));
    expect(seeds.size).toBe(20);
  });
});

describe("readSeed", () => {
  it("honors the ?seed= param for reproducible playtests", () => {
    window.history.replaceState(null, "", "/?seed=pinned");
    expect(readSeed()).toBe("pinned");
  });

  it("mints a fresh seed per read when no param is given", () => {
    window.history.replaceState(null, "", "/");
    expect(readSeed()).not.toBe(readSeed());
  });
});
