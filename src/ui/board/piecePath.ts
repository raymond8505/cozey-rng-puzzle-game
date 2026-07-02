// Pure SVG path construction from the core's normalized edge data. Presentation
// only — no React. A piece outline is built at its HOME cell; the Board then
// translates the whole clipped group by (targetCell - homeCell) to draw a piece
// sitting on any cell while still showing its own picture crop.
//
// Interlock invariant: two pieces sharing a seam must trace the SAME curve. The
// knob is centered at f=0.5 and its depth carries the seam's shared wobble, so
// the profile is symmetric about the edge midpoint. That symmetry makes the two
// sides coincide even though neighbors draw the seam in opposite directions.

import type { GridDims } from "@/game/grid";
import { colOf, rowOf } from "@/game/grid";
import type { CellIndex, Edge, Piece } from "@/game/types";

/** Normalized cell unit; the board viewBox is cols*UNIT × rows*UNIT. */
export const UNIT = 100;

type Vec = readonly [number, number];

const add = (p: Vec, q: Vec): Vec => [p[0] + q[0], p[1] + q[1]];
const scale = (p: Vec, k: number): Vec => [p[0] * k, p[1] * k];
const fmt = (p: Vec): string => `${round(p[0])} ${round(p[1])}`;
const round = (n: number): number => Math.round(n * 1000) / 1000;

/** One edge from A to B, `out` = unit outward normal (away from cell center). */
function edgeCommands(a: Vec, b: Vec, out: Vec, edge: Edge): string {
  if (edge.sign === 0) return `L ${fmt(b)}`;

  const along: Vec = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(along[0], along[1]);
  const u: Vec = [along[0] / len, along[1] / len];

  // point at fraction f along the edge, offset o (fraction of len) outward
  const p = (f: number, o: number): Vec =>
    add(add(a, scale(u, f * len)), scale(out, o * len * edge.sign));

  const depth = 0.22 + edge.wobble; // shared per seam => both sides match
  const shoulder = 0.05;

  return [
    `L ${fmt(p(0.36, 0))}`,
    `C ${fmt(p(0.3, shoulder))} ${fmt(p(0.3, depth))} ${fmt(p(0.5, depth))}`,
    `C ${fmt(p(0.7, depth))} ${fmt(p(0.7, shoulder))} ${fmt(p(0.64, 0))}`,
    `L ${fmt(b)}`,
  ].join(" ");
}

/** SVG `d` for a piece outline positioned at its HOME cell. */
export function homePiecePath(piece: Piece, dims: GridDims, unit = UNIT): string {
  const col = colOf(piece.home, dims);
  const row = rowOf(piece.home, dims);
  const x0 = col * unit;
  const y0 = row * unit;

  const tl: Vec = [x0, y0];
  const tr: Vec = [x0 + unit, y0];
  const br: Vec = [x0 + unit, y0 + unit];
  const bl: Vec = [x0, y0 + unit];

  const { top, right, bottom, left } = piece.edges;
  return [
    `M ${fmt(tl)}`,
    edgeCommands(tl, tr, [0, -1], top), // top: outward = up
    edgeCommands(tr, br, [1, 0], right), // right: outward = right
    edgeCommands(br, bl, [0, 1], bottom), // bottom: outward = down
    edgeCommands(bl, tl, [-1, 0], left), // left: outward = left
    "Z",
  ].join(" ");
}

/** Pixel offset (in viewBox units) to move a home-positioned piece onto `cell`. */
export function cellOffset(
  piece: Piece,
  cell: CellIndex,
  dims: GridDims,
  unit = UNIT,
): Vec {
  const dCol = colOf(cell, dims) - colOf(piece.home, dims);
  const dRow = rowOf(cell, dims) - rowOf(piece.home, dims);
  return [dCol * unit, dRow * unit];
}
