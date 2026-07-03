import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../store";
import { legalActions } from "@/game/selectors";

/** The Machine's card slot: a card-shaped pocket that reads as a drop target
 *  ("Place card here"), glows while a card can be played, and seats a played
 *  card. The seated card itself is blank; the play is announced by name in
 *  the status window (which replaced the old nameplate under the pocket). */
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
      <div className="card-slot-pocket">
        <AnimatePresence>
          {seated !== null && (
            <motion.div
              className="seated-card"
              aria-hidden
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            />
          )}
        </AnimatePresence>
        {seated === null && (
          <span className="card-slot-hint">
            Place
            <br />
            card
            <br />
            here
          </span>
        )}
      </div>
    </div>
  );
}
