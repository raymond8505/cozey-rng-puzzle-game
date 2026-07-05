// @vitest-environment jsdom
//
// Wiring guard for the parking tray on the machine: parked tiles render
// littered (one scatter-posed wrapper per queued piece) with the count in the
// corner, and the tray advertises data-drop="queue" under exactly the same
// conditions the old standalone strip did — including the armed-crowbar
// advertisement, which canPark alone does not cover (a CLAUDE.md invariant
// that previously lived only in code).

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { reduce } from "@/game/reducer";
import type { GameState } from "@/game/types";
import { currentDisplayedPiece } from "@/game/selectors";
import { makeState, turnDrawPark } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { _resetForTests } from "./scatter";
import { ParkingArea } from "./ParkingArea";

/** Park `n` tiles from a fresh game (default capacity 3 on the 7x5 board). */
function parkN(n: number): GameState {
  let s = makeState();
  for (let i = 0; i < n; i++) s = turnDrawPark(s, currentDisplayedPiece(s)!);
  return s;
}

afterEach(cleanup);
// Both the store and the scatter map are module singletons; piece ids repeat
// across tests, so stale poses must not leak between them.
beforeEach(() => {
  useGame.setState({ log: [], pendingCrowbar: null });
  _resetForTests();
});

describe("ParkingArea rendering", () => {
  it("renders an empty tray with a 0/3 count and no tiles", () => {
    useGame.setState({ state: makeState() });

    const { container } = render(<ParkingArea />);
    expect(container.querySelector(".parking-count")!.textContent).toBe("0/3");
    expect(container.querySelectorAll(".parking-piece")).toHaveLength(0);
  });

  it("litters one posed tile per parked piece and counts them", () => {
    useGame.setState({ state: parkN(2) });

    const { container } = render(<ParkingArea />);
    expect(container.querySelectorAll(".parking-piece")).toHaveLength(2);
    expect(container.querySelector(".parking-count")!.textContent).toBe("2/3");
  });

  it("makes parked tiles draggable while place-from-queue is legal", () => {
    // idle with a non-empty queue and open cells -> Action B is available
    useGame.setState({ state: parkN(1) });

    const { container } = render(<ParkingArea />);
    expect(container.querySelector(".parking-piece-drag")).not.toBeNull();
  });
});

describe("ParkingArea drop target", () => {
  it("advertises data-drop=\"queue\" while routing a held tile", () => {
    useGame.setState({ state: reduce(makeState(), { type: "DRAW" }) });

    const { container } = render(<ParkingArea />);
    const tray = container.querySelector(".parking-tray")!;
    expect(tray.getAttribute("data-drop")).toBe("queue");
    expect(tray.classList.contains("droppable")).toBe(true);
  });

  it("does not advertise while idle", () => {
    useGame.setState({ state: makeState() });

    const { container } = render(<ParkingArea />);
    expect(container.querySelector(".parking-tray")!.getAttribute("data-drop")).toBeNull();
  });

  it("advertises during an armed pry while there is room", () => {
    // canPark is false (idle phase) — the tray must still open for the
    // crowbar's pried tile, which parks in the same drag gesture.
    useGame.setState({ state: makeState(), pendingCrowbar: 7 });

    const { container } = render(<ParkingArea />);
    expect(container.querySelector(".parking-tray")!.getAttribute("data-drop")).toBe("queue");
  });

  it("stays closed during an armed pry once the queue is full", () => {
    useGame.setState({ state: parkN(3), pendingCrowbar: 7 });

    const { container } = render(<ParkingArea />);
    expect(container.querySelector(".parking-tray")!.getAttribute("data-drop")).toBeNull();
  });
});
