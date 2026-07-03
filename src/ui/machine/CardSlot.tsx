import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../store";
import { legalActions } from "@/game/selectors";
import { CARD_META } from "../cards/cardMeta";

/** The Machine's card slot: a card-shaped pocket that reads as a drop target
 *  ("CARD ▾"), glows while a card can be played, seats a played card, and lights
 *  green when the effect is live (§2.5). The seated card itself is blank; its
 *  name reads out on a plate beside the pocket. */
export function CardSlot() {
  const seated = useGame((s) => s.seatedCard);
  const effectLive = useGame(
    (s) => s.state.machine.filter.kind !== "none" || s.state.machine.governorActive,
  );
  const canPlay = useGame((s) => legalActions(s.state).canPlayCard);
  const live = seated !== null || effectLive;
  const inviting = canPlay && seated === null;

  return (
    <div
      className={inviting ? "card-slot inviting" : "card-slot"}
      data-drop="slot"
      aria-label="Card slot — drop a card here"
    >
      <div className="card-slot-row">
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
          {seated === null && <span className="card-slot-hint">CARD&nbsp;▾</span>}
        </div>
        <div className="card-slot-name" role="status" aria-label="Played card">
          {seated !== null ? CARD_META[seated].name : ""}
        </div>
      </div>
      <div className="slot-light-row">
        <div className={live ? "slot-light on" : "slot-light"} aria-hidden />
      </div>
    </div>
  );
}
