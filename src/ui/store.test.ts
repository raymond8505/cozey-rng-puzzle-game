import { describe, it, expect, vi } from "vitest";
import { useGame, NO_EFFECT_EJECT_MS } from "./store";
import { asCellIndex } from "@/game/types";
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

// The armed pry's cell-drop branch (GameScreen.onPry): lift then place as two
// dispatches in one gesture — the tile relocates without a window round-trip.
describe("crowbar relocate", () => {
  it("lifts and places in one gesture, ending the turn", () => {
    useGame.getState().restart("relocate-test");
    useGame.getState().dispatch({ type: "DRAW" });
    const piece = useGame.getState().state.held!.piece;
    useGame.getState().dispatch({ type: "PLACE", cell: asCellIndex(0) });

    useGame.getState().devAddCard("crowbar");
    const id = useGame.getState().state.hand.at(-1)!.instanceId;
    useGame.getState().armCrowbar(id);
    useGame.getState().playCrowbar(id, asCellIndex(0));
    useGame.getState().dispatch({ type: "PLACE", cell: asCellIndex(5) });

    const after = useGame.getState().state;
    expect(after.board[0]).toBeNull();
    expect(after.board[5]).toBe(piece);
    expect(after.held).toBeNull();
    expect(after.phase).toBe("idle");
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
      "Drag a tile off the board — into the window, the tray, or an empty spot — to pry it loose.",
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
      "Drag a tile off the board — into the window, the tray, or an empty spot — to pry it loose.",
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

// Reveal rides the standard play pipeline: an effective play flips
// state.revealActive and seats the card; playing while the picture is already
// up (every fresh game starts revealed) is a dud with its own reason copy.
describe("reveal card", () => {
  it("re-shows the picture after a dismissal, seating and logging the play", () => {
    useGame.getState().restart("reveal-test");
    useGame.getState().dispatch({ type: "DISMISS_REVEAL" });
    useGame.getState().devAddCard("reveal");
    const id = useGame.getState().state.hand.at(-1)!.instanceId;
    useGame.getState().playCard(id);

    expect(useGame.getState().state.revealActive).toBe(true);
    expect(useGame.getState().seatedCard).toBe("reveal");
    expect(useGame.getState().log.map(({ tone, text }) => ({ tone, text }))).toEqual([
      { tone: "info", text: "Draw a tile." },
      { tone: "info", text: "Card Inserted: Reveal." },
      { tone: "effect", text: EFFECT_TOAST.revealBoard },
    ]);
  });

  it("stays seated past the draw and ejects on the grab that fades the picture", () => {
    useGame.getState().restart("reveal-seat-test");
    useGame.getState().dispatch({ type: "DISMISS_REVEAL" });
    useGame.getState().devAddCard("reveal");
    const id = useGame.getState().state.hand.at(-1)!.instanceId;
    useGame.getState().playCard(id);

    // choosing a tile does NOT complete a Reveal — the picture is still up
    useGame.getState().dispatch({ type: "DRAW" });
    expect(useGame.getState().state.held).not.toBeNull();
    expect(useGame.getState().seatedCard).toBe("reveal");

    // the grab (drag start) fades the picture and ejects the card together
    useGame.getState().dispatch({ type: "DISMISS_REVEAL" });
    expect(useGame.getState().state.revealActive).toBe(false);
    expect(useGame.getState().seatedCard).toBeNull();
  });

  it("is a dud on a fresh (still-revealed) game: reason copy, then eject", () => {
    vi.useFakeTimers();
    try {
      useGame.getState().restart("reveal-dud-test");
      useGame.getState().devAddCard("reveal");
      const id = useGame.getState().state.hand.at(-1)!.instanceId;
      useGame.getState().playCard(id);

      expect(useGame.getState().log.at(-1)).toMatchObject({
        tone: "noEffect",
        text: GAME_CONFIG.copy.noEffect.reveal,
      });
      expect(useGame.getState().seatedCard).toBe("reveal");
      vi.advanceTimersByTime(NO_EFFECT_EJECT_MS);
      expect(useGame.getState().seatedCard).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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
