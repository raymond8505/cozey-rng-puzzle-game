import { useGame } from "../store";
import { gridDims } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";

/** Second Look chooser: shown in the `secondLook` phase so the player can keep
 *  a captured piece. After one draw, keep it or draw again; after the second
 *  draw, pick either (the unkept piece returns to the pool). Keeping sets the
 *  held piece and hands off to RoutingTray for place/park. */
export function SecondLookTray() {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  if (state.phase !== "secondLook") return null;

  const dims = gridDims(state);
  const { firstCapture, secondCapture, drawsUsed } = state.secondLook;
  if (firstCapture === null) return null;

  if (drawsUsed >= 2 && secondCapture !== null) {
    return (
      <section className="secondlook-tray" aria-label="Second Look — keep one">
        <p className="routing-hint">Keep one — the other goes back.</p>
        <div className="secondlook-choices">
          <div className="secondlook-choice">
            <PieceSprite piece={state.pieces[firstCapture]} dims={dims} className="secondlook-sprite" />
            <button
              className="keep-btn"
              onClick={() => dispatch({ type: "SECOND_LOOK_KEEP", which: "first" })}
            >
              Keep this
            </button>
          </div>
          <div className="secondlook-choice">
            <PieceSprite piece={state.pieces[secondCapture]} dims={dims} className="secondlook-sprite" />
            <button
              className="keep-btn"
              onClick={() => dispatch({ type: "SECOND_LOOK_KEEP", which: "second" })}
            >
              Keep this
            </button>
          </div>
        </div>
      </section>
    );
  }

  // one draw so far: keep it, or use the Machine's "Draw again"
  return (
    <section className="secondlook-tray" aria-label="Second Look — keep or draw again">
      <p className="routing-hint">Keep this piece, or draw again.</p>
      <div className="secondlook-choices">
        <div className="secondlook-choice">
          <PieceSprite piece={state.pieces[firstCapture]} dims={dims} className="secondlook-sprite" />
          <button
            className="keep-btn"
            onClick={() => dispatch({ type: "SECOND_LOOK_KEEP", which: "first" })}
          >
            Keep
          </button>
        </div>
      </div>
    </section>
  );
}
