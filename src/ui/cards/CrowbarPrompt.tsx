import { useGame } from "../store";

/** Shown while Crowbar is armed: prompts the player to tap the placed piece to
 *  pry loose. There is no cancel — a card, once played, cannot be unplayed;
 *  the lift must resolve. (Draw and other card plays are withheld while armed,
 *  so choosing a target is always possible.) */
export function CrowbarPrompt() {
  const pending = useGame((s) => s.pendingCrowbar);
  if (pending === null) return null;

  return (
    <div className="crowbar-prompt" role="status">
      <span>Tap a placed piece to pry it loose.</span>
    </div>
  );
}
