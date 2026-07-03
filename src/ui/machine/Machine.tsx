import { useGame } from "../store";
import { legalActions } from "@/game/selectors";
import { MachineWindow } from "./MachineWindow";
import { CardSlot } from "./CardSlot";
import { StatusWindow } from "./StatusWindow";

/** The Machine appliance: a display window + a card slot, then a controls row
 *  where the DRAW button and speed toggle sit beside the status window (the
 *  console log of every game message). The chosen (drawn/lifted) piece lives
 *  in the window itself (its `chosen` state) rather than a separate tray, so
 *  cards stay on screen while routing. Second Look choices also live in the
 *  window (it expands to show the captures). */
export function Machine() {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  const pendingCrowbar = useGame((s) => s.pendingCrowbar);
  const la = legalActions(state);

  const isFast = state.machine.baseSpeedMs === state.config.machine.fastMs;
  const governor = state.machine.governorActive;
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
        <div className="machine-transport">
          <button
            className="draw-btn"
            // Withheld while crowbar awaits its lift target: PLAY_CROWBAR needs
            // the idle phase, and arming is not cancellable, so drawing mid-arm
            // could wedge the prompt.
            disabled={!la.canDraw || pendingCrowbar !== null}
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

        <StatusWindow />
      </div>
    </section>
  );
}
