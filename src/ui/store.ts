import { create } from "zustand";
import { GAME_CONFIG } from "@/config/game.config";
import type {
  GameState,
  GameAction,
  PieceId,
  CardType,
  CellIndex,
} from "@/game/types";
import { createInitialState } from "@/game/init";
import { reduce } from "@/game/reducer";
import { Rng, shuffle, hashSeed } from "@/game/rng";
import { mintSeed, readSeed } from "./seed";
import { PUZZLES, nextPuzzleIndex } from "./puzzles";
import { messageForResult } from "./cards/cardMessage";
import { CARD_META } from "./cards/cardMeta";
import { logForTransition, drawPrompt, LOG_CAP } from "./statusLog";
import type { LogEntry, LogLine } from "./statusLog";

/** Build a fresh game for a given puzzle, applying that puzzle's grid as a
 *  per-run board override on top of the global config. The run's seed is
 *  carried in config.rng so restart() can reproduce this exact run. */
function newGame(puzzleIndex: number, seed: string): GameState {
  const puzzle = PUZZLES[puzzleIndex];
  return createInitialState(seed, {
    ...GAME_CONFIG,
    board: puzzle.board,
    rng: { seed },
  });
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
          : shuffle(
              boot.pieces.map((p) => p.id),
              new Rng(hashSeed("dev-shuffle")),
            ),
      pool: [],
      queue: [],
      held: null,
      // The quick-fill exists to eyeball the board — don't hide it.
      revealActive: false,
    }
  : boot;

interface GameStore {
  state: GameState;
  /** Which puzzle is in play, and its image source. */
  puzzleIndex: number;
  puzzleSrc: string;
  /** Console-style status history rendered by the StatusWindow. */
  log: LogEntry[];
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

  /** Play a non-crowbar card: dispatch, then seat it and log the outcome. */
  playCard: (instanceId: number) => void;
  /** Arm crowbar to await a board target (board non-empty). Arming is not
   *  cancellable — a played card cannot be unplayed — so it only clears by
   *  resolving (playCrowbar) or starting a fresh game. */
  armCrowbar: (instanceId: number) => void;
  /** Resolve crowbar: lift `cell` (or no-effect when omitted / board empty). */
  playCrowbar: (instanceId: number, cell?: CellIndex) => void;

  /** Dev-only: overwrite the board directly to eyeball rendering. */
  devSetBoard: (board: readonly (PieceId | null)[]) => void;
  /** Dev-only: conjure a card into the hand (ignores hand capacity). */
  devAddCard: (type: CardType) => void;
  /** Dev-only: discard a card straight out of the hand. */
  devRemoveCard: (instanceId: number) => void;
}

// Monotonic log-entry ids: unique React keys even across a same-frame
// clear-and-append, so never reset on new game.
let nextLogId = 0;

/** How long a dud (no-effect) card sits in the slot before the Machine spits
 *  it back out. Long enough to register the insert, short enough not to stall
 *  the turn. Exported for tests. */
export const NO_EFFECT_EJECT_MS = 1200;

const appendLog = (
  log: readonly LogEntry[],
  lines: readonly LogLine[],
): LogEntry[] =>
  lines.length === 0
    ? (log as LogEntry[])
    : [...log, ...lines.map((l) => ({ id: nextLogId++, ...l }))].slice(
        -LOG_CAP,
      );

export const useGame = create<GameStore>((set) => {
  /** Reduce + transition hints + seat lifecycle, shared by every action that
   *  funnels through the game reducer. `extra` reads the post-reduce state
   *  (for lastCardResult); its lines log ahead of the transition hints. */
  const applyAction = (
    s: GameStore,
    action: GameAction,
    extra?: (next: GameState) => readonly LogLine[],
  ): { state: GameState; log: LogEntry[]; seatedCard?: null } => {
    const state = reduce(s.state, action);
    const log = appendLog(s.log, [
      ...(extra ? extra(state) : []),
      ...logForTransition(s.state, state),
    ]);
    // A tile just got chosen (drawn or second-look kept): the played card has
    // done its job, so the slot clears. Reveal is the exception — its job is
    // the picture, so it stays seated until the grab that fades it (the
    // DISMISS_REVEAL that actually flips revealActive off).
    const tileChosen = s.state.held === null && state.held !== null;
    const revealFaded = s.state.revealActive && !state.revealActive;
    const seatDone = s.seatedCard === "reveal" ? revealFaded : tileChosen;
    return seatDone ? { state, log, seatedCard: null } : { state, log };
  };

  /** Outcome line for a just-reduced card play, if it produced a result. */
  const resultLines = (state: GameState): LogLine[] =>
    state.lastCardResult
      ? [messageForResult(state.config, state.lastCardResult)]
      : [];

  /** The insert announcement — shared by direct plays and crowbar arming so
   *  the console always narrates a play the same way. */
  const insertedLine = (card: CardType): LogLine => ({
    tone: "info",
    text: `Card Inserted: ${CARD_META[card].name}.`,
  });

  /** The played-card announcement plus its outcome line, in reading order. */
  const playLines = (card: CardType, state: GameState): LogLine[] => [
    insertedLine(card),
    ...resultLines(state),
  ];

  // Guards the eject timer against clearing a card seated later: each seat
  // bumps the serial, and a pending eject only fires if its seat is still
  // the latest one.
  let seatSerial = 0;

  /** Seat a just-played card. An effective card stays seated (until a tile is
   *  chosen); a dud (no-effect) card gets spat back out after a beat — its
   *  explanation is already in the console, and the turn continues. */
  const seatCard = (card: CardType, state: GameState): Partial<GameStore> => {
    const serial = ++seatSerial;
    if (state.lastCardResult?.kind === "noEffect") {
      setTimeout(() => {
        set((s) =>
          serial === seatSerial && s.seatedCard !== null
            ? { seatedCard: null }
            : {},
        );
      }, NO_EFFECT_EJECT_MS);
    }
    return { seatedCard: card };
  };

  /** Feedback reset for a fresh game: empty seat and prompt state, log
   *  opening with the draw prompt (unless the board starts with a dry pool,
   *  e.g. the dev quick-fill boot). */
  const freshFeedback = (state: GameState) => ({
    seatedCard: null,
    pendingCrowbar: null,
    log: appendLog([], state.pool.length > 0 ? [drawPrompt(state)] : []),
  });

  return {
    state: bootState,
    puzzleIndex: BOOT_INDEX,
    puzzleSrc: PUZZLES[BOOT_INDEX].src,
    ...freshFeedback(bootState),

    dispatch: (action) => set((s) => applyAction(s, action)),
    restart: (seed) =>
      set((s) => {
        const state = newGame(s.puzzleIndex, seed ?? s.state.config.rng.seed);
        return { state, ...freshFeedback(state) };
      }),
    playAgain: () =>
      set((s) => {
        const puzzleIndex = nextPuzzleIndex(s.puzzleIndex);
        const state = newGame(puzzleIndex, mintSeed());
        return {
          puzzleIndex,
          puzzleSrc: PUZZLES[puzzleIndex].src,
          state,
          ...freshFeedback(state),
        };
      }),

    playCard: (instanceId) =>
      set((s) => {
        const card = s.state.hand.find((c) => c.instanceId === instanceId);
        if (!card) return {};
        const applied = applyAction(s, { type: "PLAY_CARD", instanceId }, (next) =>
          playLines(card.type, next),
        );
        return { ...applied, ...seatCard(card.type, applied.state) };
      }),

    armCrowbar: (instanceId) =>
      set((s) => ({
        pendingCrowbar: instanceId,
        // The card is in the machine from the moment it's played — it stays
        // seated through the whole armed-lift sequence.
        seatedCard: "crowbar",
        log: appendLog(s.log, [
          insertedLine("crowbar"),
          {
            tone: "info",
            text: "Drag a tile off the board — into the window, the tray, or an empty spot — to pry it loose.",
          },
        ]),
      })),

    playCrowbar: (instanceId, cell) =>
      set((s) => {
        // The armed path already announced the play at arm time; only the
        // direct no-effect play (empty board, never armed) announces here.
        const announced = s.pendingCrowbar !== null;
        const applied = applyAction(
          s,
          { type: "PLAY_CROWBAR", instanceId, cell },
          (next) => (announced ? resultLines(next) : playLines("crowbar", next)),
        );
        return {
          ...applied,
          pendingCrowbar: null,
          ...seatCard("crowbar", applied.state),
        };
      }),

    selectPuzzle: (index) =>
      set(() => {
        const state = newGame(index, mintSeed());
        return {
          puzzleIndex: index,
          puzzleSrc: PUZZLES[index].src,
          state,
          ...freshFeedback(state),
        };
      }),

    devSetBoard: (board) =>
      set((s) => ({
        state: {
          ...s.state,
          board,
          pool: [],
          queue: [],
          held: null,
          // Board inspection tool — the overlay would hide what it shows.
          revealActive: false,
        },
      })),

    devAddCard: (type) =>
      set((s) => {
        // instanceIds must stay unique across hand/deck/discard (React keys,
        // PLAY_CARD lookups), so mint one past everything in circulation.
        const everyCard = [
          ...s.state.hand,
          ...s.state.deck,
          ...s.state.discard,
        ];
        const instanceId =
          everyCard.reduce((m, c) => Math.max(m, c.instanceId), -1) + 1;
        return {
          state: { ...s.state, hand: [...s.state.hand, { instanceId, type }] },
        };
      }),

    devRemoveCard: (instanceId) =>
      set((s) => ({
        state: {
          ...s.state,
          hand: s.state.hand.filter((c) => c.instanceId !== instanceId),
        },
      })),
  };
});

// Dev-only handle so headless drivers can read game state while driving the
// real UI. Never present in production builds.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __pcStore?: typeof useGame }).__pcStore = useGame;
}
