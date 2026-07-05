import { useGame } from "../store";
import { queueCapacity, legalActions, isQueueFull } from "@/game/selectors";
import { scatterFor } from "./scatter";
import { ParkedPiece, type QueueDragMode } from "./ParkedPiece";

/** The parking tray stamped into the machine's top row: tiles set aside land
 *  here littered — scattered and tumbled sideways, as if thrown down.
 *  - Park target for the held tile while parking is legal, and for a tile
 *    being pried off the board (armed crowbar) while there's room.
 *  - Its tiles are draggable onto the board for Action B (place-from-queue)
 *    or, when the queue is full during routing, to SWAP (place a queued tile
 *    while the held tile takes its slot). */
export function ParkingArea() {
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

  const scatter = scatterFor(state.queue, capacity);

  return (
    <div
      className={canPark ? "parking-tray droppable" : "parking-tray"}
      data-drop={canPark ? "queue" : undefined}
      aria-label="Parking queue"
    >
      {state.queue.map((piece) => {
        const t = scatter.get(piece)!;
        return (
          // Positioning lives on this outer wrapper (left/top + negative-margin
          // centering) so motion's transform on the draggable inside never
          // fights it — motion owns `transform` there.
          <div
            key={piece}
            className="parking-piece"
            style={{ left: `${t.xPct}%`, top: `${t.yPct}%` }}
          >
            <ParkedPiece piece={piece} mode={mode} rotDeg={t.rotDeg} />
          </div>
        );
      })}
      <span className="parking-count">
        {state.queue.length}/{capacity}
      </span>
    </div>
  );
}
