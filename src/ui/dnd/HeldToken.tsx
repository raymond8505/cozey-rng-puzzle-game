import { motion, type PanInfo } from "motion/react";
import { useGame } from "../store";
import { gridDims } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";
import { resolveDropAt } from "./resolveDrop";

function clientXY(
  e: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo,
): [number, number] {
  const pe = e as PointerEvent;
  if (typeof pe.clientX === "number") return [pe.clientX, pe.clientY];
  const t = (e as TouchEvent).changedTouches?.[0];
  if (t) return [t.clientX, t.clientY];
  return [info.point.x - window.scrollX, info.point.y - window.scrollY];
}

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
