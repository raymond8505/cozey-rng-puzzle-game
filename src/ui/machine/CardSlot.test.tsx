// @vitest-environment jsdom
//
// Wiring guard for the slot's name readout: a seated card's name must appear
// on the .card-slot-name plate BESIDE the pocket, not on the seated card
// itself (the card in the pocket is a blank card back).

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { CardSlot } from "./CardSlot";

afterEach(cleanup);

describe("CardSlot name readout", () => {
  it("shows the seated card's name on the plate, not inside the pocket", () => {
    useGame.setState({ state: makeState(), seatedCard: "neighborPunch" });
    const { container } = render(<CardSlot />);

    const plate = screen.getByRole("status", { name: "Played card" });
    expect(plate.textContent).toBe("Neighbor Punch");

    const pocket = container.querySelector(".card-slot-pocket")!;
    expect(pocket.textContent).toBe(""); // blank card back — no name on the card
  });

  it("shows an empty plate and the drop hint while nothing is seated", () => {
    useGame.setState({ state: makeState(), seatedCard: null });
    render(<CardSlot />);

    expect(screen.getByRole("status", { name: "Played card" }).textContent).toBe("");
    expect(screen.getByText(/place card here/i)).toBeTruthy();
  });
});
