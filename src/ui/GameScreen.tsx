import { useGame } from "./store";
import { legalActions, isGameOver } from "@/game/selectors";
import { useMachineCycle } from "./machine/useMachineCycle";
import { Board } from "./board/Board";
import { TargetThumbnail } from "./board/TargetThumbnail";
import { Machine } from "./machine/Machine";
import { Queue } from "./queue/Queue";
import { RoutingTray } from "./routing/RoutingTray";
import { EndScreen } from "./end/EndScreen";
import { DevPanel } from "./dev/DevPanel";

export function GameScreen() {
  useMachineCycle();
  const state = useGame((s) => s.state);

  if (isGameOver(state)) return <EndScreen />;

  const filled = state.board.reduce((n, c) => (c !== null ? n + 1 : n), 0);
  const total = state.board.length;
  // Board cells accept drops both while routing a held piece and while
  // dragging a queued piece out for Action B.
  const dropActive = state.phase === "routing" || legalActions(state).canPlaceFromQueue;

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

      <Board state={state} dropActive={dropActive} />
      <Queue />
      <RoutingTray />
      <Machine />

      {import.meta.env.DEV && <DevPanel />}
    </main>
  );
}
