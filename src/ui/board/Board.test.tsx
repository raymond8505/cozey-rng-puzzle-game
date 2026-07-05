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
import { reduce } from "@/game/reducer";
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
    // ghosts are drag sources, never drop targets — empty cells carry the
    // board drop tokens (below), not the ghosts themselves
    expect(container.querySelector(".pry-token[data-drop]")).toBeNull();
  });

  it("opens empty cells as drop targets while prying (one-drag relocate)", () => {
    const state = statePlacedOne();
    const { container } = render(<Board state={state} pryActive />);

    // every empty cell accepts the pried tile; the occupied cell does not
    const drops = container.querySelectorAll(".cell-drop[data-drop]");
    expect(drops).toHaveLength(state.board.filter((c) => c === null).length);
    const occupied = state.board.findIndex((c) => c !== null);
    expect(container.querySelector(`[data-drop="cell:${occupied}"]`)).toBeNull();
  });

  it("keeps empty cells closed when neither routing nor prying", () => {
    const state = statePlacedOne();
    const { container } = render(<Board state={state} />);
    expect(container.querySelector(".cell-drop")).toBeNull();
  });

  it("renders no pry layer at all when the crowbar isn't armed", () => {
    const state = statePlacedOne();
    const { container } = render(<Board state={state} />);

    expect(container.querySelector(".pry-layer")).toBeNull();
    expect(container.querySelectorAll(".pry-token")).toHaveLength(0);
  });
});

describe("Board finished-picture overlay", () => {
  it("shows the overlay while the reveal is active (fresh game)", () => {
    const { container } = render(<Board state={makeState()} />);
    expect(container.querySelectorAll(".board-reveal")).toHaveLength(1);
  });

  it("renders no overlay once the reveal is dismissed", () => {
    const state = reduce(makeState(), { type: "DISMISS_REVEAL" });
    const { container } = render(<Board state={state} />);
    expect(container.querySelector(".board-reveal")).toBeNull();
  });
});
