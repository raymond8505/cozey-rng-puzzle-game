import { motion } from "motion/react";
import type { CellIndex, Piece } from "@/game/types";
import type { GridDims } from "@/game/grid";
import { homePiecePath, cellOffset, UNIT } from "./piecePath";

interface PieceViewProps {
  piece: Piece;
  cell: CellIndex;
  dims: GridDims;
  imageHref: string;
  /** A misplaced piece overlapping a filled neighbor — drawn raised, casting a
   *  shadow at the seam so it's clear it can't seat (something's under it). */
  raised?: boolean;
}

/** A placed piece: its home picture crop, clipped to its jigsaw outline, then
 *  translated onto its current cell. When cell === home it aligns seamlessly. */
export function PieceView({ piece, cell, dims, imageHref, raised = false }: PieceViewProps) {
  const path = homePiecePath(piece, dims);
  const [dx, dy] = cellOffset(piece, cell, dims);
  const clipId = `clip-piece-${piece.id}`;
  const boardW = dims.cols * UNIT;
  const boardH = dims.rows * UNIT;

  return (
    <g transform={`translate(${dx} ${dy})`}>
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>
      {/* Inner group animates the settle-in on placement; the outer group keeps
          the (static) cell translation so the two transforms don't fight. */}
      <motion.g
        className={raised ? "piece-raised" : undefined}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <g clipPath={`url(#${clipId})`}>
          <image
            href={imageHref}
            x={0}
            y={0}
            width={boardW}
            height={boardH}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
        <path d={path} className="piece-outline" />
      </motion.g>
    </g>
  );
}
