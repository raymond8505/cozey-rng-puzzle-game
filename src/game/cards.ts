// Card resolution: classify a play as { effect } | { noEffect, reasonCode }.
//
// A card is NEVER blocked — any card is playable in any state. If it resolves
// to nothing it is still consumed and returns a SPECIFIC reasonCode; the UI
// maps reasonCode.split(".")[0] to config.copy.noEffect[key]. The reducer reads
// the classification here and applies the matching state change for effects.

import type { CardPlayResult, CardType, GameState } from "./types";
import { orthNeighbors } from "./grid";
import { gridDims } from "./selectors";

/** Does the pool still contain any edge/corner piece? */
export function poolHasEdgePiece(s: GameState): boolean {
  return s.pool.some((id) => s.pieces[id].edgeClass !== "interior");
}

/** Any pool piece whose home cell is orthogonally adjacent to a filled cell? */
export function poolHasNeighborPiece(s: GameState): boolean {
  const dims = gridDims(s);
  return s.pool.some((id) =>
    orthNeighbors(s.pieces[id].home, dims).some((n) => s.board[n] !== null),
  );
}

export function boardHasPlacedPiece(s: GameState): boolean {
  return s.board.some((c) => c !== null);
}

/** Pure classification. Governor is the only card with no reachable no-effect,
 *  but it still returns a structured result for uniformity. */
export function resolveCard(s: GameState, card: CardType): CardPlayResult {
  switch (card) {
    case "governor":
      return { kind: "effect", card, effect: "governorSpeed" };

    case "edgePunch":
      return poolHasEdgePiece(s)
        ? { kind: "effect", card, effect: "filterEdge" }
        : { kind: "noEffect", card, reasonCode: "edgePunch.noEdgePieces" };

    case "neighborPunch":
      return poolHasNeighborPiece(s)
        ? { kind: "effect", card, effect: "filterNeighbor" }
        : {
            kind: "noEffect",
            card,
            reasonCode: "neighborPunch.noQualifyingPieces",
          };

    case "secondLook":
      return s.pool.length >= 2
        ? { kind: "effect", card, effect: "secondLookArmed" }
        : { kind: "noEffect", card, reasonCode: "secondLook.onePieceLeft" };

    case "crowbar":
      return boardHasPlacedPiece(s)
        ? { kind: "effect", card, effect: "crowbarLift" }
        : { kind: "noEffect", card, reasonCode: "crowbar.boardEmpty" };

    case "reveal":
      return s.revealActive
        ? { kind: "noEffect", card, reasonCode: "reveal.alreadyShowing" }
        : { kind: "effect", card, effect: "revealBoard" };
  }
}
