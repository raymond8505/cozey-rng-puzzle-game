// @vitest-environment jsdom
//
// Wiring guard for the dev-only remove control on a hand card: it must
// actually drop the card from the store's hand (and not be swallowed by the
// card's drag wrapper). import.meta.env.DEV is true under vitest, so the
// button renders here just as it does in the dev server.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { Hand } from "./Hand";

afterEach(cleanup);

describe("dev card remove button", () => {
  it("removes exactly the clicked card from the hand", () => {
    const s = makeState();
    useGame.setState({
      state: {
        ...s,
        hand: [
          { instanceId: 41, type: "crowbar" },
          { instanceId: 42, type: "secondLook" },
        ],
      },
    });

    render(<Hand />);
    fireEvent.click(screen.getByRole("button", { name: /remove crowbar from hand/i }));

    expect(useGame.getState().state.hand).toEqual([{ instanceId: 42, type: "secondLook" }]);
  });
});

// Arming crowbar is not cancellable, so while a lift target is awaited no
// other card may be played — a second play would consume the turn the pending
// lift needs (PLAY_CROWBAR rejects once cardPlayedThisTurn is set).
describe("hand while crowbar is armed", () => {
  it("renders every card unplayable until the lift resolves", () => {
    const s = makeState();
    useGame.setState({
      state: { ...s, hand: [{ instanceId: 41, type: "edgePunch" }] },
      pendingCrowbar: 7,
    });

    const { container } = render(<Hand />);
    expect(container.querySelector(".card-wrap.disabled")).not.toBeNull();

    useGame.setState({ pendingCrowbar: null });
  });
});
