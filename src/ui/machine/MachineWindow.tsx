import type { GameState } from "@/game/types";
import { gridDims, currentDisplayedPiece } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";
import { HeldToken } from "../dnd/HeldToken";

/** The single display window: shows whichever pool piece is currently up. No
 *  reel graphic — the candidate swaps in place at the current speed. While
 *  cycling the window itself is a draw control (clicking captures the shown
 *  piece) whenever `onDraw` is provided. Once a piece is chosen (drawn or
 *  crowbar-lifted) the window switches to its `chosen` state and the piece is
 *  dragged out of the window itself. */
export function MachineWindow({
  state,
  onDraw,
}: {
  state: GameState;
  /** Present iff drawing is legal right now (the caller gates on legalActions). */
  onDraw?: () => void;
}) {
  const dims = gridDims(state);
  const current = currentDisplayedPiece(state);

  if (state.held !== null) {
    return (
      <div
        className="machine-window chosen"
        aria-label="Chosen piece — drag it onto the board or queue"
      >
        <HeldToken />
      </div>
    );
  }

  const sprite =
    current === null ? (
      <span className="machine-empty">empty</span>
    ) : (
      <PieceSprite piece={state.pieces[current]} dims={dims} className="machine-sprite" />
    );

  if (onDraw && current !== null) {
    return (
      <button
        type="button"
        className="machine-window"
        aria-label="Draw the displayed piece"
        onClick={onDraw}
      >
        {sprite}
      </button>
    );
  }

  return <div className="machine-window">{sprite}</div>;
}
