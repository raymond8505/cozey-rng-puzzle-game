import { useGame } from "../store";
import { legalActions } from "@/game/selectors";
import { Card } from "./Card";

/** The player's hand of punch cards. */
export function Hand() {
  const hand = useGame((s) => s.state.hand);
  const capacity = useGame((s) => s.state.config.hand.capacity);
  const playable = useGame((s) => legalActions(s.state).canPlayCard);

  return (
    <section className="hand" aria-label="Your cards">
      {hand.length === 0 ? (
        <p className="hand-empty">No cards — place pieces to draw more.</p>
      ) : (
        <div className="hand-row">
          {hand.map((card) => (
            <Card key={card.instanceId} card={card} playable={playable} />
          ))}
        </div>
      )}
      <p className="hand-count">
        {hand.length}/{capacity}
      </p>
    </section>
  );
}
