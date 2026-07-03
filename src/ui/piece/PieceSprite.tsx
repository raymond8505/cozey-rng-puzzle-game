import { useId } from "react";
import type { Piece } from "@/game/types";
import type { GridDims } from "@/game/grid";
import { colOf, rowOf } from "@/game/grid";
import { useGame } from "../store";
import { homePiecePath, UNIT } from "../board/piecePath";

interface PieceSpriteProps {
  piece: Piece;
  dims: GridDims;
  /** Fraction of a cell to pad around the piece so knobs aren't clipped. */
  pad?: number;
  className?: string;
}

/** A single jigsaw piece rendered standalone: its own picture crop clipped to
 *  its outline, framed with padding for the tabs. Used in the Machine window,
 *  the drag token, and the queue. */
export function PieceSprite({ piece, dims, pad = 0.32, className }: PieceSpriteProps) {
  const clipId = useId();
  const puzzleSrc = useGame((s) => s.puzzleSrc);
  const x0 = colOf(piece.home, dims) * UNIT;
  const y0 = rowOf(piece.home, dims) * UNIT;
  const p = pad * UNIT;
  const path = homePiecePath(piece, dims);

  return (
    <svg
      className={className}
      viewBox={`${x0 - p} ${y0 - p} ${UNIT + 2 * p} ${UNIT + 2 * p}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <image
          href={puzzleSrc}
          x={0}
          y={0}
          width={dims.cols * UNIT}
          height={dims.rows * UNIT}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
      <path d={path} className="piece-outline" />
    </svg>
  );
}
