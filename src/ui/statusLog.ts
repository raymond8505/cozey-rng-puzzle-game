// The status window's log model. Lines are append-only console entries; the
// pure transition helper below turns reducer state diffs into the hint lines
// that used to render as persistent conditional UI (machine notes, prompts).

import type { GameState } from "@/game/types";
import { machineSpeedMs } from "@/game/selectors";

/** "effect" (green) / "noEffect" (tan) mirror the old toast tones; "info" is
 *  the neutral tone for hints and announcements. */
export type LogTone = "effect" | "noEffect" | "info";

/** A line without identity — what producers emit. */
export interface LogLine {
  readonly text: string;
  readonly tone: LogTone;
}

/** A line in the store — id is a monotonic counter used only as a React key
 *  (timestamps are deliberately absent for now). */
export interface LogEntry extends LogLine {
  readonly id: number;
}

/** History cap so a long session can't grow memory / DOM unboundedly. */
export const LOG_CAP = 100;

/** Derive hint lines from a reducer transition. Each condition fires on the
 *  state EDGE (e.g. held null→non-null), not the level, so a hint logs once
 *  when it becomes relevant instead of re-rendering while it holds. */
export function logForTransition(prev: GameState, next: GameState): LogLine[] {
  const lines: LogLine[] = [];

  // A piece just became held (drawn, second-look kept, or crowbar-lifted):
  // announce the routing options.
  if (prev.held === null && next.held !== null) {
    lines.push({
      tone: "info",
      text: next.held.fullQueueForce
        ? "Queue is full — drag the new piece, or a queued one, onto the board."
        : "Drag onto the board, or into the queue to park.",
    });
  }

  // First armed draw captured a piece: the second-look choice is open.
  if (prev.phase !== "secondLook" && next.phase === "secondLook") {
    lines.push({
      tone: "info",
      text: "Click the captured piece to keep it, or draw again.",
    });
  }

  // Second capture taken: both draws used, a keep is now mandatory.
  if (
    next.phase === "secondLook" &&
    prev.secondLook.drawsUsed < 2 &&
    next.secondLook.drawsUsed >= 2
  ) {
    lines.push({ tone: "info", text: "Keep one — the other goes back." });
  }

  // Governor override just engaged; machineSpeedMs(next) resolves to the
  // comfortable speed while the override is live.
  if (!prev.machine.governorActive && next.machine.governorActive) {
    lines.push({
      tone: "info",
      text: `Governor: running at ${machineSpeedMs(next)}ms this draw.`,
    });
  }

  return lines;
}
