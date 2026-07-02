import { useGame } from "./store";
import { useMachineCycle } from "./machine/useMachineCycle";
import { Board } from "./board/Board";
import { TargetThumbnail } from "./board/TargetThumbnail";
import { Machine } from "./machine/Machine";
import { Queue } from "./queue/Queue";
import { RoutingTray } from "./routing/RoutingTray";
import { DevPanel } from "./dev/DevPanel";

export function GameScreen() {
  useMachineCycle();
  const state = useGame((s) => s.state);

  const filled = state.board.reduce((n, c) => (c !== null ? n + 1 : n), 0);
  const total = state.board.length;

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

      <Board state={state} dropActive={state.phase === "routing"} />
      <Queue />
      <RoutingTray />
      <Machine />

      {import.meta.env.DEV && <DevPanel />}
    </main>
  );
}
