import { GAME_CONFIG } from "@/config/game.config";

/** Seed from the ?seed= query param (for reproducible playtests), else config. */
export function readSeed(): string {
  if (typeof window === "undefined") return GAME_CONFIG.rng.seed;
  const param = new URLSearchParams(window.location.search).get("seed");
  return param && param.length > 0 ? param : GAME_CONFIG.rng.seed;
}
