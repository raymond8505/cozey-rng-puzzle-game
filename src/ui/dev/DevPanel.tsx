import { useGame } from "../store";
import { PUZZLES } from "../puzzles";
import { Rng, shuffle, hashSeed } from "@/game/rng";
import type { PieceId } from "@/game/types";

/** Dev-only harness: eyeball board rendering (correct / shuffled fill) and jump
 *  straight to any puzzle. Rendered only under import.meta.env.DEV. */
export function DevPanel() {
  const state = useGame((s) => s.state);
  const puzzleIndex = useGame((s) => s.puzzleIndex);
  const devSetBoard = useGame((s) => s.devSetBoard);
  const restart = useGame((s) => s.restart);
  const selectPuzzle = useGame((s) => s.selectPuzzle);

  const ids: PieceId[] = state.pieces.map((p) => p.id);

  const fillCorrect = () => devSetBoard(ids.slice());
  const fillShuffled = () =>
    devSetBoard(shuffle(ids, new Rng(hashSeed("dev-shuffle"))));
  const clear = () => devSetBoard(state.board.map(() => null));

  return (
    <div className="dev-panel">
      <span className="dev-label">dev</span>
      <button onClick={fillCorrect}>Correct</button>
      <button onClick={fillShuffled}>Shuffled</button>
      <button onClick={clear}>Clear</button>
      <button onClick={() => restart()}>Reseed</button>

      <span className="dev-label">puzzle</span>
      {PUZZLES.map((p, i) => (
        <button
          key={p.id}
          className={i === puzzleIndex ? "dev-active" : undefined}
          onClick={() => selectPuzzle(i)}
          title={`${p.label} — ${p.board.cols}×${p.board.rows}`}
        >
          {p.board.cols}×{p.board.rows}
        </button>
      ))}
    </div>
  );
}
