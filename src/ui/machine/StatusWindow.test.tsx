// @vitest-environment jsdom
//
// Wiring guard for the status console: log entries render in order inside the
// role="log" region, each carrying its tone class so effect/no-effect lines
// keep their color distinction. Stick-to-bottom scrolling is not asserted —
// jsdom has no layout (scrollHeight is always 0) — it's verified manually.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { LogEntry } from "../statusLog";
import { useGame } from "../store";
import { StatusWindow } from "./StatusWindow";

afterEach(cleanup);

const LOG: LogEntry[] = [
  { id: 0, tone: "info", text: "Played Governor." },
  { id: 1, tone: "effect", text: "Governor engaged — comfortable speed this draw." },
  { id: 2, tone: "noEffect", text: "There was nothing on the board to pry loose." },
];

describe("StatusWindow", () => {
  it("renders every log line in order inside the log region", () => {
    useGame.setState({ log: LOG });
    render(<StatusWindow />);

    const region = screen.getByRole("log", { name: "Machine status" });
    const lines = [...region.querySelectorAll(".status-line")];
    expect(lines.map((l) => l.textContent)).toEqual(LOG.map((e) => e.text));
  });

  it("tags each line with its tone class", () => {
    useGame.setState({ log: LOG });
    render(<StatusWindow />);

    for (const entry of LOG) {
      expect(screen.getByText(entry.text).classList.contains(`status-${entry.tone}`)).toBe(
        true,
      );
    }
  });

  it("renders an empty region when the log is fresh", () => {
    useGame.setState({ log: [] });
    render(<StatusWindow />);
    expect(screen.getByRole("log", { name: "Machine status" }).textContent).toBe("");
  });
});
