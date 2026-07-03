// @vitest-environment jsdom
//
// Wiring guard for drag-to-pry: tiles are always dragged, never clicked.
// While a crowbar is armed (pryActive) every placed tile grows a drag ghost
// in the HTML pry layer; without it there are no ghosts and no layer.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { makeState, turnDrawPlace } from "@/fixtures/game.fixture";
import { currentDisplayedPiece } from "@/game/selectors";
import { asCellIndex } from "@/game/types";
import { Board } from "./Board";

afterEach(cleanup);

/** Fresh game with exactly one tile placed (on its home cell). */
function statePlacedOne() {
  const s0 = makeState();
  const piece = currentDisplayedPiece(s0)!;
  return turnDrawPlace(s0, piece, asCellIndex(s0.pieces[piece].home));
}

describe("Board drag-to-pry", () => {
  it("grows one drag ghost per placed tile while prying", () => {
    const state = statePlacedOne();
    const { container } = render(<Board state={state} pryActive />);

    expect(container.querySelectorAll(".pry-token")).toHaveLength(1);
    // ghosts never carry a board drop token — a pried tile can't re-board
    expect(container.querySelector(".pry-token[data-drop]")).toBeNull();
  });

  it("renders no pry layer at all when the crowbar isn't armed", () => {
    const state = statePlacedOne();
    const { container } = render(<Board state={state} />);

    expect(container.querySelector(".pry-layer")).toBeNull();
    expect(container.querySelectorAll(".pry-token")).toHaveLength(0);
  });
});
