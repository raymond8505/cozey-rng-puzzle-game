import { useGame } from "../store";
import { legalActions, machineSpeedMs } from "@/game/selectors";
import { MachineWindow } from "./MachineWindow";
import { CardSlot } from "./CardSlot";

/** The Machine appliance: a display window + a card slot with an indicator
 *  light, a free speed toggle, and the DRAW button. */
export function Machine() {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  const la = legalActions(state);

  const isFast = state.machine.baseSpeedMs === state.config.machine.fastMs;
  const governor = state.machine.governorActive;

  const setFast = (fast: boolean) => {
    if (fast !== isFast) dispatch({ type: "TOGGLE_SPEED" });
  };

  return (
    <section className="machine" aria-label="The Machine">
      <div className="machine-body">
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

      {governor && (
        <p className="machine-note">Governor: running at {machineSpeedMs(state)}ms this draw.</p>
      )}
    </section>
  );
}
