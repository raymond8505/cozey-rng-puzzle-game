import type { GameState } from "@/game/types";
import { gridDims, currentDisplayedPiece } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";

/** The single display window: shows whichever pool piece is currently up. No
 *  reel graphic — the candidate swaps in place at the current speed. */
export function MachineWindow({ state }: { state: GameState }) {
  const dims = gridDims(state);
  const current = currentDisplayedPiece(state);

  return (
    <div className="machine-window" data-drop-window>
      {current === null ? (
        <span className="machine-empty">empty</span>
      ) : (
        <PieceSprite piece={state.pieces[current]} dims={dims} className="machine-sprite" />
      )}
    </div>
  );
}
