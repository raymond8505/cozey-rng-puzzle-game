import { motion, type PanInfo } from "motion/react";
import { useGame } from "../store";
import { gridDims } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";
import { resolveDropAt } from "./resolveDrop";
import { clientXY } from "./pointer";

/** The held piece as a draggable token. Drop it on an empty board cell to
 *  place, or on the queue to park. Misses snap back (dragSnapToOrigin). */
export function HeldToken() {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  const held = state.held;
  if (held === null) return null;

  const onDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const target = resolveDropAt(...clientXY(e, info));
    if (!target) return; // snap back
    if (target.kind === "cell") dispatch({ type: "PLACE", cell: target.cell });
    else dispatch({ type: "PARK" });
  };

  return (
    <motion.div
      className="held-token"
      // Pop in where the window's cycling sprite was — the window itself
      // signals the chosen state (see .machine-window.chosen).
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.08, zIndex: 50 }}
      onDragEnd={onDragEnd}
    >
      <PieceSprite piece={state.pieces[held.piece]} dims={gridDims(state)} />
    </motion.div>
  );
}
