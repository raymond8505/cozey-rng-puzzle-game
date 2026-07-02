import { describe, it, expect } from "vitest";
import { Rng, hashSeed } from "./rng";
import { generatePieces } from "./pieces";
import { classifyCell, orthNeighbors } from "./grid";
import { asCellIndex } from "./types";

const dims6x4 = { cols: 6, rows: 4 };

describe("grid classification", () => {
  it("classifies corners, edges, and interior for 6x4", () => {
    const { cols, rows } = dims6x4;
    expect(classifyCell(asCellIndex(0), dims6x4)).toBe("corner");
    expect(classifyCell(asCellIndex(cols - 1), dims6x4)).toBe("corner");
    expect(classifyCell(asCellIndex((rows - 1) * cols), dims6x4)).toBe("corner");
    expect(classifyCell(asCellIndex(cols * rows - 1), dims6x4)).toBe("corner");
    // top row middle -> edge
    expect(classifyCell(asCellIndex(2), dims6x4)).toBe("edge");
    // an interior cell (col 2, row 1) -> index 8
    expect(classifyCell(asCellIndex(8), dims6x4)).toBe("interior");
  });

  it("orthNeighbors respects bounds", () => {
    expect(orthNeighbors(asCellIndex(0), dims6x4).sort()).toEqual([1, 6]);
    // interior cell 8 (col2,row1) neighbors: 2,14,7,9
    expect(orthNeighbors(asCellIndex(8), dims6x4).sort((a, b) => a - b)).toEqual([
      2, 7, 9, 14,
    ]);
  });
});

describe("piece geometry generation", () => {
  it("produces one piece per cell with identity home", () => {
    const pieces = generatePieces(dims6x4, new Rng(hashSeed("seed")));
    expect(pieces).toHaveLength(24);
    pieces.forEach((p, i) => {
      expect(p.id).toBe(i);
      expect(p.home).toBe(i);
    });
  });

  it("adjacent pieces share complementary edges (tab meets blank)", () => {
    const { cols, rows } = dims6x4;
    const pieces = generatePieces(dims6x4, new Rng(hashSeed("seed")));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const piece = pieces[i];
        if (col < cols - 1) {
          const right = pieces[i + 1];
          expect(piece.edges.right.sign).toBe(-right.edges.left.sign);
          expect(piece.edges.right.wobble).toBe(right.edges.left.wobble);
          expect(piece.edges.right.sign).not.toBe(0);
        }
        if (row < rows - 1) {
          const below = pieces[i + cols];
          expect(piece.edges.bottom.sign).toBe(-below.edges.top.sign);
          expect(piece.edges.bottom.wobble).toBe(below.edges.top.wobble);
          expect(piece.edges.bottom.sign).not.toBe(0);
        }
      }
    }
  });

  it("board-border edges are flat", () => {
    const { cols, rows } = dims6x4;
    const pieces = generatePieces(dims6x4, new Rng(hashSeed("seed")));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const p = pieces[row * cols + col];
        if (col === 0) expect(p.edges.left.sign).toBe(0);
        if (col === cols - 1) expect(p.edges.right.sign).toBe(0);
        if (row === 0) expect(p.edges.top.sign).toBe(0);
        if (row === rows - 1) expect(p.edges.bottom.sign).toBe(0);
      }
    }
  });

  it("same seed => identical geometry; different seed differs", () => {
    const a = generatePieces(dims6x4, new Rng(hashSeed("seed")));
    const b = generatePieces(dims6x4, new Rng(hashSeed("seed")));
    const c = generatePieces(dims6x4, new Rng(hashSeed("other")));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("works for arbitrary grid sizes with zero code changes", () => {
    for (const dims of [
      { cols: 4, rows: 3 },
      { cols: 8, rows: 6 },
      { cols: 1, rows: 1 },
    ]) {
      const pieces = generatePieces(dims, new Rng(hashSeed("x")));
      expect(pieces).toHaveLength(dims.cols * dims.rows);
    }
  });
});
