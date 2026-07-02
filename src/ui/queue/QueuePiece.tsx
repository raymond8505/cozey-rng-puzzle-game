import { motion, type PanInfo } from "motion/react";
import { useGame } from "../store";
import { gridDims } from "@/game/selectors";
import type { PieceId } from "@/game/types";
import { PieceSprite } from "../piece/PieceSprite";
import { resolveDropAt } from "../dnd/resolveDrop";
import { clientXY } from "../dnd/pointer";

/** How dragging this queued piece onto a board cell resolves:
 *  - "placeFromQueue": Action B (idle) — move it onto the cell.
 *  - "swap": forced full-queue routing — place it while the held piece parks. */
export type QueueDragMode = "placeFromQueue" | "swap" | null;

interface QueuePieceProps {
  piece: PieceId;
  mode: QueueDragMode;
}

export function QueuePiece({ piece, mode }: QueuePieceProps) {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  const dims = gridDims(state);

  if (mode === null) {
    return <PieceSprite piece={state.pieces[piece]} dims={dims} className="queue-sprite" />;
  }

  const onDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const target = resolveDropAt(...clientXY(e, info));
    if (target?.kind !== "cell") return; // only board cells matter; miss -> snap back
    if (mode === "swap") {
      dispatch({ type: "SWAP", placeCell: target.cell, placePiece: piece });
    } else {
      dispatch({ type: "PLACE_FROM_QUEUE", queued: piece, cell: target.cell });
    }
  };

  return (
    <motion.div
      className="queue-piece-drag"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.12, zIndex: 50 }}
      onDragEnd={onDragEnd}
    >
      <PieceSprite piece={state.pieces[piece]} dims={dims} className="queue-sprite" />
    </motion.div>
  );
}
