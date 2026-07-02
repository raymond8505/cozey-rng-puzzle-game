// Seeded jigsaw-piece data generation. Produces normalized geometry data only
// (edge sign + wobble per side); the SVG <path> construction (PR 2) is pure
// presentation derived from this data and lives in the UI/geometry layer.
//
// Home mapping is identity (piece.id === piece.home): the assembled picture is
// THE picture, and a placement is correct iff the piece sits on its own id's
// cell. Per-seed variety comes from edge shapes and the shuffled pool order
// (machine sequence), which is what "same seed => same geometry" pins down.

import type { GridDims } from "./grid";
import { classifyCell, orthNeighbors } from "./grid";
import type { Edge, Piece, PieceEdges, PieceId } from "./types";
import { asCellIndex, asPieceId } from "./types";
import { Rng } from "./rng";

const FLAT: Edge = { sign: 0, wobble: 0 };
const WOBBLE_RANGE = 0.05;

/** Complementary tab/blank edges keyed by cell adjacency. A seam between two
 *  cells gets one sign; the two sides take +sign and -sign so tabs meet blanks.
 *  Returned as a lookup: edgesByCell[cell] = { top, right, bottom, left }. */
export function generatePieces(dims: GridDims, rng: Rng): Piece[] {
  const { cols, rows } = dims;

  // Seam sign/wobble for every internal seam, generated in a fixed scan order
  // so the same seed yields the same shapes.
  // vertical seam v[col][row] separates (col,row) | (col+1,row): col in 0..cols-2
  // horizontal seam h[col][row] separates (col,row) / (col,row+1): row in 0..rows-2
  const vSign: number[][] = [];
  const vWob: number[][] = [];
  const hSign: number[][] = [];
  const hWob: number[][] = [];

  for (let col = 0; col < cols - 1; col++) {
    vSign[col] = [];
    vWob[col] = [];
    for (let row = 0; row < rows; row++) {
      vSign[col][row] = rng.next() < 0.5 ? -1 : 1;
      vWob[col][row] = rng.float(-WOBBLE_RANGE, WOBBLE_RANGE);
    }
  }
  for (let col = 0; col < cols; col++) {
    hSign[col] = [];
    hWob[col] = [];
    for (let row = 0; row < rows - 1; row++) {
      hSign[col][row] = rng.next() < 0.5 ? -1 : 1;
      hWob[col][row] = rng.float(-WOBBLE_RANGE, WOBBLE_RANGE);
    }
  }

  const edge = (sign: number, wobble: number): Edge => ({
    sign: sign as Edge["sign"],
    wobble,
  });

  const pieces: Piece[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = asCellIndex(row * cols + col);

      const right: Edge =
        col === cols - 1 ? FLAT : edge(vSign[col][row], vWob[col][row]);
      const left: Edge =
        col === 0 ? FLAT : edge(-vSign[col - 1][row], vWob[col - 1][row]);
      const bottom: Edge =
        row === rows - 1 ? FLAT : edge(hSign[col][row], hWob[col][row]);
      const top: Edge =
        row === 0 ? FLAT : edge(-hSign[col][row - 1], hWob[col][row - 1]);

      const edges: PieceEdges = { top, right, bottom, left };
      pieces.push({
        id: asPieceId(cell),
        home: cell,
        edgeClass: classifyCell(cell, dims),
        edges,
      });
    }
  }

  return pieces;
}

/** PieceIds whose home cell is on the board border (edge or corner). */
export function edgePieceIds(pieces: readonly Piece[]): PieceId[] {
  return pieces.filter((p) => p.edgeClass !== "interior").map((p) => p.id);
}

/** PieceIds whose home cell is orthogonally adjacent to any filled cell. */
export function neighborPieceIds(
  candidates: readonly PieceId[],
  pieces: readonly Piece[],
  board: readonly (PieceId | null)[],
  dims: GridDims,
): PieceId[] {
  return candidates.filter((id) =>
    orthNeighbors(pieces[id].home, dims).some((n) => board[n] !== null),
  );
}
