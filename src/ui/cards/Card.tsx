import { motion, type PanInfo } from "motion/react";
import { useGame } from "../store";
import type { Card as CardModel } from "@/game/types";
import { resolveDropAt } from "../dnd/resolveDrop";
import { clientXY } from "../dnd/pointer";
import { CARD_META } from "./cardMeta";

interface CardProps {
  card: CardModel;
  /** Whether this card can be played right now (drag enabled). */
  playable: boolean;
}

const HOLES = [0, 1, 2, 3, 4, 5, 6];

/** A punch card. Drag it to the Machine's slot to play. Crowbar arms a board
 *  target instead of resolving at the slot (unless the board is empty). */
export function Card({ card, playable }: CardProps) {
  const playCardAction = useGame((s) => s.playCard);
  const armCrowbar = useGame((s) => s.armCrowbar);
  const playCrowbar = useGame((s) => s.playCrowbar);
  const boardHasPiece = useGame((s) => s.state.board.some((c) => c !== null));
  const meta = CARD_META[card.type];

  const onDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const target = resolveDropAt(...clientXY(e, info));
    if (target?.kind !== "slot") return; // seat only at the slot; miss -> snap back
    if (card.type === "crowbar") {
      if (boardHasPiece) armCrowbar(card.instanceId);
      else playCrowbar(card.instanceId); // no target -> no-effect
    } else {
      playCardAction(card.instanceId);
    }
  };

  const body = (
    <div className={`card card-${meta.cardClass}`}>
      <div className="card-holes" aria-hidden>
        {HOLES.map((h) => (
          <span key={h} className="card-hole" />
        ))}
      </div>
      <div className="card-name">{meta.name}</div>
      <div className="card-blurb">{meta.blurb}</div>
      <div className="card-class">{meta.cardClass}</div>
    </div>
  );

  if (!playable) return <div className="card-wrap disabled">{body}</div>;

  return (
    <motion.div
      className="card-wrap"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.06, zIndex: 60, rotate: -2 }}
      onDragEnd={onDragEnd}
    >
      {body}
    </motion.div>
  );
}
