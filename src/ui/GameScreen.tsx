import { useGame } from "./store";
import { asCellIndex } from "@/game/types";
import { legalActions, isGameOver } from "@/game/selectors";
import { useMachineCycle } from "./machine/useMachineCycle";
import { Board } from "./board/Board";
import { Machine } from "./machine/Machine";
import { Hand } from "./cards/Hand";
import { EndScreen } from "./end/EndScreen";
import { DevPanel } from "./dev/DevPanel";

export function GameScreen() {
  useMachineCycle();
  const state = useGame((s) => s.state);
  const pendingCrowbar = useGame((s) => s.pendingCrowbar);
  const playCrowbar = useGame((s) => s.playCrowbar);
  const dispatch = useGame((s) => s.dispatch);

  if (isGameOver(state)) return <EndScreen />;

  const filled = state.board.reduce((n, c) => (c !== null ? n + 1 : n), 0);
  const total = state.board.length;
  // Board cells accept drops both while routing a held tile and while
  // dragging a queued tile out for Action B.
  const dropActive = state.phase === "routing" || legalActions(state).canPlaceFromQueue;
  const pryActive = pendingCrowbar !== null;

  /** A pried tile was dropped on the window or the queue. The lift itself
   *  lands it in the window (held); a queue drop then parks it in the same
   *  gesture — unless parking is illegal (full queue), in which case it stays
   *  in the window and the routing hint explains. */
  const onPry = (cell: number, dest: "window" | "queue") => {
    if (pendingCrowbar === null) return;
    playCrowbar(pendingCrowbar, asCellIndex(cell));
    if (dest === "queue" && legalActions(useGame.getState().state).canPark) {
      dispatch({ type: "PARK" });
    }
  };

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">PUNCHCARD</h1>
          <p className="app-progress">
            {filled} / {total} placed
          </p>
        </div>
      </header>

      <Board state={state} dropActive={dropActive} pryActive={pryActive} onPry={onPry} />
      <Machine />
      <Hand />

      {import.meta.env.DEV && <DevPanel />}
    </main>
  );
}
