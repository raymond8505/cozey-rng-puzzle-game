import type { GameState } from "@/game/types";
import { gridDims, currentDisplayedPiece } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";
import { HeldToken } from "../dnd/HeldToken";

/** The single display window: shows whichever pool piece is currently up. No
 *  reel graphic — the candidate swaps in place at the current speed. Once a
 *  piece is chosen (drawn or crowbar-lifted) the window switches to its
 *  `chosen` state and the piece is dragged out of the window itself. */
export function MachineWindow({ state }: { state: GameState }) {
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

  return (
    <div className="machine-window">
      {current === null ? (
        <span className="machine-empty">empty</span>
      ) : (
        <PieceSprite piece={state.pieces[current]} dims={dims} className="machine-sprite" />
      )}
    </div>
  );
}
