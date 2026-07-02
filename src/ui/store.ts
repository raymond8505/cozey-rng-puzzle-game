import { create } from "zustand";
import type { GameState, GameAction, PieceId, CardType, CellIndex } from "@/game/types";
import { createInitialState } from "@/game/init";
import { reduce } from "@/game/reducer";
import { Rng, shuffle, hashSeed } from "@/game/rng";
import { readSeed } from "./seed";
import { messageForResult, type CardToast } from "./cards/cardMessage";

const boot = createInitialState(readSeed());
// Dev-only quick-fill for eyeballing the board render (#correct / #shuffled).
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

/** How long a played card sits seated in the slot / its toast shows. */
const SEAT_MS = 1600;

interface GameStore {
  state: GameState;
  /** Transient card-play feedback. */
  toast: CardToast | null;
  seatedCard: CardType | null;
  /** Crowbar instanceId awaiting a lift target (board piece), else null. */
  pendingCrowbar: number | null;

  dispatch: (action: GameAction) => void;
  restart: (seed?: string) => void;

  /** Play a non-crowbar card: dispatch, then surface the seat + toast. */
  playCard: (instanceId: number) => void;
  /** Arm crowbar to await a board target (board non-empty). */
  armCrowbar: (instanceId: number) => void;
  /** Resolve crowbar: lift `cell` (or no-effect when omitted / board empty). */
  playCrowbar: (instanceId: number, cell?: CellIndex) => void;
  clearPending: () => void;
  dismissToast: () => void;

  /** Dev-only: overwrite the board directly to eyeball rendering. */
  devSetBoard: (board: readonly (PieceId | null)[]) => void;
}

let seatTimer: ReturnType<typeof setTimeout> | undefined;

export const useGame = create<GameStore>((set, get) => {
  const surface = (card: CardType) => {
    const result = get().state.lastCardResult;
    const toast = result ? messageForResult(get().state.config, result) : null;
    set({ seatedCard: card, toast });
    clearTimeout(seatTimer);
    seatTimer = setTimeout(() => set({ seatedCard: null, toast: null }), SEAT_MS);
  };

  return {
    state: bootState,
    toast: null,
    seatedCard: null,
    pendingCrowbar: null,

    dispatch: (action) => set((s) => ({ state: reduce(s.state, action) })),
    restart: (seed) =>
      set((s) => ({
        state: createInitialState(seed ?? s.state.config.rng.seed, s.state.config),
        toast: null,
        seatedCard: null,
        pendingCrowbar: null,
      })),

    playCard: (instanceId) => {
      const card = get().state.hand.find((c) => c.instanceId === instanceId);
      if (!card) return;
      set((s) => ({ state: reduce(s.state, { type: "PLAY_CARD", instanceId }) }));
      surface(card.type);
    },

    armCrowbar: (instanceId) => set({ pendingCrowbar: instanceId }),

    playCrowbar: (instanceId, cell) => {
      set((s) => ({ state: reduce(s.state, { type: "PLAY_CROWBAR", instanceId, cell }) }));
      set({ pendingCrowbar: null });
      surface("crowbar");
    },

    clearPending: () => set({ pendingCrowbar: null }),
    dismissToast: () => set({ toast: null }),

    devSetBoard: (board) =>
      set((s) => ({ state: { ...s.state, board, pool: [], queue: [], held: null } })),
  };
});
