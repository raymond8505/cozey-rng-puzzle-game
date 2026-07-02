import type { GameState } from "@/game/types";
import { asCellIndex } from "@/game/types";
import { gridDims } from "@/game/selectors";
import puzzleUrl from "@/assets/puzzle.jpg";
import { UNIT } from "./piecePath";
import { PieceView } from "./PieceView";
import { EmptyCell } from "./EmptyCell";

interface BoardProps {
  state: GameState;
}

/** The jigsaw board: a single source image revealed piece-by-piece as cells
 *  fill. Scales to any cols×rows via viewBox — no pixel constants. */
export function Board({ state }: BoardProps) {
  const dims = gridDims(state);
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
              imageHref={puzzleUrl}
            />
          ),
        )}
      </svg>
    </div>
  );
}
