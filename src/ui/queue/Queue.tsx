import { useGame } from "../store";
import { queueCapacity, legalActions } from "@/game/selectors";
import { QueuePiece, type QueueDragMode } from "./QueuePiece";

/** The parking queue: derived-capacity slots holding pieces set aside.
 *  - Park target for the held piece while parking is legal.
 *  - Its pieces are draggable onto the board for Action B (place-from-queue)
 *    or, when the queue is full during routing, to SWAP (place a queued piece
 *    while the held piece takes its slot). */
export function Queue() {
  const state = useGame((s) => s.state);
  const la = legalActions(state);
  const capacity = queueCapacity(state);

  const canPark = la.canPark;
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
