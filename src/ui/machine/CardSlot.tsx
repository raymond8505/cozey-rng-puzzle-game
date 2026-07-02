import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../store";
import { CARD_META } from "../cards/cardMeta";

/** The Machine's card slot and indicator light. A card dragged here seats
 *  (slides in), the light turns green, and the effect goes live (§2.5). */
export function CardSlot() {
  const seated = useGame((s) => s.seatedCard);
  const effectLive = useGame(
    (s) => s.state.machine.filter.kind !== "none" || s.state.machine.governorActive,
  );
  const live = seated !== null || effectLive;

  return (
    <div className="card-slot" data-drop="slot" aria-label="Card slot">
      <div className="card-slot-mouth">
        <AnimatePresence>
          {seated !== null && (
            <motion.div
              className="seated-card"
              initial={{ y: -26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            >
              {CARD_META[seated].name}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={live ? "slot-light on" : "slot-light"} aria-hidden />
    </div>
  );
}
