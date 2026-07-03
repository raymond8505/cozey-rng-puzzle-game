// @vitest-environment jsdom
//
// Wiring guard for the chosen-piece window: once a piece is drawn (or
// crowbar-lifted) it must render draggable INSIDE the display window, with the
// window in its `chosen` state — there is no separate tray or bay. Also guards
// the routing hint, including the forced full-queue variant.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { reduce } from "@/game/reducer";
import { currentDisplayedPiece } from "@/game/selectors";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { Machine } from "./Machine";

afterEach(cleanup);

describe("Machine chosen-piece window", () => {
  it("renders the held piece draggable inside the window, in the chosen state", () => {
    const s = reduce(makeState(), { type: "DRAW" });
    expect(s.held).not.toBeNull();
    useGame.setState({ state: s });

    const { container } = render(<Machine />);
    const win = container.querySelector(".machine-window")!;
    expect(win.classList.contains("chosen")).toBe(true);
    expect(win.querySelector(".held-token svg")).not.toBeNull();
    expect(screen.getByText(/drag onto the board/i)).toBeTruthy();
  });

  it("shows the forced hint when the queue was full at draw time", () => {
    const s = reduce(makeState(), { type: "DRAW" });
    useGame.setState({ state: { ...s, held: { ...s.held!, fullQueueForce: true } } });

    render(<Machine />);
    expect(screen.getByText(/queue is full/i)).toBeTruthy();
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
