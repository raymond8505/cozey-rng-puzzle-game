import { create } from "zustand";
import type { GameState, GameAction, PieceId } from "@/game/types";
import { createInitialState } from "@/game/init";
import { reduce } from "@/game/reducer";
import { Rng, shuffle, hashSeed } from "@/game/rng";
import { readSeed } from "./seed";

interface GameStore {
  state: GameState;
  dispatch: (action: GameAction) => void;
  restart: (seed?: string) => void;
  /** Dev-only: overwrite the board directly to eyeball rendering. Bypasses the
   *  rules on purpose — used exclusively by the dev panel, never by gameplay. */
  devSetBoard: (board: readonly (PieceId | null)[]) => void;
}

const boot = createInitialState(readSeed());
// Dev-only quick-fill for eyeballing the board render (#correct in the URL).
const devHash = typeof window !== "undefined" ? window.location.hash : "";
const devFill =
  import.meta.env.DEV && (devHash === "#correct" || devHash === "#shuffled");
const bootState = devFill
  ? {
      ...boot,
      board:
        devHash === "#correct"
          ? boot.pieces.map((p) => p.id)
          : shuffle(boot.pieces.map((p) => p.id), new Rng(hashSeed("dev-shuffle"))),
      pool: [],
      queue: [],
      held: null,
    }
  : boot;

export const useGame = create<GameStore>((set) => ({
  state: bootState,
  dispatch: (action) => set((s) => ({ state: reduce(s.state, action) })),
  restart: (seed) =>
    set((s) => ({ state: createInitialState(seed ?? s.state.config.rng.seed, s.state.config) })),
  devSetBoard: (board) =>
    set((s) => ({ state: { ...s.state, board, pool: [], queue: [], held: null } })),
}));
