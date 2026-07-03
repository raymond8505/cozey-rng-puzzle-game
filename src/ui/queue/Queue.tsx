import { useGame } from "../store";
import { queueCapacity, legalActions, isQueueFull } from "@/game/selectors";
import { QueuePiece, type QueueDragMode } from "./QueuePiece";

/** The parking queue: derived-capacity slots holding tiles set aside.
 *  - Park target for the held tile while parking is legal, and for a tile
 *    being pried off the board (armed crowbar) while there's room.
 *  - Its tiles are draggable onto the board for Action B (place-from-queue)
 *    or, when the queue is full during routing, to SWAP (place a queued tile
 *    while the held tile takes its slot). */
export function Queue() {
  const state = useGame((s) => s.state);
  const pendingCrowbar = useGame((s) => s.pendingCrowbar);
  const la = legalActions(state);
  const capacity = queueCapacity(state);

  const canPark =
    la.canPark || (pendingCrowbar !== null && !isQueueFull(state));
  const mode: QueueDragMode = la.mustSwapOrPlace
    ? "swap"
    : la.canPlaceFromQueue
      ? "placeFromQueue"
      : null;

  const slots = Array.from({ length: capacity }, (_, i) => state.queue[i] ?? null);

  return (
    <section className="queue" aria-label="Parking queue">
      <div
        className={canPark ? "queue-strip droppable" : "queue-strip"}
        data-drop={canPark ? "queue" : undefined}
      >
        {slots.map((piece, i) => (
          <div className="queue-slot" key={i}>
            {piece !== null && <QueuePiece piece={piece} mode={mode} />}
          </div>
        ))}
      </div>
    </section>
  );
}
