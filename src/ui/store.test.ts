import { describe, it, expect, vi } from "vitest";
import { useGame, NO_EFFECT_EJECT_MS } from "./store";
import { PUZZLES } from "./puzzles";
import { edgeSignature } from "@/fixtures/game.fixture";
import { GAME_CONFIG } from "@/config/game.config";
import { EFFECT_TOAST } from "./cards/cardMeta";
import { LOG_CAP } from "./statusLog";

// Guards the per-puzzle-grid + alternate-on-Play-Again wiring: each puzzle's
// board must actually drive the game it starts, and Play Again must advance to
// the next puzzle (and its grid). The store is a module singleton, so the first
// test observes the boot state before any playAgain runs.

describe("store puzzles", () => {
  it("boots on the first puzzle with its own grid", () => {
    const s = useGame.getState();
    expect(s.puzzleIndex).toBe(0);
    expect(s.puzzleSrc).toBe(PUZZLES[0].src);
    expect(s.state.config.board).toEqual(PUZZLES[0].board);
    expect(s.state.pool).toHaveLength(PUZZLES[0].board.cols * PUZZLES[0].board.rows);
  });

  it("playAgain alternates to the next puzzle and applies its grid", () => {
    const before = useGame.getState().puzzleIndex;
    useGame.getState().playAgain();
    const s = useGame.getState();
    const expected = (before + 1) % PUZZLES.length;

    expect(s.puzzleIndex).toBe(expected);
    expect(s.puzzleSrc).toBe(PUZZLES[expected].src);
    expect(s.state.config.board).toEqual(PUZZLES[expected].board);
    // a genuinely fresh game on the new grid
    const cells = PUZZLES[expected].board.cols * PUZZLES[expected].board.rows;
    expect(s.state.pool).toHaveLength(cells);
    expect(s.state.board).toHaveLength(cells);
    expect(s.state.board.every((c) => c === null)).toBe(true);
  });

  it("cycles back through the whole list", () => {
    const start = useGame.getState().puzzleIndex;
    for (let i = 0; i < PUZZLES.length; i++) useGame.getState().playAgain();
    expect(useGame.getState().puzzleIndex).toBe(start);
  });

  it("restart keeps the same puzzle", () => {
    const before = useGame.getState().puzzleIndex;
    useGame.getState().restart("seed-x");
    expect(useGame.getState().puzzleIndex).toBe(before);
    expect(useGame.getState().state.config.board).toEqual(PUZZLES[before].board);
  });
});

// Every fresh game mints its own seed, so the same home cell gets different
// edge shapes run to run; restart() still reproduces the CURRENT run because
// newGame carries the run's seed into config.rng (previously it always fell
// back to the global default seed, so restart never actually reproduced).
describe("per-game seeding", () => {
  it("selectPuzzle starts each run with fresh piece shapes", () => {
    useGame.getState().selectPuzzle(1);
    const first = edgeSignature(useGame.getState().state);
    useGame.getState().selectPuzzle(1);
    expect(edgeSignature(useGame.getState().state)).not.toBe(first);
  });

  it("playAgain mints a fresh seed for each visit to the same puzzle", () => {
    useGame.getState().playAgain();
    const firstVisitSeed = useGame.getState().state.config.rng.seed;
    for (let i = 0; i < PUZZLES.length; i++) useGame.getState().playAgain();
    expect(useGame.getState().state.config.rng.seed).not.toBe(firstVisitSeed);
  });

  it("restart without a seed reproduces the current run", () => {
    useGame.getState().selectPuzzle(0);
    const before = useGame.getState().state;
    useGame.getState().restart();
    const after = useGame.getState().state;
    expect(edgeSignature(after)).toBe(edgeSignature(before));
    expect(after.pool).toEqual(before.pool);
    expect(after.hand).toEqual(before.hand);
  });
});

// An effective card stays seated until a tile is chosen — no timer. Only a
// dud (no-effect) card is on a timer: the Machine spits it back out after
// NO_EFFECT_EJECT_MS. All feedback about the play lives in the status log.
describe("seated card lifecycle", () => {
  /** Fresh game with a single governor in hand, played into the slot. */
  function playGovernor() {
    useGame.getState().restart("seat-test");
    const s = useGame.getState().state;
    useGame.setState({ state: { ...s, hand: [{ instanceId: 99, type: "governor" }] } });
    useGame.getState().playCard(99);
  }

  it("seats the card and logs the play, outcome, and governed speed in order", () => {
    playGovernor();
    expect(useGame.getState().seatedCard).toBe("governor");
    expect(useGame.getState().log.map(({ tone, text }) => ({ tone, text }))).toEqual([
      { tone: "info", text: "Draw a tile." },
      { tone: "info", text: "Card Inserted: Governor." },
      { tone: "effect", text: EFFECT_TOAST.governorSpeed },
      {
        tone: "info",
        text: `Governor: running at ${GAME_CONFIG.machine.comfortableMs}ms this draw.`,
      },
    ]);
  });

  it("clears the seat when a tile is chosen (DRAW), logging the routing hint", () => {
    playGovernor();
    useGame.getState().dispatch({ type: "DRAW" });
    expect(useGame.getState().state.held).not.toBeNull();
    expect(useGame.getState().seatedCard).toBeNull();
    expect(useGame.getState().log.at(-1)?.text).toBe(
      "Drag onto the board, or into the queue to park.",
    );
  });

  it("an effective card is not on a timer — it outlasts the eject window", () => {
    vi.useFakeTimers();
    try {
      playGovernor();
      vi.advanceTimersByTime(NO_EFFECT_EJECT_MS * 2);
      expect(useGame.getState().seatedCard).toBe("governor");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a dud (no-effect) card seats, then ejects after a beat", () => {
    vi.useFakeTimers();
    try {
      // empty board: crowbar resolves as no-effect
      useGame.getState().restart("eject-test");
      useGame.getState().devAddCard("crowbar");
      const id = useGame.getState().state.hand.at(-1)!.instanceId;
      useGame.getState().playCrowbar(id);

      expect(useGame.getState().seatedCard).toBe("crowbar");
      vi.advanceTimersByTime(NO_EFFECT_EJECT_MS);
      expect(useGame.getState().seatedCard).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

// The status log is the single feedback surface: card plays, outcomes, and
// hints all append here, capped, and reset with the game they narrate.
describe("status log", () => {
  it("arming the crowbar seats it and announces the play and the drag prompt", () => {
    useGame.getState().restart("log-test");
    useGame.getState().armCrowbar(1);
    // in the slot from the moment it's played, through the whole armed lift
    expect(useGame.getState().seatedCard).toBe("crowbar");
    expect(useGame.getState().log.map((l) => l.text)).toEqual([
      "Draw a tile.",
      "Card Inserted: Crowbar.",
      "Drag a tile off the board — into the window or the queue — to pry it loose.",
    ]);
  });

  it("an unarmed crowbar play (empty board) announces itself with the no-effect reason", () => {
    useGame.getState().restart("log-test");
    useGame.getState().devAddCard("crowbar");
    const id = useGame.getState().state.hand[0].instanceId;
    useGame.getState().playCrowbar(id);
    expect(useGame.getState().log.map(({ tone, text }) => ({ tone, text }))).toEqual([
      { tone: "info", text: "Draw a tile." },
      { tone: "info", text: "Card Inserted: Crowbar." },
      { tone: "noEffect", text: GAME_CONFIG.copy.noEffect.crowbar },
    ]);
  });

  it("caps the history at LOG_CAP, keeping the newest lines", () => {
    useGame.getState().restart("log-test");
    // armCrowbar appends unconditionally, so it's a cheap line generator.
    for (let i = 0; i < LOG_CAP; i++) useGame.getState().armCrowbar(i);
    const log = useGame.getState().log;
    expect(log).toHaveLength(LOG_CAP);
    expect(log.at(-1)?.text).toBe(
      "Drag a tile off the board — into the window or the queue — to pry it loose.",
    );
    // ids stay unique after trimming (they never reset)
    expect(new Set(log.map((l) => l.id)).size).toBe(LOG_CAP);
  });

  it("resets to the draw prompt on restart — old lines narrate run-local state", () => {
    useGame.getState().restart("log-test");
    useGame.getState().dispatch({ type: "DRAW" });
    expect(useGame.getState().log.length).toBeGreaterThan(1);
    useGame.getState().restart("log-test");
    expect(useGame.getState().log.map(({ tone, text }) => ({ tone, text }))).toEqual([
      { tone: "info", text: "Draw a tile." },
    ]);
  });

  it("prompts the next draw when a routed turn completes", () => {
    useGame.getState().restart("log-test");
    useGame.getState().dispatch({ type: "DRAW" });
    useGame.getState().dispatch({ type: "PARK" });
    expect(useGame.getState().log.at(-1)?.text).toBe("Draw a tile.");
  });

  it("offers the card slot in the prompt while the hand holds a card", () => {
    useGame.getState().restart("log-test");
    useGame.getState().devAddCard("edgePunch");
    useGame.getState().dispatch({ type: "DRAW" });
    useGame.getState().dispatch({ type: "PARK" });
    expect(useGame.getState().log.at(-1)?.text).toBe("Draw a tile, or insert a card.");
  });
});

// Dev harness: conjure any card into the hand / discard one straight out.
// instanceIds must stay unique across all circulating cards (React keys,
// PLAY_CARD lookups) even after several adds.
describe("dev card tools", () => {
  it("devAddCard appends the chosen card with a unique instanceId", () => {
    useGame.getState().restart("dev-card-seed");
    useGame.getState().devAddCard("governor");
    useGame.getState().devAddCard("governor");

    const s = useGame.getState().state;
    expect(s.hand.map((c) => c.type)).toEqual(["governor", "governor"]);
    const ids = [...s.hand, ...s.deck, ...s.discard].map((c) => c.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("devRemoveCard drops exactly that card from the hand", () => {
    useGame.getState().restart("dev-card-seed");
    useGame.getState().devAddCard("crowbar");
    useGame.getState().devAddCard("secondLook");
    const [target, keep] = useGame.getState().state.hand;

    useGame.getState().devRemoveCard(target.instanceId);

    expect(useGame.getState().state.hand).toEqual([keep]);
  });
});
