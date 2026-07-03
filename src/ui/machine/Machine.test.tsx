// @vitest-environment jsdom
//
// Wiring guard for the chosen-piece window: once a piece is drawn (or
// crowbar-lifted) it must render draggable INSIDE the display window, with the
// window in its `chosen` state — there is no separate tray or bay. Also guards
// the routing hint reaching the status log (hint *production*, including the
// forced full-queue variant, is pinned in statusLog.test.ts), and the Second
// Look chooser, which likewise lives in the window (`choices` state) and must
// actually dispatch SECOND_LOOK_KEEP so the player can reach `routing`.

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { reduce } from "@/game/reducer";
import type { GameState } from "@/game/types";
import { currentDisplayedPiece } from "@/game/selectors";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { Machine } from "./Machine";

/** Drive a state into second look with `draws` captures taken. */
function enterSecondLook(draws: 1 | 2): GameState {
  let s: GameState = { ...makeState(), hand: [{ instanceId: 1, type: "secondLook" }] };
  s = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
  s = reduce(s, { type: "DRAW" });
  if (draws === 2) s = reduce(s, { type: "DRAW" });
  return s;
}

afterEach(cleanup);
// The store is a module singleton — dispatches leave log residue, so each
// test starts from an empty status history.
beforeEach(() => useGame.setState({ log: [] }));

describe("Machine chosen-piece window", () => {
  it("renders the held piece draggable inside the window, and logs the routing hint", () => {
    // Draw through the store (not bare reduce): the routing hint is a log
    // entry appended by dispatch, no longer a conditional render.
    useGame.setState({ state: makeState() });
    useGame.getState().dispatch({ type: "DRAW" });
    expect(useGame.getState().state.held).not.toBeNull();

    const { container } = render(<Machine />);
    const win = container.querySelector(".machine-window")!;
    expect(win.classList.contains("chosen")).toBe(true);
    expect(win.querySelector(".held-token svg")).not.toBeNull();
    expect(
      within(screen.getByRole("log")).getByText(/drag onto the board/i),
    ).toBeTruthy();
  });

  it("shows the plain cycling window while nothing is held", () => {
    useGame.setState({ state: makeState() });

    const { container } = render(<Machine />);
    const win = container.querySelector(".machine-window")!;
    expect(win.classList.contains("chosen")).toBe(false);
    expect(win.querySelector(".held-token")).toBeNull();
    expect(screen.queryByText(/drag onto the board/i)).toBeNull();
  });
});

// While cycling, the window itself is a draw control: clicking the displayed
// piece captures it, same as the Draw button. Once a piece is held the window
// is display-only again (its content is dragged, not clicked).
describe("Machine window click-to-draw", () => {
  it("clicking the cycling window draws the displayed piece", () => {
    const s = makeState();
    useGame.setState({ state: s });
    const displayed = currentDisplayedPiece(s);

    render(<Machine />);
    fireEvent.click(screen.getByRole("button", { name: /draw the displayed piece/i }));

    const after = useGame.getState().state;
    expect(after.held?.piece).toBe(displayed);
    expect(after.phase).toBe("routing");
  });

  it("is not clickable once a piece is held", () => {
    useGame.setState({ state: reduce(makeState(), { type: "DRAW" }) });

    render(<Machine />);
    expect(screen.queryByRole("button", { name: /draw the displayed piece/i })).toBeNull();
  });
});

// Second Look renders inside the window: it expands (`choices`) to show the
// capture(s) — beside the still-cycling reel while the second draw is open —
// and clicking a capture keeps it.
describe("Machine second-look window", () => {
  it("keeps the first piece after one draw and reaches routing", () => {
    const s = enterSecondLook(1);
    const first = s.secondLook.firstCapture!;
    useGame.setState({ state: s });

    const { container } = render(<Machine />);
    const win = container.querySelector(".machine-window")!;
    expect(win.classList.contains("choices")).toBe(true);
    expect(win.classList.contains("chosen")).toBe(true); // green: tile waits to be grabbed

    fireEvent.click(screen.getByRole("button", { name: /keep this piece/i }));

    const after = useGame.getState().state;
    expect(after.phase).toBe("routing");
    expect(after.held?.piece).toBe(first);
  });

  it("keeps the reel cycling beside the capture until the second draw", () => {
    const s = enterSecondLook(1);
    useGame.setState({ state: s });
    const displayed = currentDisplayedPiece(s);

    render(<Machine />);
    fireEvent.click(screen.getByRole("button", { name: /draw the displayed piece/i }));

    const after = useGame.getState().state;
    expect(after.secondLook.secondCapture).toBe(displayed);
    expect(after.secondLook.drawsUsed).toBe(2);
  });

  it("lets the player keep EITHER piece after two draws", () => {
    const s = enterSecondLook(2);
    const second = s.secondLook.secondCapture!;
    useGame.setState({ state: s });

    render(<Machine />);
    const keeps = screen.getAllByRole("button", { name: /keep this piece/i });
    expect(keeps).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /draw the displayed piece/i })).toBeNull();
    fireEvent.click(keeps[1]); // keep the second

    const after = useGame.getState().state;
    expect(after.phase).toBe("routing");
    expect(after.held?.piece).toBe(second);
  });

  it("offers no keep buttons outside the second-look phase", () => {
    useGame.setState({ state: makeState() }); // idle
    render(<Machine />);
    expect(screen.queryByRole("button", { name: /keep this piece/i })).toBeNull();
  });
});

// While crowbar is armed at a non-empty board (pendingCrowbar set), the window
// clears in anticipation of the pried piece — no reel, no click-to-draw. An
// empty-board crowbar play never arms (Card resolves the no-effect directly),
// so the reel keeps cycling in that case; the idle test above covers it.
// Arming is NOT cancellable, so drawing must also be withheld: PLAY_CROWBAR
// needs the idle phase, and a mid-arm draw would wedge the lift prompt.
describe("Machine window while crowbar is armed", () => {
  it("clears the window and stops offering the draw control", () => {
    useGame.setState({ state: makeState(), pendingCrowbar: 7 });

    const { container } = render(<Machine />);
    const win = container.querySelector(".machine-window")!;
    expect(win.classList.contains("awaiting")).toBe(true);
    expect(win.querySelector("svg")).toBeNull(); // no reel sprite
    expect(screen.queryByRole("button", { name: /draw the displayed piece/i })).toBeNull();
  });

  it("disables the Draw button until the lift resolves", () => {
    useGame.setState({ state: makeState(), pendingCrowbar: 7 });

    render(<Machine />);
    expect(screen.getByRole("button", { name: "Draw" })).toHaveProperty("disabled", true);
  });

  it("resumes the cycling reel once the crowbar is resolved or cancelled", () => {
    useGame.setState({ state: makeState(), pendingCrowbar: null });

    const { container } = render(<Machine />);
    expect(container.querySelector(".machine-window.awaiting")).toBeNull();
    expect(screen.getByRole("button", { name: /draw the displayed piece/i })).toBeTruthy();
  });
});
