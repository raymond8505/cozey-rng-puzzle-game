import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../store";

/** Transient card feedback: an effect confirmation or the specific no-effect
 *  reason (§2.5). A wasted play always says exactly why it did nothing. */
export function Toast() {
  const toast = useGame((s) => s.toast);
  const dismiss = useGame((s) => s.dismissToast);

  return (
    <div className="toast-layer" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.button
            className={`toast toast-${toast.tone}`}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            onClick={dismiss}
          >
            {toast.message}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
