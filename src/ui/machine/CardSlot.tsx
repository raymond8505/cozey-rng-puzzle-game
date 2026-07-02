import { useGame } from "../store";

/** The Machine's card slot with an indicator light. The drag-to-seat → green-
 *  light sequence is wired in PR 5; for now the light reflects whether a card
 *  effect is currently live this draw (filter or governor active). */
export function CardSlot() {
  const live = useGame(
    (s) => s.state.machine.filter.kind !== "none" || s.state.machine.governorActive,
  );

  return (
    <div className="card-slot" data-drop-slot aria-label="Card slot">
      <div className="card-slot-mouth" />
      <div className={live ? "slot-light on" : "slot-light"} aria-hidden />
    </div>
  );
}
