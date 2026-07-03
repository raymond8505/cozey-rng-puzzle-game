import { useGame } from "./store";
import { asCellIndex } from "@/game/types";
import { legalActions, isGameOver } from "@/game/selectors";
import { useMachineCycle } from "./machine/useMachineCycle";
import { Board } from "./board/Board";
import { TargetThumbnail } from "./board/TargetThumbnail";
import { Machine } from "./machine/Machine";
import { Queue } from "./queue/Queue";
import { Hand } from "./cards/Hand";
import { CrowbarPrompt } from "./cards/CrowbarPrompt";
import { EndScreen } from "./end/EndScreen";
import { DevPanel } from "./dev/DevPanel";

export function GameScreen() {
  useMachineCycle();
  const state = useGame((s) => s.state);
  const pendingCrowbar = useGame((s) => s.pendingCrowbar);
  const playCrowbar = useGame((s) => s.playCrowbar);

  if (isGameOver(state)) return <EndScreen />;

  const filled = state.board.reduce((n, c) => (c !== null ? n + 1 : n), 0);
  const total = state.board.length;
  // Board cells accept drops both while routing a held piece and while
  // dragging a queued piece out for Action B.
  const dropActive = state.phase === "routing" || legalActions(state).canPlaceFromQueue;
  const liftActive = pendingCrowbar !== null;

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">PUNCHCARD</h1>
          <p className="app-progress">
            {filled} / {total} placed
          </p>
        </div>
        <TargetThumbnail />
      </header>

      <Board
        state={state}
        dropActive={dropActive}
        liftActive={liftActive}
        onLiftCell={(cell) => {
          if (pendingCrowbar !== null) playCrowbar(pendingCrowbar, asCellIndex(cell));
        }}
      />
      <CrowbarPrompt />
      <Queue />
      <Machine />
      <Hand />

      {import.meta.env.DEV && <DevPanel />}
    </main>
  );
}
