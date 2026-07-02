import type { Piece } from "@/game/types";
import type { GridDims } from "@/game/grid";
import { homePiecePath } from "./piecePath";

interface EmptyCellProps {
  /** The piece whose home is this cell — drawn as a faint slot outline. */
  piece: Piece;
  dims: GridDims;
}

/** A faint jigsaw-shaped slot for an unfilled cell, hinting the cut. */
export function EmptyCell({ piece, dims }: EmptyCellProps) {
  return <path d={homePiecePath(piece, dims)} className="empty-slot" />;
}
