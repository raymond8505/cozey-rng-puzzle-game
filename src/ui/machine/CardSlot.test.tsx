// @vitest-environment jsdom
//
// Wiring guard for the slot pocket: a seated card renders as a blank card
// back (its name is announced in the status window, not printed on the card),
// and the empty pocket invites a drop.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { CardSlot } from "./CardSlot";

afterEach(cleanup);

describe("CardSlot pocket", () => {
  it("seats a blank card back — no name inside the pocket", () => {
    useGame.setState({ state: makeState(), seatedCard: "neighborPunch" });
    const { container } = render(<CardSlot />);

    const pocket = container.querySelector(".card-slot-pocket")!;
    expect(pocket.querySelector(".seated-card")).not.toBeNull();
    expect(pocket.textContent).toBe(""); // blank card back
  });

  it("shows the drop hint while nothing is seated", () => {
    useGame.setState({ state: makeState(), seatedCard: null });
    const { container } = render(<CardSlot />);

    expect(container.querySelector(".seated-card")).toBeNull();
    // The hint breaks one word per line (<br/>), so its textContent has no
    // spaces between words — match with \s* instead of literal spaces.
    const hint = container.querySelector(".card-slot-hint");
    expect(hint?.textContent).toMatch(/place\s*card\s*here/i);
  });
});
