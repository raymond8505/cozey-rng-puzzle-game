import { useGame } from "../store";
import { Rng, shuffle, hashSeed } from "@/game/rng";
import type { PieceId } from "@/game/types";

/** Dev-only harness (PR 2): place pieces programmatically to eyeball the SVG
 *  rendering — correct fill (seamless picture) vs shuffled (misplaced pieces).
 *  Rendered only under import.meta.env.DEV. */
export function DevPanel() {
  const state = useGame((s) => s.state);
  const devSetBoard = useGame((s) => s.devSetBoard);
  const restart = useGame((s) => s.restart);

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
    </div>
  );
}
