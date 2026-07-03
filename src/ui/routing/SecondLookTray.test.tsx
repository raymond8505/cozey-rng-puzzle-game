// @vitest-environment jsdom
//
// Regression guard for the Second Look UI WIRING (not just the reducer): the
// chooser must be mounted in the `secondLook` phase and actually dispatch
// SECOND_LOOK_KEEP, so the player can reach `routing`. This is the gap that
// let Second Look dead-end — the reducer was correct, but no component fired
// the keep action.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { reduce } from "@/game/reducer";
import type { GameState } from "@/game/types";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { SecondLookTray } from "./SecondLookTray";

/** Drive the store into a second-look state with `draws` captures taken. */
function enterSecondLook(draws: 1 | 2): GameState {
  let s: GameState = { ...makeState(), hand: [{ instanceId: 1, type: "secondLook" }] };
  s = reduce(s, { type: "PLAY_CARD", instanceId: 1 });
  s = reduce(s, { type: "DRAW" });
  if (draws === 2) s = reduce(s, { type: "DRAW" });
  return s;
}

afterEach(cleanup);

describe("SecondLookTray wiring", () => {
  it("keeps the first piece after one draw and reaches routing", () => {
    const s = enterSecondLook(1);
    const first = s.secondLook.firstCapture!;
    useGame.setState({ state: s });

    render(<SecondLookTray />);
    fireEvent.click(screen.getByRole("button", { name: /keep/i }));

    const after = useGame.getState().state;
    expect(after.phase).toBe("routing");
    expect(after.held?.piece).toBe(first);
  });

  it("lets the player keep EITHER piece after two draws", () => {
    const s = enterSecondLook(2);
    const second = s.secondLook.secondCapture!;
    useGame.setState({ state: s });

    render(<SecondLookTray />);
    const keeps = screen.getAllByRole("button", { name: /keep this/i });
    expect(keeps).toHaveLength(2);
    fireEvent.click(keeps[1]); // keep the second

    const after = useGame.getState().state;
    expect(after.phase).toBe("routing");
    expect(after.held?.piece).toBe(second);
  });

  it("renders nothing outside the second-look phase", () => {
    useGame.setState({ state: makeState() }); // idle
    const { container } = render(<SecondLookTray />);
    expect(container.firstChild).toBeNull();
  });
});
