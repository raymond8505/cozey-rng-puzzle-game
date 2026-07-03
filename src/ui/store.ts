import { create } from "zustand";
import { GAME_CONFIG } from "@/config/game.config";
import type { GameState, GameAction, PieceId, CardType, CellIndex } from "@/game/types";
import { createInitialState } from "@/game/init";
import { reduce } from "@/game/reducer";
import { Rng, shuffle, hashSeed } from "@/game/rng";
import { mintSeed, readSeed } from "./seed";
import { PUZZLES, nextPuzzleIndex } from "./puzzles";
import { messageForResult, type CardToast } from "./cards/cardMessage";

/** Build a fresh game for a given puzzle, applying that puzzle's grid as a
 *  per-run board override on top of the global config. The run's seed is
 *  carried in config.rng so restart() can reproduce this exact run. */
function newGame(puzzleIndex: number, seed: string): GameState {
  const puzzle = PUZZLES[puzzleIndex];
  return createInitialState(seed, { ...GAME_CONFIG, board: puzzle.board, rng: { seed } });
}

const BOOT_INDEX = 0;
const boot = newGame(BOOT_INDEX, readSeed());
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

/** How long a card-play toast shows. The seated card itself is not on a
 *  timer: it stays in the slot until a tile is chosen (see dispatch). */
const TOAST_MS = 1600;

interface GameStore {
  state: GameState;
  /** Which puzzle is in play, and its image source. */
  puzzleIndex: number;
  puzzleSrc: string;
  /** Transient card-play feedback. */
  toast: CardToast | null;
  seatedCard: CardType | null;
  /** Crowbar instanceId awaiting a lift target (board piece), else null. */
  pendingCrowbar: number | null;

  dispatch: (action: GameAction) => void;
  /** Restart the SAME puzzle (dev reseed / manual). */
  restart: (seed?: string) => void;
  /** Play again: alternate to the next puzzle with a fresh seed. */
  playAgain: () => void;
  /** Dev: start a fresh game on a specific puzzle. */
  selectPuzzle: (index: number) => void;

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

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useGame = create<GameStore>((set, get) => {
  const surface = (card: CardType) => {
    const result = get().state.lastCardResult;
    const toast = result ? messageForResult(get().state.config, result) : null;
    set({ seatedCard: card, toast });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), TOAST_MS);
  };

  const freshFeedback = { toast: null, seatedCard: null, pendingCrowbar: null };

  return {
    state: bootState,
    puzzleIndex: BOOT_INDEX,
    puzzleSrc: PUZZLES[BOOT_INDEX].src,
    toast: null,
    seatedCard: null,
    pendingCrowbar: null,

    dispatch: (action) =>
      set((s) => {
        const state = reduce(s.state, action);
        // A tile just got chosen (drawn or second-look kept): the played
        // card has done its job, so the slot and nameplate clear.
        const tileChosen = s.state.held === null && state.held !== null;
        return tileChosen ? { state, seatedCard: null } : { state };
      }),
    restart: (seed) =>
      set((s) => ({
        state: newGame(s.puzzleIndex, seed ?? s.state.config.rng.seed),
        ...freshFeedback,
      })),
    playAgain: () =>
      set((s) => {
        const puzzleIndex = nextPuzzleIndex(s.puzzleIndex);
        return {
          puzzleIndex,
          puzzleSrc: PUZZLES[puzzleIndex].src,
          state: newGame(puzzleIndex, mintSeed()),
          ...freshFeedback,
        };
      }),

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

    selectPuzzle: (index) =>
      set(() => ({
        puzzleIndex: index,
        puzzleSrc: PUZZLES[index].src,
        state: newGame(index, mintSeed()),
        ...freshFeedback,
      })),

    clearPending: () => set({ pendingCrowbar: null }),
    dismissToast: () => set({ toast: null }),

    devSetBoard: (board) =>
      set((s) => ({ state: { ...s.state, board, pool: [], queue: [], held: null } })),
  };
});

// Dev-only handle so headless drivers can read game state while driving the
// real UI. Never present in production builds.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __pcStore?: typeof useGame }).__pcStore = useGame;
}
