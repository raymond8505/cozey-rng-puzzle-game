import { useGame } from "../store";
import { legalActions } from "@/game/selectors";
import { Card } from "./Card";

/** The player's hand of punch cards. */
export function Hand() {
  const hand = useGame((s) => s.state.hand);
  const capacity = useGame((s) => s.state.config.hand.capacity);
  // While crowbar awaits its lift target no other card may be played: PLAY_*
  // needs an un-spent turn, arming is not cancellable, and a second play
  // would consume the turn the pending lift needs to resolve.
  const playable = useGame(
    (s) => legalActions(s.state).canPlayCard && s.pendingCrowbar === null,
  );

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
