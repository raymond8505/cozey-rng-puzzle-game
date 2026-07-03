// @vitest-environment jsdom
//
// Wiring guard for the held bay: the chosen (drawn) piece must render inside
// the Machine's bay beside the display window — RoutingTray is gone, so this
// is the only place the held piece appears. Also guards the routing hint,
// including the forced full-queue variant.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { reduce } from "@/game/reducer";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { Machine } from "./Machine";

afterEach(cleanup);

const BAY_LABEL = /chosen piece/i;

describe("Machine held bay", () => {
  it("renders the held piece in the bay with the routing hint", () => {
    const s = reduce(makeState(), { type: "DRAW" });
    expect(s.held).not.toBeNull();
    useGame.setState({ state: s });

    render(<Machine />);
    const bay = screen.getByLabelText(BAY_LABEL);
    expect(bay.querySelector(".held-token svg")).not.toBeNull();
    expect(screen.getByText(/drag onto the board/i)).toBeTruthy();
  });

  it("shows the forced hint when the queue was full at draw time", () => {
    const s = reduce(makeState(), { type: "DRAW" });
    useGame.setState({ state: { ...s, held: { ...s.held!, fullQueueForce: true } } });

    render(<Machine />);
    expect(screen.getByText(/queue is full/i)).toBeTruthy();
  });

  it("renders an empty bay and no hint while nothing is held", () => {
    useGame.setState({ state: makeState() });

    render(<Machine />);
    const bay = screen.getByLabelText(BAY_LABEL);
    expect(bay.querySelector(".held-token")).toBeNull();
    expect(screen.queryByText(/drag onto the board/i)).toBeNull();
  });
});
