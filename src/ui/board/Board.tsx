import type { GameState } from "@/game/types";
import { asCellIndex } from "@/game/types";
import { gridDims } from "@/game/selectors";
import { useGame } from "../store";
import { UNIT } from "./piecePath";
import { PieceView } from "./PieceView";
import { EmptyCell } from "./EmptyCell";

interface BoardProps {
  state: GameState;
  /** When true, empty cells become drag-drop targets (data-drop="cell:i"). */
  dropActive?: boolean;
  /** When true, placed cells become clickable crowbar lift targets. */
  liftActive?: boolean;
  onLiftCell?: (cell: number) => void;
}

/** The jigsaw board: a single source image revealed piece-by-piece as cells
 *  fill. Scales to any cols×rows via viewBox — no pixel constants. */
export function Board({
  state,
  dropActive = false,
  liftActive = false,
  onLiftCell,
}: BoardProps) {
  const dims = gridDims(state);
  const puzzleSrc = useGame((s) => s.puzzleSrc);
  const boardW = dims.cols * UNIT;
  const boardH = dims.rows * UNIT;

  return (
    <div
      className="board-frame"
      style={{ aspectRatio: `${dims.cols} / ${dims.rows}` }}
    >
      <svg
        className="board-svg"
        viewBox={`0 0 ${boardW} ${boardH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Puzzle board"
      >
        {state.board.map((occupant, cell) =>
          occupant === null ? (
            <EmptyCell key={cell} piece={state.pieces[cell]} dims={dims} />
          ) : (
            <PieceView
              key={cell}
              piece={state.pieces[occupant]}
              cell={asCellIndex(cell)}
              dims={dims}
              imageHref={puzzleSrc}
            />
          ),
        )}

        {dropActive &&
          state.board.map((occupant, cell) =>
            occupant !== null ? null : (
              <rect
                key={`drop-${cell}`}
                className="cell-drop"
                data-drop={`cell:${cell}`}
                x={(cell % dims.cols) * UNIT}
                y={Math.floor(cell / dims.cols) * UNIT}
                width={UNIT}
                height={UNIT}
              />
            ),
          )}

        {liftActive &&
          state.board.map((occupant, cell) =>
            occupant === null ? null : (
              <rect
                key={`lift-${cell}`}
                className="cell-lift"
                x={(cell % dims.cols) * UNIT}
                y={Math.floor(cell / dims.cols) * UNIT}
                width={UNIT}
                height={UNIT}
                onClick={() => onLiftCell?.(cell)}
              />
            ),
          )}
      </svg>
    </div>
  );
}
