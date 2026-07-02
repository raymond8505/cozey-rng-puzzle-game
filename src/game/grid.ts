// Pure cell-coordinate math. A board is a flat array of length cols*rows;
// cell index i maps to (col, row) = (i % cols, floor(i / cols)).

import type { CellIndex, EdgeClass } from "./types";
import { asCellIndex } from "./types";

export interface GridDims {
  readonly cols: number;
  readonly rows: number;
}

export const cellCount = (dims: GridDims): number => dims.cols * dims.rows;

export const colOf = (cell: CellIndex, dims: GridDims): number => cell % dims.cols;
export const rowOf = (cell: CellIndex, dims: GridDims): number =>
  Math.floor(cell / dims.cols);

export function classifyCell(cell: CellIndex, dims: GridDims): EdgeClass {
  const col = colOf(cell, dims);
  const row = rowOf(cell, dims);
  const onColEdge = col === 0 || col === dims.cols - 1;
  const onRowEdge = row === 0 || row === dims.rows - 1;
  if (onColEdge && onRowEdge) return "corner";
  if (onColEdge || onRowEdge) return "edge";
  return "interior";
}

/** Orthogonal (up/down/left/right) in-bounds neighbor cells. */
export function orthNeighbors(cell: CellIndex, dims: GridDims): CellIndex[] {
  const col = colOf(cell, dims);
  const row = rowOf(cell, dims);
  const out: CellIndex[] = [];
  if (row > 0) out.push(asCellIndex(cell - dims.cols));
  if (row < dims.rows - 1) out.push(asCellIndex(cell + dims.cols));
  if (col > 0) out.push(asCellIndex(cell - 1));
  if (col < dims.cols - 1) out.push(asCellIndex(cell + 1));
  return out;
}
