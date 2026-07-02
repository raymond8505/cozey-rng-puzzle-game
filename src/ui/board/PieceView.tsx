import type { CellIndex, Piece } from "@/game/types";
import type { GridDims } from "@/game/grid";
import { homePiecePath, cellOffset, UNIT } from "./piecePath";

interface PieceViewProps {
  piece: Piece;
  cell: CellIndex;
  dims: GridDims;
  imageHref: string;
}

/** A placed piece: its home picture crop, clipped to its jigsaw outline, then
 *  translated onto its current cell. When cell === home it aligns seamlessly. */
export function PieceView({ piece, cell, dims, imageHref }: PieceViewProps) {
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
    </g>
  );
}
