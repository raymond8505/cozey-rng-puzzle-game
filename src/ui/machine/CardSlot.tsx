import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../store";
import { legalActions } from "@/game/selectors";
import { HandDrawnArrow } from "../icons";

/** The Machine's card slot: a thin front-facing aperture (like a ticket
 *  reader), with a handwritten post-it note beside it pointing the way
 *  ("Place card here"). The aperture glows while a card can be played. A
 *  played card seats half-inserted — its blank back sticks out of the slot;
 *  the play is announced by name in the status window. An oversized invisible
 *  hitbox makes the drop forgiving well beyond the visible slot. */
export function CardSlot() {
  const seated = useGame((s) => s.seatedCard);
  const canPlay = useGame((s) => legalActions(s.state).canPlayCard);
  const inviting = canPlay && seated === null;

  return (
    <div
      className={inviting ? "card-slot inviting" : "card-slot"}
      data-drop="slot"
      aria-label="Card slot — drop a card here"
    >
      <div className="card-slot-hitbox" data-drop="slot" aria-hidden />
      <div className="card-slot-note" aria-hidden>
        <span className="card-slot-hint">Place card here</span>
        <HandDrawnArrow className="card-slot-arrow" />
      </div>
      <div className="card-slot-throat">
        <AnimatePresence>
          {seated !== null && (
            <motion.div
              className="seated-card"
              aria-hidden
              initial={{ y: -36, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            />
          )}
        </AnimatePresence>
        {/* painted after the card so its face overlaps the card's bottom edge */}
        <div className="card-slot-opening" />
      </div>
    </div>
  );
}
