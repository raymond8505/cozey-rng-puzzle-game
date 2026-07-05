import { useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import type { GameState, PieceId } from "@/game/types";
import { asCellIndex } from "@/game/types";
import { gridDims } from "@/game/selectors";
import { useGame } from "../store";
import { UNIT } from "./piecePath";
import { PieceView } from "./PieceView";
import { EmptyCell } from "./EmptyCell";
import { PieceSprite } from "../piece/PieceSprite";
import { resolveDropAt, type DropTarget } from "../dnd/resolveDrop";
import { clientXY } from "../dnd/pointer";

interface BoardProps {
  state: GameState;
  /** When true, empty cells become drag-drop targets (data-drop="cell:i"). */
  dropActive?: boolean;
  /** Armed crowbar: placed tiles grow drag ghosts that pry them off the board
   *  when dropped on the machine window, the queue, or an empty cell (a
   *  one-drag relocate). Tiles are always dragged — there is no click-to-pry. */
  pryActive?: boolean;
  onPry?: (cell: number, dest: DropTarget) => void;
}

/** Matches PieceSprite's default `pad`: the ghost expands past its cell by
 *  this fraction per side so the sprite's tabs line up with the board tile. */
const PRY_PAD = 0.32;

/** The jigsaw board: a single source image revealed piece-by-piece as cells
 *  fill. Scales to any cols×rows via viewBox — no pixel constants. */
export function Board({
  state,
  dropActive = false,
  pryActive = false,
  onPry,
}: BoardProps) {
  const dims = gridDims(state);
  const puzzleSrc = useGame((s) => s.puzzleSrc);
  const boardW = dims.cols * UNIT;
  const boardH = dims.rows * UNIT;
  // Which cell's pry ghost is mid-drag (its board tile dims to read as lifted).
  const [lifting, setLifting] = useState<number | null>(null);

  // Every placed tile renders identically, in board order — no visual tell
  // for a misplaced tile. Spotting one from the picture is the player's job.
  const placed = state.board
    .map((occupant, cell) => (occupant === null ? null : { cell, occupant }))
    .filter((p): p is { cell: number; occupant: PieceId } => p !== null);

  const pryDragEnd =
    (cell: number) => (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setLifting(null);
      const target = resolveDropAt(...clientXY(e, info));
      if (target && target.kind !== "slot") {
        onPry?.(cell, target);
      } // slot or miss: snap back, tile stays put
    };

  return (
    <div className="board-frame">
      {/* The stage is forced to the grid's exact ratio (width AND height
          capped together), so the svg fills it edge to edge and the HTML pry
          layer's percentage coordinates align with the svg cells. */}
      <div
        className="board-stage"
        style={{
          aspectRatio: `${dims.cols} / ${dims.rows}`,
          maxWidth: `calc(var(--board-stage-max-h) * ${dims.cols / dims.rows})`,
        }}
      >
        <svg
          className="board-svg"
          viewBox={`0 0 ${boardW} ${boardH}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Puzzle board"
        >
          {state.board.map((occupant, cell) =>
            occupant !== null ? null : (
              <EmptyCell key={`empty-${cell}`} piece={state.pieces[cell]} dims={dims} />
            ),
          )}

          {placed.map(({ cell, occupant }) => (
            <PieceView
              key={cell}
              piece={state.pieces[occupant]}
              cell={asCellIndex(cell)}
              dims={dims}
              imageHref={puzzleSrc}
              dimmed={lifting === cell}
            />
          ))}

          {/* Empty cells accept drops while routing/placing AND while prying:
              a pried tile dropped straight on an empty cell relocates in one
              drag (the tile's own cell is still occupied, so it grows no rect
              and a same-cell drop snaps back). */}
          {(dropActive || pryActive) &&
            state.board.map((occupant, cell) =>
              occupant !== null ? null : (
                <rect
                  key={`drop-${cell}`}
                  className="cell-drop"
                  data-drop={`cell:${cell}`}
                  x={(cell % dims.cols) * UNIT}
                  y={Math.floor(cell / dims.cols) * UNIT}
                  width={UNIT}
                  height={UNIT}
                />
              ),
            )}

          {/* Finished-picture overlay. Last child = paints above everything in
              the svg; pointer-events: none (.board-reveal) keeps drops/clicks
              working. initial={false} on AnimatePresence: present at boot with
              no fade-in, but a mid-game Reveal card play fades it in. */}
          <AnimatePresence initial={false}>
            {state.revealActive && (
              <motion.image
                className="board-reveal"
                href={puzzleSrc}
                x={0}
                y={0}
                width={boardW}
                height={boardH}
                preserveAspectRatio="xMidYMid slice"
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              />
            )}
          </AnimatePresence>
        </svg>

        {pryActive && (
          <div className="pry-layer">
            {placed.map(({ cell, occupant }) => {
              const col = cell % dims.cols;
              const row = Math.floor(cell / dims.cols);
              return (
                <motion.div
                  key={cell}
                  className="pry-token"
                  style={{
                    left: `${((col - PRY_PAD) / dims.cols) * 100}%`,
                    top: `${((row - PRY_PAD) / dims.rows) * 100}%`,
                    width: `${((1 + 2 * PRY_PAD) / dims.cols) * 100}%`,
                    height: `${((1 + 2 * PRY_PAD) / dims.rows) * 100}%`,
                  }}
                  drag
                  dragSnapToOrigin
                  dragMomentum={false}
                  whileDrag={{ scale: 1.08, zIndex: 50 }}
                  onDragStart={() => setLifting(cell)}
                  onDragEnd={pryDragEnd(cell)}
                >
                  <PieceSprite
                    piece={state.pieces[occupant]}
                    dims={dims}
                    className="pry-sprite"
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
