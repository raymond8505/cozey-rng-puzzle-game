// Pure game-core types. ZERO React imports allowed in src/game.
//
// The reducer (reducer.ts) is the single authority for the rules of §2.
// The UI never enforces rules — it dispatches GameAction and reads selectors.

import type { GameConfig, DeckCardType } from "@/config/game.config";

// --- Branded identity & geometry -------------------------------------------

/** A stable piece identity. 1:1 with a home cell at init, but a piece may be
 *  *placed* on a non-home cell, so identity and location are distinct. */
export type PieceId = number & { readonly __brand: "PieceId" };

/** An index into the flat board array, 0 .. cols*rows-1. */
export type CellIndex = number & { readonly __brand: "CellIndex" };

export const asPieceId = (n: number): PieceId => n as PieceId;
export const asCellIndex = (n: number): CellIndex => n as CellIndex;

export type EdgeClass = "corner" | "edge" | "interior";

export interface Edge {
  /** +1 = tab points outward, -1 = blank points inward, 0 = flat (board border). */
  readonly sign: -1 | 0 | 1;
  /** Seeded jitter for the tab/blank shape so pieces are not identical. */
  readonly wobble: number;
}

export interface PieceEdges {
  readonly top: Edge;
  readonly right: Edge;
  readonly bottom: Edge;
  readonly left: Edge;
}

export interface Piece {
  readonly id: PieceId;
  /** The cell this piece belongs to; a correct placement is on this cell. */
  readonly home: CellIndex;
  readonly edgeClass: EdgeClass;
  /** Complementary tab/blank edges shared with orthogonal neighbors. */
  readonly edges: PieceEdges;
}

// --- Cards ------------------------------------------------------------------

export type CardType = DeckCardType;

export interface Card {
  /** Unique per physical card instance (the deck holds duplicates). */
  readonly instanceId: number;
  readonly type: CardType;
}

export type CardEffectKind =
  | "governorSpeed"
  | "filterEdge"
  | "filterNeighbor"
  | "secondLookArmed"
  | "crowbarLift";

/** Namespaced <cardKey>.<cause>. The prefix maps to config.copy.noEffect. */
export type CardReasonCode =
  | "edgePunch.noEdgePieces"
  | "neighborPunch.noQualifyingPieces"
  | "secondLook.onePieceLeft"
  | "crowbar.boardEmpty"
  | "governor.unreachable";

export type CardPlayResult =
  | { readonly kind: "effect"; readonly card: CardType; readonly effect: CardEffectKind }
  | { readonly kind: "noEffect"; readonly card: CardType; readonly reasonCode: CardReasonCode };

// --- Machine ----------------------------------------------------------------

export type MachineFilterKind = "none" | "edge" | "neighbor";

/** The active filter shapes the *displayed sequence* for exactly one draw.
 *  Governor is NOT a filter — it only changes speed. */
export interface MachineFilter {
  readonly kind: MachineFilterKind;
}

export interface MachineState {
  /** Cursor into the current displayed sequence (pool after filter). */
  readonly displayIndex: number;
  readonly filter: MachineFilter;
  /** The player's chosen free speed (config.machine.fastMs or slowMs).
   *  TOGGLE_SPEED flips between the two. */
  readonly baseSpeedMs: number;
  /** True while Governor's comfortableMs override is active for this draw.
   *  Effective speed is derived (selectors.machineSpeedMs), not stored, so the
   *  base speed is restored automatically once the override clears. */
  readonly governorActive: boolean;
}

// --- Second Look ------------------------------------------------------------

export interface SecondLookState {
  readonly armed: boolean;
  readonly firstCapture: PieceId | null;
  readonly secondCapture: PieceId | null;
  readonly drawsUsed: 0 | 1 | 2;
}

// --- Held piece (drawn OR crowbar-lifted) -----------------------------------

export type HeldOrigin =
  | { readonly kind: "draw" }
  | { readonly kind: "crowbar"; readonly fromCell: CellIndex };

export interface HeldPiece {
  readonly piece: PieceId;
  readonly origin: HeldOrigin;
  /** Was the queue full at the moment this held piece appeared? Drives the
   *  full-queue forced-placement rule, identically for both origins. */
  readonly fullQueueForce: boolean;
}

// --- Turn phase -------------------------------------------------------------

// A turn is ONE of two actions (§2.2): Action A (draw + route) OR Action B
// (place one queued piece). Both start from `idle` and end the turn on
// completion — there is no phase where both happen in the same turn.
export type TurnPhase =
  | "idle" // turn start: play one card + DRAW (Action A), or place-from-queue (Action B)
  | "secondLook" // Second Look armed, between draw 1 and optional draw 2
  | "routing" // a held piece exists; must be placed/parked/swapped, then turn ends
  | "gameOver";

/** Diagnostic for why the last action was a no-op. Never used for rules copy;
 *  the UI gates actions via selectors.legalActions so these rarely fire. */
export type RejectionCode =
  | "illegalInPhase"
  | "queueFull"
  | "queueEmpty"
  | "cellOccupied"
  | "cellOutOfRange"
  | "cardAlreadyPlayed"
  | "cardNotInHand"
  | "noHeldPiece"
  | "pieceNotInQueue"
  | "noSecondDraw";

// --- RNG --------------------------------------------------------------------

/** mulberry32 cursor. Carried in state only for RESTART reproducibility; no
 *  RNG is consumed during normal play (see reducer / init determinism note). */
export interface RngState {
  readonly numericSeed: number;
  readonly cursor: number;
}

// --- Full game state --------------------------------------------------------

export interface GameState {
  readonly config: GameConfig;

  /** Immutable after init; indexed by PieceId (pieces[id].id === id). */
  readonly pieces: readonly Piece[];

  /** Undrawn pieces in deterministic Machine order. */
  readonly pool: readonly PieceId[];
  /** board[cell] = occupant PieceId or null. Length cols*rows. */
  readonly board: readonly (PieceId | null)[];
  /** Parked pieces; length <= derived queue capacity. */
  readonly queue: readonly PieceId[];
  readonly hand: readonly Card[];
  /** Draw pile; deck[0] is the top card. */
  readonly deck: readonly Card[];
  /** Played cards. When the deck empties, the discard is reshuffled back into
   *  it so cards keep cycling (renewable economy). */
  readonly discard: readonly Card[];
  /** How many times the discard has been reshuffled — seeds each reshuffle so
   *  the sequence stays reproducible. */
  readonly reshuffles: number;

  /** Non-null when a piece is awaiting routing. */
  readonly held: HeldPiece | null;

  readonly phase: TurnPhase;
  /** Enforces "one card max per turn". Reset when the turn ends. */
  readonly cardPlayedThisTurn: boolean;
  readonly machine: MachineState;
  readonly secondLook: SecondLookState;
  readonly rng: RngState;

  /** Latest card play outcome, for the UI status log. */
  readonly lastCardResult: CardPlayResult | null;
  readonly lastRejection: RejectionCode | null;
  readonly turnCount: number;
}

// --- Actions ----------------------------------------------------------------

export type GameAction =
  | { readonly type: "ADVANCE_MACHINE" }
  | { readonly type: "SET_MACHINE_INDEX"; readonly index: number } // test/determinism harness
  | { readonly type: "TOGGLE_SPEED" }
  | { readonly type: "PLAY_CARD"; readonly instanceId: number }
  // Crowbar names its lift target. When the board is empty the card no-effects
  // and `cell` is ignored, so it is optional.
  | { readonly type: "PLAY_CROWBAR"; readonly instanceId: number; readonly cell?: CellIndex }
  | { readonly type: "DRAW" }
  | { readonly type: "SECOND_LOOK_KEEP"; readonly which: "first" | "second" }
  | { readonly type: "PLACE"; readonly cell: CellIndex }
  | { readonly type: "PARK" }
  // Full-queue path: the held piece joins the queue and exactly one piece from
  // (queue ∪ held) is placed. placePiece is held.piece or any queued piece.
  | {
      readonly type: "SWAP";
      readonly placeCell: CellIndex;
      readonly placePiece: PieceId;
    }
  // Action B: place one queued piece on an empty cell. Ends the turn.
  | { readonly type: "PLACE_FROM_QUEUE"; readonly queued: PieceId; readonly cell: CellIndex }
  | { readonly type: "RESTART"; readonly seed?: string }
  | { readonly type: "INSPECT_TARGET" };
