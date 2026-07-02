// Seeded, deterministic RNG. NEVER use Math.random in game logic.
//
// Determinism contract: the RNG is consumed ONLY at init (init.ts) — for the
// home-cell permutation, pool ordering, edge wobble, and deck order. During
// normal play no RNG is drawn (ADVANCE_MACHINE just moves a cursor over a fixed
// order), so "same seed => same geometry AND same Machine sequence" holds
// regardless of UI timing. RngState is carried in GameState only so RESTART
// can reproduce a run.

import type { RngState } from "./types";

/** Hash a string seed to a 32-bit unsigned integer (xfnv1a). */
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small stateful PRNG built on mulberry32. Pure per-step: each next()
 *  advances an internal cursor deterministically from the numeric seed. */
export class Rng {
  private state: number;

  constructor(numericSeed: number, cursor = 0) {
    // Fold the cursor into the starting state so (seed, cursor) fully
    // determines the stream position — this makes RngState round-trippable.
    this.state = (numericSeed + Math.imul(cursor, 0x6d2b79f5)) >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/** Fisher–Yates shuffle producing a new array; deterministic given the Rng. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const a = out[i];
    const b = out[j];
    out[i] = b;
    out[j] = a;
  }
  return out;
}

export function makeRngState(seed: string): RngState {
  return { numericSeed: hashSeed(seed), cursor: 0 };
}
