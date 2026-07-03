// @vitest-environment jsdom
//
// Wiring guard for the slot: a seated card renders as a blank half-inserted
// card back (its name is announced in the status window, not printed on the
// card), and the post-it note invites a drop whether or not a card is seated.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { makeState } from "@/fixtures/game.fixture";
import { useGame } from "../store";
import { CardSlot } from "./CardSlot";

afterEach(cleanup);

describe("CardSlot", () => {
  it("seats a blank card back — no text in the throat", () => {
    useGame.setState({ state: makeState(), seatedCard: "neighborPunch" });
    const { container } = render(<CardSlot />);

    const throat = container.querySelector(".card-slot-throat")!;
    expect(throat.querySelector(".seated-card")).not.toBeNull();
    expect(throat.textContent).toBe(""); // blank card back, bare aperture
  });

  it("shows the post-it hint while nothing is seated", () => {
    useGame.setState({ state: makeState(), seatedCard: null });
    const { container } = render(<CardSlot />);

    expect(container.querySelector(".seated-card")).toBeNull();
    const hint = container.querySelector(".card-slot-hint");
    expect(hint?.textContent).toMatch(/place\s*card\s*here/i);
  });

  it("carries the drop token on the forgiving hitbox", () => {
    useGame.setState({ state: makeState(), seatedCard: null });
    const { container } = render(<CardSlot />);

    const hitbox = container.querySelector(".card-slot-hitbox");
    expect(hitbox?.getAttribute("data-drop")).toBe("slot");
  });

  it("keeps the post-it note up while a card is seated — it's taped on", () => {
    useGame.setState({ state: makeState(), seatedCard: "neighborPunch" });
    const { container } = render(<CardSlot />);

    expect(
      container.querySelector(".card-slot-note .card-slot-hint")?.textContent,
    ).toMatch(/place\s*card\s*here/i);
  });
});
