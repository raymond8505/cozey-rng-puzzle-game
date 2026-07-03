import { useGame } from "../store";
import { legalActions, machineSpeedMs } from "@/game/selectors";
import { MachineWindow } from "./MachineWindow";
import { CardSlot } from "./CardSlot";
import { HeldToken } from "../dnd/HeldToken";

/** The Machine appliance: a bay holding the chosen (drawn/lifted) piece, a
 *  display window, and a card slot with an indicator light, plus a free speed
 *  toggle and the DRAW button. The bay keeps the chosen piece inside the
 *  machine row instead of a separate tray, so cards stay on screen. */
export function Machine() {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  const la = legalActions(state);

  const isFast = state.machine.baseSpeedMs === state.config.machine.fastMs;
  const governor = state.machine.governorActive;
  const held = state.held;

  const setFast = (fast: boolean) => {
    if (fast !== isFast) dispatch({ type: "TOGGLE_SPEED" });
  };

  return (
    <section className="machine" aria-label="The Machine">
      <div className="machine-body">
        <div className="held-bay" aria-label="Chosen piece — drag it onto the board or queue">
          <HeldToken />
        </div>
        <MachineWindow state={state} />
        <CardSlot />
      </div>

      <div className="machine-controls">
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

        <button
          className="draw-btn"
          disabled={!la.canDraw}
          onClick={() => dispatch({ type: "DRAW" })}
        >
          {state.phase === "secondLook" ? "Draw again" : "Draw"}
        </button>
      </div>

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
