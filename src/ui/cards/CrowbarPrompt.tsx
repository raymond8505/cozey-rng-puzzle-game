import { useGame } from "../store";

/** Shown while Crowbar is armed: prompts the player to tap the placed piece to
 *  pry loose, with a Cancel escape. */
export function CrowbarPrompt() {
  const pending = useGame((s) => s.pendingCrowbar);
  const clearPending = useGame((s) => s.clearPending);
  if (pending === null) return null;

  return (
    <div className="crowbar-prompt" role="status">
      <span>Tap a placed piece to pry it loose.</span>
      <button className="crowbar-cancel" onClick={clearPending}>
        Cancel
      </button>
    </div>
  );
}
