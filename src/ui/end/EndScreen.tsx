import { motion } from "motion/react";
import { useGame } from "../store";
import { completeness, scoreTier, gridDims } from "@/game/selectors";
import { Board } from "../board/Board";

/** Shown when every cell is filled: the player's board beside the target, with
 *  completeness and a score-tier slogan. Play again alternates to the next
 *  puzzle. */
export function EndScreen() {
  const state = useGame((s) => s.state);
  const puzzleSrc = useGame((s) => s.puzzleSrc);
  const playAgain = useGame((s) => s.playAgain);

  const pct = Math.round(completeness(state));
  const { slogan } = scoreTier(state);
  const dims = gridDims(state);

  return (
    <motion.main
      className="app end-screen"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.h1
        className="app-title"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
      >
        {slogan}
      </motion.h1>
      <p className="end-score">{pct}% complete</p>

      <div className="compare">
        <figure className="compare-item">
          <Board state={state} />
          <figcaption>Yours</figcaption>
        </figure>
        <figure className="compare-item">
          <img
            src={puzzleSrc}
            alt="Target picture"
            className="compare-target"
            style={{ aspectRatio: `${dims.cols} / ${dims.rows}` }}
          />
          <figcaption>Target</figcaption>
        </figure>
      </div>

      <button className="draw-btn" onClick={playAgain}>
        Play again
      </button>
    </motion.main>
  );
}
