// The pure rules engine. reduce(state, action) => state is the single authority
// for §2. Illegal actions are no-ops that set `lastRejection` (a diagnostic);
// the UI gates actions via selectors.legalActions so rejections rarely fire.

import type {
  Card,
  CellIndex,
  GameAction,
  GameState,
  HeldPiece,
  PieceId,
  RejectionCode,
} from "./types";
import { createInitialState } from "./init";
import { resolveCard } from "./cards";
import {
  isQueueFull,
  queueCapacity,
  isGameOver,
  currentDisplayedPiece,
} from "./selectors";

// --- small helpers ----------------------------------------------------------

function reject(state: GameState, code: RejectionCode): GameState {
  return { ...state, lastRejection: code };
}

const inRange = (state: GameState, cell: number): boolean =>
  Number.isInteger(cell) && cell >= 0 && cell < state.board.length;

function withBoard(
  state: GameState,
  cell: CellIndex,
  occupant: PieceId | null,
): readonly (PieceId | null)[] {
  const board = state.board.slice();
  board[cell] = occupant;
  return board;
}

/** Card economy: a placement draws the top deck card if there's room. This is
 *  the ONLY card income and must be called after every placement — and never
 *  after a park or a card play. */
function drawCardIntoHand(state: GameState): GameState {
  if (state.hand.length >= state.config.hand.capacity || state.deck.length === 0) {
    return state;
  }
  const [top, ...rest] = state.deck;
  return { ...state, hand: [...state.hand, top as Card], deck: rest };
}

/** Collapse turn-scoped flags and advance to the next turn (or game over). */
function endTurn(state: GameState): GameState {
  const next: GameState = {
    ...state,
    held: null,
    cardPlayedThisTurn: false,
    machine: {
      ...state.machine,
      filter: { kind: "none" },
      governorActive: false,
      displayIndex: 0,
    },
    secondLook: { armed: false, firstCapture: null, secondCapture: null, drawsUsed: 0 },
    turnCount: state.turnCount + 1,
  };
  return { ...next, phase: isGameOver(next) ? "gameOver" : "idle" };
}

/** Spend the one-draw filter/governor the moment a drawn piece is captured. */
function clearDrawModifiers(state: GameState): GameState {
  return {
    ...state,
    machine: {
      ...state.machine,
      filter: { kind: "none" },
      governorActive: false,
      displayIndex: 0,
    },
  };
}

function makeHeld(
  piece: PieceId,
  origin: HeldPiece["origin"],
  state: GameState,
): HeldPiece {
  return { piece, origin, fullQueueForce: isQueueFull(state) };
}

// --- action handlers --------------------------------------------------------

export function reduce(state: GameState, action: GameAction): GameState {
  // Reset the transient rejection on every dispatch; handlers that reject set it.
  const s = state.lastRejection === null ? state : { ...state, lastRejection: null };

  switch (action.type) {
    // --- always-available / free ---
    case "RESTART":
      return createInitialState(action.seed ?? s.config.rng.seed, s.config);

    case "INSPECT_TARGET":
      return s; // UI-only; no core state change.

    case "TOGGLE_SPEED": {
      if (s.phase === "gameOver") return reject(s, "illegalInPhase");
      const { fastMs, slowMs } = s.config.machine;
      const nextBase = s.machine.baseSpeedMs === fastMs ? slowMs : fastMs;
      return { ...s, machine: { ...s.machine, baseSpeedMs: nextBase } };
    }

    case "ADVANCE_MACHINE": {
      if (s.phase === "gameOver") return s;
      // Cursor over the fixed pool order; selector re-mods against the current
      // displayed sequence length, so raw increment is safe.
      return {
        ...s,
        machine: { ...s.machine, displayIndex: s.machine.displayIndex + 1 },
      };
    }

    case "SET_MACHINE_INDEX":
      return { ...s, machine: { ...s.machine, displayIndex: action.index } };

    // --- Action A: play a card (one per turn) ---
    case "PLAY_CARD": {
      if (s.phase !== "idle" || s.cardPlayedThisTurn)
        return reject(s, "cardAlreadyPlayed");
      const card = s.hand.find((c) => c.instanceId === action.instanceId);
      if (!card) return reject(s, "cardNotInHand");
      if (card.type === "crowbar")
        // Crowbar needs a target; the UI must dispatch PLAY_CROWBAR.
        return reject(s, "illegalInPhase");

      const result = resolveCard(s, card.type);
      const hand = s.hand.filter((c) => c.instanceId !== action.instanceId);
      let next: GameState = {
        ...s,
        hand,
        cardPlayedThisTurn: true,
        lastCardResult: result,
      };

      if (result.kind === "effect") {
        switch (result.effect) {
          case "governorSpeed":
            next = { ...next, machine: { ...next.machine, governorActive: true } };
            break;
          case "filterEdge":
            next = {
              ...next,
              machine: { ...next.machine, filter: { kind: "edge" }, displayIndex: 0 },
            };
            break;
          case "filterNeighbor":
            next = {
              ...next,
              machine: { ...next.machine, filter: { kind: "neighbor" }, displayIndex: 0 },
            };
            break;
          case "secondLookArmed":
            next = { ...next, secondLook: { ...next.secondLook, armed: true } };
            break;
          case "crowbarLift":
            break; // unreachable here; crowbar routed via PLAY_CROWBAR.
        }
      }
      return next;
    }

    case "PLAY_CROWBAR": {
      if (s.phase !== "idle" || s.cardPlayedThisTurn)
        return reject(s, "cardAlreadyPlayed");
      const card = s.hand.find((c) => c.instanceId === action.instanceId);
      if (!card) return reject(s, "cardNotInHand");
      if (card.type !== "crowbar") return reject(s, "illegalInPhase");

      const result = resolveCard(s, "crowbar");

      if (result.kind === "effect") {
        // Requires a valid, occupied target cell. Validate BEFORE consuming so a
        // mis-dispatch (no/empty cell) doesn't silently waste the card.
        const cell = action.cell;
        if (cell === undefined || !inRange(s, cell))
          return reject(s, "cellOutOfRange");
        const lifted = s.board[cell];
        if (lifted === null) return reject(s, "cellOccupied");

        const hand = s.hand.filter((c) => c.instanceId !== action.instanceId);
        const held = makeHeld(lifted, { kind: "crowbar", fromCell: cell }, s);
        return {
          ...s,
          hand,
          board: withBoard(s, cell, null),
          held,
          phase: "routing",
          cardPlayedThisTurn: true,
          lastCardResult: result,
        };
      }

      // No-effect (board empty): card is still consumed; a normal DRAW remains
      // available this turn.
      const hand = s.hand.filter((c) => c.instanceId !== action.instanceId);
      return { ...s, hand, cardPlayedThisTurn: true, lastCardResult: result };
    }

    // --- Action A: draw ---
    case "DRAW": {
      if (s.phase === "idle") {
        const captured = currentDisplayedPiece(s);
        if (captured === null) return reject(s, "noHeldPiece");
        const pool = s.pool.filter((id) => id !== captured);

        if (s.secondLook.armed) {
          return {
            ...s,
            pool,
            phase: "secondLook",
            secondLook: {
              armed: true,
              firstCapture: captured,
              secondCapture: null,
              drawsUsed: 1,
            },
            machine: { ...s.machine, displayIndex: 0 },
          };
        }

        const held = makeHeld(captured, { kind: "draw" }, s);
        return clearDrawModifiers({ ...s, pool, held, phase: "routing" });
      }

      if (s.phase === "secondLook" && s.secondLook.drawsUsed === 1) {
        const captured = currentDisplayedPiece(s);
        if (captured === null) return reject(s, "noSecondDraw");
        const pool = s.pool.filter((id) => id !== captured);
        return {
          ...s,
          pool,
          secondLook: { ...s.secondLook, secondCapture: captured, drawsUsed: 2 },
          machine: { ...s.machine, displayIndex: 0 },
        };
      }

      return reject(s, "illegalInPhase");
    }

    case "SECOND_LOOK_KEEP": {
      if (s.phase !== "secondLook") return reject(s, "illegalInPhase");
      const { firstCapture, secondCapture } = s.secondLook;
      if (firstCapture === null) return reject(s, "illegalInPhase");

      let kept: PieceId;
      let unkept: PieceId | null;
      if (action.which === "second") {
        if (secondCapture === null) return reject(s, "noSecondDraw");
        kept = secondCapture;
        unkept = firstCapture;
      } else {
        kept = firstCapture;
        unkept = secondCapture; // may be null if only drew once
      }

      // Unkept piece returns to the pool tail (deterministic, no RNG).
      const pool = unkept === null ? s.pool : [...s.pool, unkept];
      const held = makeHeld(kept, { kind: "draw" }, s);
      return {
        ...s,
        pool,
        held,
        phase: "routing",
        secondLook: { armed: false, firstCapture: null, secondCapture: null, drawsUsed: 0 },
        machine: { ...s.machine, displayIndex: 0 },
      };
    }

    // --- routing a held piece (draw- or crowbar-origin) ---
    case "PLACE": {
      if (s.phase !== "routing" || s.held === null) return reject(s, "noHeldPiece");
      if (!inRange(s, action.cell)) return reject(s, "cellOutOfRange");
      if (s.board[action.cell] !== null) return reject(s, "cellOccupied");

      const placed: GameState = {
        ...s,
        board: withBoard(s, action.cell, s.held.piece),
        held: null,
      };
      return endTurn(drawCardIntoHand(placed));
    }

    case "PARK": {
      if (s.phase !== "routing" || s.held === null) return reject(s, "noHeldPiece");
      if (s.held.fullQueueForce || isQueueFull(s)) return reject(s, "queueFull");

      const parked: GameState = {
        ...s,
        queue: [...s.queue, s.held.piece],
        held: null,
      };
      // Parking is not a placement: no card income.
      return endTurn(parked);
    }

    case "SWAP": {
      if (s.phase !== "routing" || s.held === null) return reject(s, "noHeldPiece");
      if (!s.held.fullQueueForce) return reject(s, "illegalInPhase");
      if (!inRange(s, action.placeCell)) return reject(s, "cellOutOfRange");
      if (s.board[action.placeCell] !== null) return reject(s, "cellOccupied");

      const held = s.held.piece;
      const isHeld = action.placePiece === held;
      const inQueue = s.queue.includes(action.placePiece);
      if (!isHeld && !inQueue) return reject(s, "pieceNotInQueue");

      // held joins the queue; exactly one of (queue ∪ held) is placed. Result
      // keeps the queue full (size unchanged) and fills one cell.
      const pool = [...s.queue, held];
      const nextQueue = pool.filter((id) => id !== action.placePiece);
      const swapped: GameState = {
        ...s,
        queue: nextQueue,
        board: withBoard(s, action.placeCell, action.placePiece),
        held: null,
      };
      return endTurn(drawCardIntoHand(swapped));
    }

    // --- Action B: place from queue ---
    case "PLACE_FROM_QUEUE": {
      // Playing a card commits the turn to Action A, so Action B is idle-only
      // and only before any card is played.
      if (s.phase !== "idle" || s.cardPlayedThisTurn)
        return reject(s, "illegalInPhase");
      if (!s.queue.includes(action.queued)) return reject(s, "pieceNotInQueue");
      if (!inRange(s, action.cell)) return reject(s, "cellOutOfRange");
      if (s.board[action.cell] !== null) return reject(s, "cellOccupied");

      const placed: GameState = {
        ...s,
        queue: s.queue.filter((id) => id !== action.queued),
        board: withBoard(s, action.cell, action.queued),
      };
      return endTurn(drawCardIntoHand(placed));
    }
  }
}

// Re-export the derived capacity for callers that don't want to import selectors.
export { queueCapacity };
