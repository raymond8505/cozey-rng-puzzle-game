import { useGame } from "../store";
import { HeldToken } from "../dnd/HeldToken";

/** Appears while a piece is held (drawn or crowbar-lifted), showing routing
 *  instructions and the draggable token. */
export function RoutingTray() {
  const held = useGame((s) => s.state.held);
  if (held === null) return null;

  const forced = held.fullQueueForce;

  return (
    <section className="routing-tray" aria-label="Route the held piece">
      <p className="routing-hint">
        {forced
          ? "Queue is full — drag the new piece, or a queued one, onto the board."
          : "Drag onto the board, or into the queue to park."}
      </p>
      <HeldToken />
    </section>
  );
}
