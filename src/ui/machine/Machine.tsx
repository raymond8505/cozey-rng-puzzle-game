import { useGame } from "../store";
import { legalActions, machineSpeedMs } from "@/game/selectors";
import { MachineWindow } from "./MachineWindow";
import { CardSlot } from "./CardSlot";

/** The Machine appliance: a display window + a card slot with an indicator
 *  light, a free speed toggle, and the DRAW button. The chosen (drawn/lifted)
 *  piece lives in the window itself (its `chosen` state) rather than a
 *  separate tray, so cards stay on screen while routing. Second Look choices
 *  also live in the window (it expands to show the captures). */
export function Machine() {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  const pendingCrowbar = useGame((s) => s.pendingCrowbar);
  const la = legalActions(state);

  const isFast = state.machine.baseSpeedMs === state.config.machine.fastMs;
  const governor = state.machine.governorActive;
  const held = state.held;
  const secondLook = state.phase === "secondLook";

  const setFast = (fast: boolean) => {
    if (fast !== isFast) dispatch({ type: "TOGGLE_SPEED" });
  };

  return (
    <section className="machine" aria-label="The Machine">
      <div className="machine-top">
        <div className="machine-col-main">
          <MachineWindow
            state={state}
            onDraw={la.canDraw ? () => dispatch({ type: "DRAW" }) : undefined}
            onKeep={
              la.canSecondLookKeep
                ? (which) => dispatch({ type: "SECOND_LOOK_KEEP", which })
                : undefined
            }
            awaitingLift={pendingCrowbar !== null}
          />
        </div>

        <div className="machine-col-side">
          <CardSlot />
        </div>
      </div>

      <div className="machine-controls">
        <button
          className="draw-btn"
          disabled={!la.canDraw}
          onClick={() => dispatch({ type: "DRAW" })}
        >
          {secondLook ? "Draw again" : "Draw"}
        </button>

        <div className="speed-toggle" role="group" aria-label="Machine speed">
          <button
            className={!isFast ? "speed-btn active" : "speed-btn"}
            aria-pressed={!isFast}
            disabled={!la.canToggleSpeed || governor}
            onClick={() => setFast(false)}
          >
            Slow
          </button>
          <button
            className={isFast ? "speed-btn active" : "speed-btn"}
            aria-pressed={isFast}
            disabled={!la.canToggleSpeed || governor}
            onClick={() => setFast(true)}
          >
            Fast
          </button>
        </div>
      </div>

      {secondLook && (
        <p className="machine-note">
          {state.secondLook.drawsUsed >= 2
            ? "Keep one — the other goes back."
            : "Click the captured piece to keep it, or draw again."}
        </p>
      )}
      {held !== null && (
        <p className="machine-note">
          {held.fullQueueForce
            ? "Queue is full — drag the new piece, or a queued one, onto the board."
            : "Drag onto the board, or into the queue to park."}
        </p>
      )}
      {governor && (
        <p className="machine-note">Governor: running at {machineSpeedMs(state)}ms this draw.</p>
      )}
    </section>
  );
}
