import { useGame } from "../store";
import { completeness, scoreTier } from "@/game/selectors";
import { Board } from "../board/Board";
import puzzleUrl from "@/assets/puzzle.jpg";

/** Shown when every cell is filled: the player's board beside the target, with
 *  completeness and a score-tier slogan. Play again reseeds a fresh run. */
export function EndScreen() {
  const state = useGame((s) => s.state);
  const restart = useGame((s) => s.restart);

  const pct = Math.round(completeness(state));
  const { slogan } = scoreTier(state);

  const playAgain = () => restart(`play-${Date.now()}`);

  return (
    <main className="app end-screen">
      <h1 className="app-title">{slogan}</h1>
      <p className="end-score">{pct}% complete</p>

      <div className="compare">
        <figure className="compare-item">
          <Board state={state} />
          <figcaption>Yours</figcaption>
        </figure>
        <figure className="compare-item">
          <img src={puzzleUrl} alt="Target picture" className="compare-target" />
          <figcaption>Target</figcaption>
        </figure>
      </div>

      <button className="draw-btn" onClick={playAgain}>
        Play again
      </button>
    </main>
  );
}
