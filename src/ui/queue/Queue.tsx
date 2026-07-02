import { useGame } from "../store";
import { gridDims, queueCapacity, legalActions } from "@/game/selectors";
import { PieceSprite } from "../piece/PieceSprite";

/** The parking queue: derived-capacity slots holding pieces set aside. Acts as
 *  a drop target for parking the held piece while that is legal. */
export function Queue() {
  const state = useGame((s) => s.state);
  const dims = gridDims(state);
  const capacity = queueCapacity(state);
  const canPark = legalActions(state).canPark;

  const slots = Array.from({ length: capacity }, (_, i) => state.queue[i] ?? null);

  return (
    <section className="queue" aria-label="Parking queue">
      <div
        className={canPark ? "queue-strip droppable" : "queue-strip"}
        data-drop={canPark ? "queue" : undefined}
      >
        {slots.map((piece, i) => (
          <div className="queue-slot" key={i}>
            {piece !== null && (
              <PieceSprite piece={state.pieces[piece]} dims={dims} className="queue-sprite" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
