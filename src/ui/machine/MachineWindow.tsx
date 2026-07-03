import type { GameState } from "@/game/types";
import { gridDims, currentDisplayedPiece } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";
import { HeldToken } from "../dnd/HeldToken";

/** The single display window: shows whichever pool piece is currently up. No
 *  reel graphic — the candidate swaps in place at the current speed. While
 *  cycling the window itself is a draw control (clicking captures the shown
 *  piece) whenever `onDraw` is provided. Once a piece is chosen (drawn or
 *  crowbar-lifted) the window switches to its `chosen` state and the piece is
 *  dragged out of the window itself. During Second Look the window expands
 *  horizontally (`choices`): captures render beside the still-cycling reel,
 *  and clicking a capture keeps it. Green background = a tile is waiting in
 *  the window to be grabbed. */
export function MachineWindow({
  state,
  onDraw,
  onKeep,
}: {
  state: GameState;
  /** Present iff drawing is legal right now (the caller gates on legalActions). */
  onDraw?: () => void;
  /** Present iff a Second Look capture can be kept right now. */
  onKeep?: (which: "first" | "second") => void;
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

  const { firstCapture, secondCapture } = state.secondLook;
  if (state.phase === "secondLook" && firstCapture !== null && onKeep) {
    return (
      <div
        className="machine-window chosen choices"
        aria-label="Second Look — click a captured piece to keep it"
      >
        <button
          type="button"
          className="window-piece capture"
          aria-label="Keep this piece"
          onClick={() => onKeep("first")}
        >
          <PieceSprite piece={state.pieces[firstCapture]} dims={dims} className="machine-sprite" />
        </button>
        {secondCapture !== null ? (
          <button
            type="button"
            className="window-piece capture"
            aria-label="Keep this piece"
            onClick={() => onKeep("second")}
          >
            <PieceSprite
              piece={state.pieces[secondCapture]}
              dims={dims}
              className="machine-sprite"
            />
          </button>
        ) : (
          // second draw still open: the reel keeps cycling beside the capture
          onDraw &&
          current !== null && (
            <button
              type="button"
              className="window-piece"
              aria-label="Draw the displayed piece"
              onClick={onDraw}
            >
              <PieceSprite piece={state.pieces[current]} dims={dims} className="machine-sprite" />
            </button>
          )
        )}
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
