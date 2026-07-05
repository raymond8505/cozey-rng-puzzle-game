import { motion, type PanInfo } from "motion/react";
import { useGame } from "../store";
import { gridDims } from "@/game/selectors";
import type { PieceId } from "@/game/types";
import { PieceSprite } from "../piece/PieceSprite";
import { resolveDropAt } from "../dnd/resolveDrop";
import { clientXY } from "../dnd/pointer";

/** How dragging this parked piece onto a board cell resolves:
 *  - "placeFromQueue": Action B (idle) — move it onto the cell.
 *  - "swap": forced full-queue routing — place it while the held piece parks. */
export type QueueDragMode = "placeFromQueue" | "swap" | null;

interface ParkedPieceProps {
  piece: PieceId;
  mode: QueueDragMode;
  /** The tumble this tile landed with (65–115deg, from scatter.ts). */
  rotDeg: number;
}

export function ParkedPiece({ piece, mode, rotDeg }: ParkedPieceProps) {
  const state = useGame((s) => s.state);
  const dispatch = useGame((s) => s.dispatch);
  const dims = gridDims(state);

  if (mode === null) {
    return (
      <div className="parking-piece-still" style={{ transform: `rotate(${rotDeg}deg)` }}>
        <PieceSprite piece={state.pieces[piece]} dims={dims} />
      </div>
    );
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
    // Rotation rides motion's own transform stack (`style.rotate`), never a
    // CSS transform — motion owns `transform` on a draggable and composes
    // x/y/rotate itself, so the drag translate stays in parent space.
    // Picking the tile up straightens it; a missed drop tumbles it back.
    <motion.div
      className="parking-piece-drag"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      style={{ rotate: rotDeg }}
      whileDrag={{ scale: 1.12, rotate: 0, zIndex: 50 }}
      onDragStart={() => dispatch({ type: "DISMISS_REVEAL" })}
      onDragEnd={onDragEnd}
    >
      <PieceSprite piece={state.pieces[piece]} dims={dims} />
    </motion.div>
  );
}
