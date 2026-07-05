import type { PieceId } from "@/game/types";

/** One tile's littered pose in the parking tray: center position as a
 *  percentage of the tray box, plus the sideways tumble it landed with. */
export interface Throw {
  readonly xPct: number;
  readonly yPct: number;
  readonly rotDeg: number;
}

/* Centers stay inside these bounds so a 56px sprite doesn't escape the tray. */
const X_MIN = 12;
const X_MAX = 88;
const Y_MIN = 32;
const Y_SPAN = 36;
/* "Thrown down" reads as lying sideways: 90 ± 25 degrees. */
const ROT_MIN = 65;
const ROT_SPAN = 50;

/** UI-only scatter state — game state stays pure. Keyed by PieceId (stable),
 *  so a pose persists across re-renders; pruned entries mean a piece that
 *  leaves and comes back gets a fresh toss. */
const throws = new Map<PieceId, Throw>();

/** Sync the scatter map to the current queue: prune departed pieces, lazily
 *  toss new arrivals. Idempotent, so safe to call during render. */
export function scatterFor(
  queue: readonly PieceId[],
  capacity: number,
): ReadonlyMap<PieceId, Throw> {
  for (const id of [...throws.keys()]) {
    if (!queue.includes(id)) throws.delete(id);
  }
  for (const id of queue) {
    if (!throws.has(id)) throws.set(id, toss(capacity));
  }
  return throws;
}

/** Haphazard but spread out: the x-range splits into `capacity` bands and a
 *  new throw lands jittered inside one of the least-occupied bands, so tiles
 *  fill the width instead of piling up. */
function toss(capacity: number): Throw {
  const bands = Math.max(1, capacity);
  const bandWidth = (X_MAX - X_MIN) / bands;
  const counts = new Array<number>(bands).fill(0);
  for (const t of throws.values()) {
    const b = Math.min(bands - 1, Math.floor((t.xPct - X_MIN) / bandWidth));
    counts[b] += 1;
  }
  const emptiest = Math.min(...counts);
  const open = counts.flatMap((c, i) => (c === emptiest ? [i] : []));
  const band = open[Math.floor(Math.random() * open.length)];
  return {
    xPct: X_MIN + (band + 0.15 + Math.random() * 0.7) * bandWidth,
    yPct: Y_MIN + Math.random() * Y_SPAN,
    rotDeg: ROT_MIN + Math.random() * ROT_SPAN,
  };
}

export function _resetForTests(): void {
  throws.clear();
}
