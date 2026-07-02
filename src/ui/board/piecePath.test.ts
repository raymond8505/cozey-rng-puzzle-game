import { describe, it, expect } from "vitest";
import { Rng, hashSeed } from "@/game/rng";
import { generatePieces } from "@/game/pieces";
import { asCellIndex } from "@/game/types";
import { homePiecePath, cellOffset, UNIT } from "./piecePath";

const dims = { cols: 6, rows: 4 };
const pieces = generatePieces(dims, new Rng(hashSeed("dev-seed")));

describe("homePiecePath", () => {
  it("produces a closed path anchored at the home cell", () => {
    const corner = pieces[0]; // cell 0 -> top-left
    const d = homePiecePath(corner, dims);
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d.trimEnd().endsWith("Z")).toBe(true);
  });

  it("is deterministic for the same piece", () => {
    expect(homePiecePath(pieces[7], dims)).toBe(homePiecePath(pieces[7], dims));
  });

  it("draws straight lines (no knob curves) on board-border edges", () => {
    // top-left corner: top and left edges are flat, so the outline has fewer
    // cubic segments than an interior piece.
    const cornerCurves = (homePiecePath(pieces[0], dims).match(/C /g) ?? []).length;
    const interior = pieces.find((p) => p.edgeClass === "interior")!;
    const interiorCurves = (homePiecePath(interior, dims).match(/C /g) ?? []).length;
    expect(cornerCurves).toBeLessThan(interiorCurves);
    // an interior piece has 4 knobbed edges -> 2 cubics each -> 8
    expect(interiorCurves).toBe(8);
  });
});

describe("cellOffset", () => {
  it("is zero when a piece is at its home cell", () => {
    expect(cellOffset(pieces[9], asCellIndex(9), dims)).toEqual([0, 0]);
  });

  it("translates by whole cells to a non-home target", () => {
    // piece home 0 (col0,row0) placed on cell 8 (col2,row1) -> (2*UNIT, 1*UNIT)
    expect(cellOffset(pieces[0], asCellIndex(8), dims)).toEqual([2 * UNIT, UNIT]);
  });
});
