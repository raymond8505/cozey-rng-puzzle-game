import { GAME_CONFIG } from "@/config/game.config";

/** Mint a fresh random seed so each game gets its own piece shapes and orders.
 *  Math.random is fine HERE: minting happens in the UI shell, outside the
 *  deterministic core — the minted string is the input that pins a run, and
 *  restart/?seed= reproduce it through the normal seed pipeline. */
export function mintSeed(): string {
  return `run-${Math.random().toString(36).slice(2, 10)}`;
}

/** Seed from the ?seed= query param (for reproducible playtests), else a fresh
 *  random one per page load. Non-browser contexts (no URL to pin a run with)
 *  keep the deterministic config seed. */
export function readSeed(): string {
  if (typeof window === "undefined") return GAME_CONFIG.rng.seed;
  const param = new URLSearchParams(window.location.search).get("seed");
  return param && param.length > 0 ? param : mintSeed();
}
