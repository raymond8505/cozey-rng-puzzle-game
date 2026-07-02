import { useGame } from "./store";
import { Board } from "./board/Board";
import { TargetThumbnail } from "./board/TargetThumbnail";
import { DevPanel } from "./dev/DevPanel";

export function App() {
  const state = useGame((s) => s.state);

  return (
    <main className="app">
      <header className="app-header">
        <h1 className="app-title">PUNCHCARD</h1>
        <TargetThumbnail />
      </header>

      <Board state={state} />

      {import.meta.env.DEV && <DevPanel />}
    </main>
  );
}
